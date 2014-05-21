/**
 * @fileoverview Session
 */

/**
 * @augments ExSIP
 * @class Invite Session
 */
(function(ExSIP) {

// Load dependencies
  var RequestSender   = @@include('../src/RTCSession/RequestSender.js')
  var RTCMediaHandler = @@include('../src/RTCSession/RTCMediaHandler.js')
  var DTMF            = @@include('../src/RTCSession/DTMF.js')

  var RTCSession,
    logger = new ExSIP.Logger(ExSIP.name +' | '+ 'RTC SESSION'),
    C = {
      // RTCSession states
      STATUS_NULL:               0,
      STATUS_INVITE_SENT:        1,
      STATUS_1XX_RECEIVED:       2,
      STATUS_INVITE_RECEIVED:    3,
      STATUS_WAITING_FOR_ANSWER: 4,
      STATUS_ANSWERED:           5,
      STATUS_WAITING_FOR_ACK:    6,
      STATUS_CANCELED:           7,
      STATUS_TERMINATED:         8,
      STATUS_CONFIRMED:          9,
      STATUS_REFER_SENT:         10,
      STATUS_BYE_SENT:           11
    };


  RTCSession = function(ua) {
    var events = [
      'progress',
      'failed',
      'started',
      'ended',
      'held',
      'resumed',
      'newDTMF'
    ];

    this.ua = ua;
    this.status = C.STATUS_NULL;
    this.dialog = null;
    this.earlyDialogs = {};
    this.rtcMediaHandler = null;
    this.isOnHold = false;
    this.initialRemoteSdp = null;

    // Session Timers
    this.timers = {
      ackTimer: null,
      expiresTimer: null,
      invite2xxTimer: null,
      userNoAnswerTimer: null
    };

    // Session info
    this.direction = null;
    this.local_identity = null;
    this.remote_identity = null;
    this.start_time = null;
    this.end_time = null;

    // Custom session empty object for high level use
    this.data = {};
    this.dtmf = new DTMF(this);

    this.initEvents(events);
  };
  RTCSession.prototype = new ExSIP.EventEmitter();

  RTCSession.prototype.isDebug = function() {
    return this.ua.isDebug();
  };

  /**
   * User API
   */

  RTCSession.prototype.initRtcMediaHandler = function(options) {
    options = options || {};
    this.rtcMediaHandler = new RTCMediaHandler(this, options.RTCConstraints || {"optional": [{'DtlsSrtpKeyAgreement': 'true'}]});
    if(options["copy"]) {
      this.rtcMediaHandler.copy(options["copy"]);
    }
  };

  /**
   * Terminate the call.
   * @param {Object} [options]
   */
  RTCSession.prototype.terminate = function(options) {
    options = options || {};

    var cancel_reason,
      status_code = options.status_code,
      reason_phrase = options.reason_phrase,
      extraHeaders = options.extraHeaders || [],
      body = options.body;

    // Check Session Status
    if (this.status === C.STATUS_TERMINATED) {
      throw new ExSIP.Exceptions.InvalidStateError(this.status);
    }

    logger.log('terminate with status : ' + this.status, this.ua);

    switch(this.status) {
      // - UAC -
      case C.STATUS_NULL:
      case C.STATUS_INVITE_SENT:
      case C.STATUS_1XX_RECEIVED:
        logger.log('canceling RTCSession', this.ua);

        if (status_code && (status_code < 200 || status_code >= 700)) {
          throw new TypeError('Invalid status_code: '+ status_code);
        } else if (status_code) {
          reason_phrase = reason_phrase || ExSIP.C.REASON_PHRASE[status_code] || '';
          cancel_reason = 'SIP ;cause=' + status_code + ' ;text="' + reason_phrase + '"';
        }

        // Check Session Status
        if (this.status === C.STATUS_NULL) {
          this.isCanceled = true;
          this.cancelReason = cancel_reason;
        } else if (this.status === C.STATUS_INVITE_SENT) {
          if(this.received_100) {
            if(typeof(this.request.cancel) === 'undefined') {
              this.sendBye(options);
              this.ended('local', null, ExSIP.C.causes.BYE);
            } else {
              this.isCanceled = true;
              logger.log('terminate on 100 - setting isCanceled = true', this.ua);
              this.request.cancel(cancel_reason);
            }
          } else {
            this.isCanceled = true;
            this.cancelReason = cancel_reason;
          }
        } else if(this.status === C.STATUS_1XX_RECEIVED) {
          this.isCanceled = true;
          logger.log('terminate on 1xx - setting isCanceled = true', this.ua);
          this.request.cancel(cancel_reason);
        }

        this.failed('local', null, ExSIP.C.causes.CANCELED);
        break;

      // - UAS -
      case C.STATUS_WAITING_FOR_ANSWER:
        logger.log('canceling RTCSession', this.ua);

        this.request.cancel();
        this.failed('local', null, ExSIP.C.causes.CANCELED);
        break;
      case C.STATUS_ANSWERED:
        logger.log('rejecting RTCSession', this.ua);

        status_code = status_code || 480;

        if (status_code < 300 || status_code >= 700) {
          throw new TypeError('Invalid status_code: '+ status_code);
        }

        this.request.reply(status_code, reason_phrase, extraHeaders, body);
        this.failed('local', null, ExSIP.C.causes.REJECTED);
        break;
      case C.STATUS_WAITING_FOR_ACK:
      case C.STATUS_REFER_SENT:
      case C.STATUS_CONFIRMED:
        logger.log('terminating RTCSession', this.ua);

        // Send Bye
        this.sendBye(options);
        return;
    }

    this.close();
  };

  /**
   * Answer the call.
   * @param {Object} [options]
   */
  RTCSession.prototype.answer = function(options) {
    options = options || {};

    var
      self = this,
      request = this.request,
      extraHeaders = options.extraHeaders || [],
      mediaConstraints = options.mediaConstraints || {'audio':true, 'video':true};

    var answerCreationSucceeded = function(body) {
      var replySucceeded = function() {
          var timeout = ExSIP.Timers.T1;

          self.status = C.STATUS_WAITING_FOR_ACK;

          /**
           * RFC3261 13.3.1.4
           * Response retransmissions cannot be accomplished by transaction layer
           *  since it is destroyed when receiving the first 2xx answer
           */
          self.timers.invite2xxTimer = window.setTimeout(function invite2xxRetransmission() {
              if (self.status !== C.STATUS_WAITING_FOR_ACK) {
                return;
              }

              request.reply(200, null, ['Contact: '+ self.contact], body);

              if (timeout < ExSIP.Timers.T2) {
                timeout = timeout * 2;
                if (timeout > ExSIP.Timers.T2) {
                  timeout = ExSIP.Timers.T2;
                }
              }
              self.timers.invite2xxTimer = window.setTimeout(
                invite2xxRetransmission, timeout
              );
            },
            timeout
          );

          /**
           * RFC3261 14.2
           * If a UAS generates a 2xx response and never receives an ACK,
           *  it SHOULD generate a BYE to terminate the dialog.
           */
          self.timers.ackTimer = window.setTimeout(function() {
              if(self.status === C.STATUS_WAITING_FOR_ACK) {
                logger.log('no ACK received, terminating the call', self.ua);
                window.clearTimeout(self.timers.invite2xxTimer);
                self.sendBye();
                self.ended('remote', null, ExSIP.C.causes.NO_ACK);
              }
            },
            ExSIP.Timers.TIMER_H
          );

          self.started('local');
        },

      // run for reply failure callback
        replyFailed = function() {
          self.failed('system', null, ExSIP.C.causes.CONNECTION_ERROR);
        };

      extraHeaders.push('Contact: ' + self.contact);

      logger.log('answer : sending reply', self.ua);
      request.reply(200, null, extraHeaders,
        body,
        replySucceeded,
        replyFailed
      );
    };

    var answerCreationFailed = function() {
      if (self.status === C.STATUS_TERMINATED) {
        return;
      }

      self.failed('local', null, ExSIP.C.causes.WEBRTC_ERROR);
    };


    // Check Session Direction and Status
    if (this.direction !== 'incoming') {
      throw new TypeError('Invalid method "answer" for an outgoing call');
    } else if (this.status !== C.STATUS_WAITING_FOR_ANSWER) {
      throw new ExSIP.Exceptions.InvalidStateError(this.status);
    }

    this.status = C.STATUS_ANSWERED;

    // An error on dialog creation will fire 'failed' event
    if(!this.createDialog(request, 'UAS')) {
      request.reply(500, 'Missing Contact header field');
      return;
    }

    window.clearTimeout(this.timers.userNoAnswerTimer);

    logger.log('answer : getUserMedia', self.ua);
    this.getUserMedia(mediaConstraints, answerCreationSucceeded, answerCreationFailed, {isAnswer: true, remoteSdp: request.body});
  };

  /**
   * Accepts the reInvite.
   * @param {Object} [options]
   */
  RTCSession.prototype.rejectReInvite = function(options) {
    options = options || {};

    logger.log("rejecting re-INVITE", this.ua);

    this.request.reply(488);
  };

  /**
   * Accepts the reInvite.
   * @param {Object} [options]
   */
  RTCSession.prototype.acceptReInvite = function(options) {
    options = options || {};

    var self = this,
      extraHeaders = options.extraHeaders || [];

    logger.log("accepting re-INVITE", this.ua);

    var replySucceeded = function() {
      var timeout = ExSIP.Timers.T1;

      self.status = C.STATUS_WAITING_FOR_ACK;

      /**
       * RFC3261 13.3.1.4
       * Response retransmissions cannot be accomplished by transaction layer
       *  since it is destroyed when receiving the first 2xx answer
       */
      self.timers.invite2xxTimer = window.setTimeout(function invite2xxRetransmission() {
          if (self.status !== C.STATUS_WAITING_FOR_ACK) {
            return;
          }

          self.request.reply(200, null, extraHeaders, self.rtcMediaHandler.peerConnection.localDescription.sdp);

          if (timeout < ExSIP.Timers.T2) {
            timeout = timeout * 2;
            if (timeout > ExSIP.Timers.T2) {
              timeout = ExSIP.Timers.T2;
            }
          }
          self.timers.invite2xxTimer = window.setTimeout(
            invite2xxRetransmission, timeout
          );
        },
        timeout
      );

      /**
       * RFC3261 14.2
       * If a UAS generates a 2xx response and never receives an ACK,
       *  it SHOULD generate a BYE to terminate the dialog.
       */
      self.timers.ackTimer = window.setTimeout(function() {
          if(self.status === C.STATUS_WAITING_FOR_ACK) {
            logger.log('no ACK received', self.ua);
//                window.clearTimeout(self.timers.invite2xxTimer);
//                self.sendBye();
//                self.ended('remote', null, ExSIP.C.causes.NO_ACK);
          }
        },
        ExSIP.Timers.TIMER_H
      );

      self.started('local', undefined, true);
    };

    var replyFailed = function() {
      self.failed('system', null, ExSIP.C.causes.CONNECTION_ERROR);
    };

//    var previousRemoteDescription = self.rtcMediaHandler.peerConnection.remoteDescription;
    var connectSuccess = function() {
      logger.log("onMessage success", self.ua);
      self.request.reply(200, null, extraHeaders,
        self.rtcMediaHandler.peerConnection.localDescription.sdp,
        replySucceeded,
        replyFailed
      );
    };

    var connectFailed = function(e) {
      logger.warn('invalid SDP', self.ua);
      logger.warn(e, self.ua);
      self.request.reply(488);
    };

    this.initialRemoteSdp = this.initialRemoteSdp || self.rtcMediaHandler.peerConnection.remoteDescription.sdp;
    var sdp = this.request.body || this.initialRemoteSdp;
    if(sdp.length === 0) {
      logger.log("empty sdp");
    }
    this.reconnectRtcMediaHandler(connectSuccess, connectFailed, {isAnswer: true, remoteSdp: sdp, isReconnect: true});
  };

  RTCSession.prototype.reconnectRtcMediaHandler = function(connectSuccess, connectFailed, options) {
    var self = this;
    options = options || {};
    var localMedia = options.localMedia || this.rtcMediaHandler.localMedia;
    options["createOfferConstraints"] = this.rtcMediaHandler.createOfferConstraints;
    this.rtcMediaHandler.close();

    this.initRtcMediaHandler();
    this.rtcMediaHandler.localMedia = localMedia;
    this.connectRtcMediaHandler(localMedia, function(){
        self.started('local', undefined, true);
        connectSuccess();
      }, connectFailed, options
    );
  };

  /**
   * Send a DTMF
   *
   * @param {String|Number} tones
   * @param {Object} [options]
   */
  RTCSession.prototype.sendDTMF = function(tones, options) {
    var duration, interToneGap;

    options = options || {};
    duration = options.duration || null;
    interToneGap = options.interToneGap || null;

    if (tones === undefined) {
      throw new TypeError('Not enough arguments');
    }

    // Check Session Status
    if (this.status !== C.STATUS_CONFIRMED && this.status !== C.STATUS_WAITING_FOR_ACK) {
      throw new ExSIP.Exceptions.InvalidStateError(this.status);
    }

    // Check tones
    if (!tones || (typeof tones !== 'string' && typeof tones !== 'number') || !tones.toString().match(/^[0-9A-D#*,]+$/i)) {
      throw new TypeError('Invalid tones: '+ tones);
    }

    tones = tones.toString();

    // Check duration
    if (duration && !ExSIP.Utils.isDecimal(duration)) {
      throw new TypeError('Invalid tone duration: '+ duration);
    } else if (!duration) {
      duration = DTMF.C.DEFAULT_DURATION;
    } else if (duration < DTMF.C.MIN_DURATION) {
      logger.warn('"duration" value is lower than the minimum allowed, setting it to '+ DTMF.C.MIN_DURATION+ ' milliseconds', this.session.ua);
      duration = DTMF.C.MIN_DURATION;
    } else if (duration > DTMF.C.MAX_DURATION) {
      logger.warn('"duration" value is greater than the maximum allowed, setting it to '+ DTMF.C.MAX_DURATION +' milliseconds', this.session.ua);
      duration = DTMF.C.MAX_DURATION;
    } else {
      duration = Math.abs(duration);
    }
    options.duration = duration;

    // Check interToneGap
    if (interToneGap && !ExSIP.Utils.isDecimal(interToneGap)) {
      throw new TypeError('Invalid interToneGap: '+ interToneGap);
    } else if (!interToneGap) {
      interToneGap = DTMF.C.DEFAULT_INTER_TONE_GAP;
    } else if (interToneGap < DTMF.C.MIN_INTER_TONE_GAP) {
      logger.warn('"interToneGap" value is lower than the minimum allowed, setting it to '+ DTMF.C.MIN_INTER_TONE_GAP +' milliseconds', this.session.ua);
      interToneGap = DTMF.C.MIN_INTER_TONE_GAP;
    } else {
      interToneGap = Math.abs(interToneGap);
    }

    this.dtmf.send(tones, options);
  };


  /**
   * RTCPeerconnection handlers
   */
// Modified to support Firefox 22
  RTCSession.prototype.getLocalStreams = function() {
    try {
      if (this.rtcMediaHandler.peerConnection.localStreams) {
        return this.rtcMediaHandler &&
          this.rtcMediaHandler.peerConnection &&
          this.rtcMediaHandler.peerConnection.localStreams || [];
      }
      else {
        return this.rtcMediaHandler &&
          this.rtcMediaHandler.peerConnection &&
          this.rtcMediaHandler.peerConnection.getLocalStreams() || [];
      }
    } catch(ex) {
      return [];
    }
  };

  RTCSession.prototype.getRemoteStreams = function() {
    try {
      if (this.rtcMediaHandler.peerConnection.remoteStreams) {
        return this.rtcMediaHandler &&
          this.rtcMediaHandler.peerConnection &&
          this.rtcMediaHandler.peerConnection.remoteStreams || [];
      }
      else {
        return this.rtcMediaHandler &&
          this.rtcMediaHandler.peerConnection &&
          this.rtcMediaHandler.peerConnection.getRemoteStreams() || [];
      }
    } catch(ex) {
      return [];
    }
  };

  /**
   * Session Management
   */

  /**
   * @private
   */
  RTCSession.prototype.init_incoming = function(request) {
    var expires,
      self = this,
      contentType = request.getHeader('Content-Type');

    // Check body and content type
    if(!request.body || (contentType !== 'application/sdp')) {
      request.reply(415);
      return;
    }

    // Session parameter initialization
    this.status = C.STATUS_INVITE_RECEIVED;
    this.from_tag = request.from_tag;
    this.id = request.call_id + this.from_tag;
    this.request = request;
    this.contact = this.ua.contact.toString();

    //Save the session into the ua sessions collection.
    this.ua.sessions[this.id] = this;

    //Get the Expires header value if exists
    if(request.hasHeader('expires')) {
      expires = request.getHeader('expires') * 1000;
    }

    /* Set the to_tag before
     * replying a response code that will create a dialog.
     */
    request.to_tag = ExSIP.Utils.newTag();

    // An error on dialog creation will fire 'failed' event
    if(!this.createDialog(request, 'UAS', true)) {
      request.reply(500, 'Missing Contact header field');
      return;
    }

    //Initialize Media Session
    this.initRtcMediaHandler();
    this.rtcMediaHandler.onMessage(
      request.body,
      /*
       * onSuccess
       * SDP Offer is valid. Fire UA newRTCSession
       */
      function() {
        request.reply(180, null, ['Contact: ' + self.contact]);
        self.status = C.STATUS_WAITING_FOR_ANSWER;

        // Set userNoAnswerTimer
        self.timers.userNoAnswerTimer = window.setTimeout(function() {
            request.reply(408);
            self.failed('local',null, ExSIP.C.causes.NO_ANSWER);
          }, self.ua.configuration.no_answer_timeout
        );

        /* Set expiresTimer
         * RFC3261 13.3.1
         */
        if (expires) {
          self.timers.expiresTimer = window.setTimeout(function() {
              if(self.status === C.STATUS_WAITING_FOR_ANSWER) {
                request.reply(487);
                self.failed('system', null, ExSIP.C.causes.EXPIRES);
              }
            }, expires
          );
        }

        self.newRTCSession('remote', request);
      },
      /*
       * onFailure
       * Bad media description
       */
      function(e) {
        logger.warn('invalid SDP', self.ua);
        logger.warn(e, self.ua);
        request.reply(488);
      }
    );
  };

  /**
   * @private
   */
  RTCSession.prototype.connect = function(target, options) {
    var self = this;

    if (target === undefined) {
      throw new TypeError('Not enough arguments');
    }

    this.connectLocalMedia(options, function(){
      logger.log("connect local succeeded", self.ua);
      self.sendInviteRequest(target, options);
    }, function(){
      logger.warn("connect local failed", self.ua);
    });
  };

  /**
   * @private
   */
  RTCSession.prototype.connectLocalMedia = function(options, success, failure) {
    options = options || {};

    var event,
      eventHandlers = options.eventHandlers || {},
      mediaConstraints = options.mediaConstraints || {audio: true, video: true},
      self = this;

    // Check Session Status
    if (this.status !== C.STATUS_NULL) {
      throw new ExSIP.Exceptions.InvalidStateError(this.status);
    }

    // Set event handlers
    for (event in eventHandlers) {
      this.on(event, eventHandlers[event]);
    }

    // Session parameter initialization
    this.from_tag = ExSIP.Utils.newTag();
    this.initRtcMediaHandler(options);

    if (!ExSIP.WebRTC.isSupported) {
      this.failed('local', null, ExSIP.C.causes.WEBRTC_NOT_SUPPORTED);
    } else {
      this.getUserMedia(mediaConstraints, function(){
        logger.log('offer succeeded', self.ua);
        success();
      }, function(){
        logger.log('offer failed', self.ua);
        self.failed('local', null, ExSIP.C.causes.WEBRTC_ERROR);
        failure();
      }, options);
    }
  };

  /**
   * @private
   */
  RTCSession.prototype.close = function() {
    var idx;

    if(this.status === C.STATUS_TERMINATED) {
      return;
    }

    logger.log('closing INVITE session ' + this.id, this.ua);

    // 1st Step. Terminate media.
    if (this.rtcMediaHandler){
      this.rtcMediaHandler.close();
    }

    // 2nd Step. Terminate signaling.

    // Clear session timers
    for(idx in this.timers) {
      window.clearTimeout(this.timers[idx]);
    }

    // Terminate dialogs

    // Terminate confirmed dialog
    if(this.dialog) {
      this.dialog.terminate();
      delete this.dialog;
    }

    // Terminate early dialogs
    for(idx in this.earlyDialogs) {
      this.earlyDialogs[idx].terminate();
      delete this.earlyDialogs[idx];
    }

    this.status = C.STATUS_TERMINATED;

    delete this.ua.sessions[this.id];
  };

  /**
   * Dialog Management
   * @private
   */
  RTCSession.prototype.createDialog = function(message, type, early) {
    var dialog, early_dialog,
      local_tag = (type === 'UAS') ? message.to_tag : message.from_tag,
      remote_tag = (type === 'UAS') ? message.from_tag : message.to_tag,
      id = message.call_id + local_tag + remote_tag;

    early_dialog = this.earlyDialogs[id];

    // Early Dialog
    if (early) {
      if (early_dialog) {
        return true;
      } else {
        early_dialog = new ExSIP.Dialog(this, message, type, ExSIP.Dialog.C.STATUS_EARLY);

        // Dialog has been successfully created.
        if(early_dialog.id) {
          this.earlyDialogs[id] = early_dialog;
          return true;
        }
        // Dialog not created due to an error.
        else {
          this.failed('remote', message, ExSIP.C.causes.INTERNAL_ERROR);
          return false;
        }
      }
    }

    // Confirmed Dialog
    else {
      // In case the dialog is in _early_ state, update it
      if (early_dialog) {
        early_dialog.update(message, type);
        this.dialog = early_dialog;
        delete this.earlyDialogs[id];
        return true;
      }

      // Otherwise, create a _confirmed_ dialog
      dialog = new ExSIP.Dialog(this, message, type);

      if(dialog.id) {
        this.to_tag = message.to_tag;
        this.dialog = dialog;
        return true;
      }
      // Dialog not created due to an error
      else {
        this.failed('remote', message, ExSIP.C.causes.INTERNAL_ERROR);
        return false;
      }
    }
  };


  /**
   * In dialog Request Reception
   * @private
   */
  RTCSession.prototype.receiveRequest = function(request) {
    var contentType, self = this;

    if(request.method === ExSIP.C.CANCEL) {
      /* RFC3261 15 States that a UAS may have accepted an invitation while a CANCEL
       * was in progress and that the UAC MAY continue with the session established by
       * any 2xx response, or MAY terminate with BYE. ExSIP does continue with the
       * established session. So the CANCEL is processed only if the session is not yet
       * established.
       */

      /*
       * Terminate the whole session in case the user didn't accept nor reject the
       *request opening the session.
       */
      if(this.status === C.STATUS_WAITING_FOR_ANSWER) {
        this.status = C.STATUS_CANCELED;
        this.request.reply(487);
        this.failed('remote', request, ExSIP.C.causes.CANCELED);
      }
    } else {
      // Requests arriving here are in-dialog requests.
      switch(request.method) {
        case ExSIP.C.ACK:
          if(this.status === C.STATUS_WAITING_FOR_ACK) {
            window.clearTimeout(this.timers.ackTimer);
            window.clearTimeout(this.timers.invite2xxTimer);
            this.status = C.STATUS_CONFIRMED;
            if(request.body.length > 0) {
              logger.log("reconnecting with ACK sdp and current local description", this.ua);
              var localDescription = this.rtcMediaHandler.peerConnection.localDescription;
              logger.log(localDescription.sdp, this.ua);
              this.reconnectRtcMediaHandler(function(){
                logger.log("reconnect success", self.ua);
              }, function(){
                logger.log("reconnect failure", self.ua);
              }, {isAnswer: true, remoteSdp: request.body, isReconnect: true, localDescription: localDescription});
            }
          }
          break;
        case ExSIP.C.BYE:
          if(this.status === C.STATUS_CONFIRMED) {
            request.reply(200);
            this.ended('remote', request, ExSIP.C.causes.BYE);
          }
          break;
        case ExSIP.C.INVITE:
          if(this.status === C.STATUS_CONFIRMED) {
            logger.log('re-INVITE received', this.ua);
            this.request = request;
            // accept empty reinvites
            if(!request.body || request.body.length === 0) {
              this.acceptReInvite();
              return;
            }

            var description = new ExSIP.WebRTC.RTCSessionDescription({type: "offer", sdp: request.body});
            var oldDescription = this.rtcMediaHandler.peerConnection.remoteDescription;
            var audioAdd = description.hasActiveAudio() && !oldDescription.hasActiveAudio();
            var videoAdd = description.hasActiveVideo() && !oldDescription.hasActiveVideo();
            if(audioAdd || videoAdd) {
              this.ua.emit("onReInvite", this.ua, {
                session: this,
                request: request,
                audioAdd: audioAdd,
                videoAdd: videoAdd
              });
            } else {
              this.acceptReInvite();
            }
          }
          break;
        case ExSIP.C.INFO:
          if(this.status === C.STATUS_CONFIRMED || this.status === C.STATUS_WAITING_FOR_ACK) {
            contentType = request.getHeader('content-type');
            if (contentType && (contentType.match(/^application\/dtmf-relay/i))) {
              new DTMF(this).init_incoming(request);
            }
          }
          break;
        case ExSIP.C.REFER:
          if(this.status === C.STATUS_CONFIRMED) {
            this.ua.processRefer(this, request);
          }
          break;
        case ExSIP.C.NOTIFY:
          if(this.status === C.STATUS_REFER_SENT) {
            request.reply(200);
            logger.log('received NOTIFY with body : ' + request.body, this.ua);
            var status = parseInt(request.body.match(/SIP\/2.0\s(.*)\s/)[1], 10);
            logger.log('NOTIFY status : ' + status, this.ua);

            if(!this.sessionToTransfer) {
              logger.warn('no transferred session for REFER session : ' + this.id, this.ua);
              return;
            }

            if(status >= 200 && status <= 299) {
              logger.log('terminate transferred session : ' + this.sessionToTransfer.id, this.ua);
              this.sessionToTransfer.terminate();
            } else if(status >= 400 && status <= 699) {
              logger.warn('resuming session : ' + this.sessionToTransfer.id, this.ua);
              this.sessionToTransfer.unhold(function(){
                logger.log('resumed session : ' + self.sessionToTransfer.id, self.ua);
              });
            }
          }
      }
    }
  };


  RTCSession.prototype.connectRtcMediaHandler = function(stream, creationSucceeded, creationFailed, options) {
    this.rtcMediaHandler.connect(stream, creationSucceeded, creationFailed, options);
    this.dtmf.enableDtmfSender(stream, this.rtcMediaHandler.peerConnection);
  };

  /**
   * Get User Media
   * @private
   */
  RTCSession.prototype.getUserMedia = function(constraints, creationSucceeded, creationFailed, options) {
    var self = this;

    console.log(options);
    var userMediaSucceeded = function(stream) {
      self.ua.localMedia = stream;
      self.connectRtcMediaHandler(stream, creationSucceeded, creationFailed, options);
//      self.reconnectRtcMediaHandler(creationSucceeded, creationFailed, {localMedia: stream});
    };

    var userMediaFailed = function() {
      if (self.status === C.STATUS_TERMINATED) {
        return;
      }
      self.failed('local', null, ExSIP.C.causes.USER_DENIED_MEDIA_ACCESS);
    };


    if(this.ua.reuseLocalMedia() && this.ua.localMedia) {
      this.rtcMediaHandler.localMedia = this.ua.localMedia;
      userMediaSucceeded(this.ua.localMedia);
    } else {
      this.rtcMediaHandler.getUserMedia(
        userMediaSucceeded,
        userMediaFailed,
        constraints
      );
    }
  };

  RTCSession.prototype.sendInviteRequest = function(target, options, inviteSuccessCallback, inviteFailureCallback) {
    options = options || {};
    options["status"] = C.STATUS_INVITE_SENT;
    options["sdp"] = this.rtcMediaHandler.peerConnection.localDescription.sdp;
    options["target"] = target;
    this.sendRequest(ExSIP.C.INVITE, options, {inviteSuccess: inviteSuccessCallback, inviteFailure: inviteFailureCallback});
  };
  /**
   * Initial Request Sender
   * @private
   */
  RTCSession.prototype.createOutgoingRequest = function(target, method, options) {
    options = options || {};

    var requestParams,
      invalidTarget = false,
      extraHeaders = options.extraHeaders || [];

    // Check target validity
    try {
      target = ExSIP.Utils.normalizeURI(target, this.ua.configuration.hostport_params);
    } catch(e) {
      target = ExSIP.URI.parse(ExSIP.C.INVALID_TARGET_URI);
      invalidTarget = true;
    }

    // Set anonymous property
    this.anonymous = options.anonymous;

    // OutgoingSession specific parameters
    this.isCanceled = false;
    logger.log('outgoing request - setting isCanceled = false', this.ua);

    this.received_100 = false;

    this.from_tag = this.from_tag || ExSIP.Utils.newTag();
    requestParams = {from_tag: this.from_tag};

    this.contact = this.ua.contact.toString({
      anonymous: this.anonymous,
      outbound: true
    });

    if (this.anonymous) {
      requestParams.from_display_name = 'Anonymous';
      requestParams.from_uri = 'sip:anonymous@anonymous.invalid';

      extraHeaders.push('P-Preferred-Identity: '+ this.ua.configuration.uri.toString());
      extraHeaders.push('Privacy: id');
    }

    extraHeaders.push('Contact: '+ this.contact);
    extraHeaders.push('Allow: '+ ExSIP.Utils.getAllowedMethods(this.ua));

    this.request = new ExSIP.OutgoingRequest(method, target, this.ua, requestParams, extraHeaders);

    this.id = this.request.call_id + this.from_tag;

    //Save the session into the ua sessions collection.
    this.ua.sessions[this.id] = this;

    this.newRTCSession('local', this.request);

    if (invalidTarget) {
      this.failed('local', null, ExSIP.C.causes.INVALID_TARGET);
      logger.warn("invalid target : "+target, this.ua);
    } else {
      if (this.isCanceled || this.status === C.STATUS_TERMINATED) {
        logger.warn("canceled or terminated", this.ua);
        return;
      }

      return this.request;
    }

  };

  RTCSession.prototype.sendReferRequest = function(sessionToTransfer, options) {
    this.sessionToTransfer = sessionToTransfer;
    options = options || {};
    options["status"] = C.STATUS_REFER_SENT;
    options["target"] = sessionToTransfer.dialog.remote_target;
    this.sendRequest(ExSIP.C.REFER, options);
  };

  RTCSession.prototype.sendNotifyRequest = function(options, successCallback, failureCallback) {
    options = options || {};
    var extraHeaders = ['Content-Type: message/sipfrag',
      'Subscription-State: '+(options['subscriptionState'] || "active;expires=60"),
      'Event: refer'];
    options = ExSIP.Utils.merge_options({extraHeaders: extraHeaders},  options);
    this.sendRequest(ExSIP.C.NOTIFY, options, {success: successCallback, failure: failureCallback});
  };

  RTCSession.prototype.hold = function(inviteSuccessCallback, inviteFailureCallback) {
    var self = this;
    this.changeSession({audioMode: ExSIP.C.INACTIVE, audioPort: "0", videoMode: ExSIP.C.INACTIVE, videoPort: "0"}, function(){
        self.held();
        if(inviteSuccessCallback) {
          inviteSuccessCallback();
        }
      },
      inviteFailureCallback);
  };

  RTCSession.prototype.unhold = function(inviteSuccessCallback, inviteFailureCallback) {
    var self = this;
    this.changeSession({audioMode: ExSIP.C.SENDRECV, videoMode: ExSIP.C.SENDRECV}, function(){
        self.resumed();
        if(inviteSuccessCallback) {
          inviteSuccessCallback();
        }
      },
      inviteFailureCallback);
  };

  RTCSession.prototype.changeSession = function(sdpOptions, inviteSuccessCallback, inviteFailureCallback) {
    var self = this;
    this.reconnectRtcMediaHandler(function(){
      self.sendInviteRequest(undefined, undefined, inviteSuccessCallback, inviteFailureCallback);
    }, function(){
      logger.error("Could not change local mode");
    }, sdpOptions);
  };

  /**
   * Reception of Response for Initial Request
   * @private
   */
  RTCSession.prototype.receiveResponse = function(response, callbacks) {
    var cause,
      session = this;
    callbacks = callbacks || {};

    if(this.status === C.STATUS_BYE_SENT) {
      this.sendACK();
      this.ended('local', null, ExSIP.C.causes.BYE);
      return;
    }

    // Proceed to cancellation if the user requested.
    if(this.isCanceled) {
      if(response.status_code >= 100 && response.status_code < 200) {
        this.request.cancel(this.cancelReason);
      } else if(response.status_code >= 200 && response.status_code < 299) {
        this.acceptAndTerminate(response);
      } else {
        if (this.dialog || this.createDialog(response, 'UAC')) {
          this.sendACK();
        }
      }
      return;
    }

    if(this.status !== C.STATUS_INVITE_SENT && this.status !== C.STATUS_1XX_RECEIVED) {
      logger.warn('status ('+this.status+') not invite sent or 1xx received or terminated', this.ua);
      return;
    }

    switch(true) {
      case /^100$/.test(response.status_code):
        this.received_100 = true;
        break;
      case /^1[0-9]{2}$/.test(response.status_code):
        // Do nothing with 1xx responses without To tag.
        if(!response.to_tag) {
          logger.warn('1xx response received without to tag', this.ua);
          break;
        }

        // Create Early Dialog if 1XX comes with contact
        if(response.hasHeader('contact')) {
          // An error on dialog creation will fire 'failed' event
          this.createDialog(response, 'UAC', true);
        }

        this.status = C.STATUS_1XX_RECEIVED;
        this.progress('remote', response);
        break;
      case /^2[0-9]{2}$/.test(response.status_code):
        // Do nothing if this.dialog is already confirmed
//        if (this.dialog) {
//          break;
//        }

        if(!response.body) {
          this.acceptAndTerminate(response, 400, 'Missing session description');
          this.failed('remote', response, ExSIP.C.causes.BAD_MEDIA_DESCRIPTION);
          break;
        }

        // An error on dialog creation will fire 'failed' event
        if(!this.dialog) {
          if (!this.createDialog(response, 'UAC')) {
            break;
          }
        }

        this.rtcMediaHandler.onMessage(
          response.body,
          /*
           * onSuccess
           * SDP Answer fits with Offer. Media will start
           */
          function() {
            session.status = C.STATUS_CONFIRMED;
            session.sendACK();
            session.started('remote', response);
            if(callbacks["inviteSuccess"]) {
              callbacks["inviteSuccess"]();
            }
          },
          /*
           * onFailure
           * SDP Answer does not fit the Offer. Accept the call and Terminate.
           */
          function(e) {
            logger.warn(e, session.ua);
            session.acceptAndTerminate(response, 488, 'Not Acceptable Here');
            session.failed('remote', response, ExSIP.C.causes.BAD_MEDIA_DESCRIPTION);
          }
        );
        break;
      default:
        cause = ExSIP.Utils.sipErrorCause(response.status_code);
        this.failed('remote', response, cause);
        if(callbacks["inviteFailure"]) {
          callbacks["inviteFailure"](response);
        }
    }
  };


  /**
   * @private
   */
  RTCSession.prototype.acceptAndTerminate = function(response, status_code, reason_phrase) {
    // Send ACK and BYE
    // An error on dialog creation will fire 'failed' event
    if (this.dialog || this.createDialog(response, 'UAC')) {
      this.sendACK();
      this.sendBye({
        status_code: status_code,
        reason_phrase: reason_phrase
      });
    }
  };

  RTCSession.prototype.supports = function(name) {
    var supported = this.request.getHeader("Supported");
    return supported !== undefined && supported.indexOf(name) !== -1;
  };

  /**
   * @private
   */
  RTCSession.prototype.sendACK = function() {
    this.sendRequest(ExSIP.C.ACK);
  };

  /**
   * @private
   */
  RTCSession.prototype.sendBye = function(options) {
    options = options || {};
    options.extraHeaders = options.extraHeaders || [];

    var reason,
      status_code = options.status_code,
      reason_phrase = options.reason_phrase || ExSIP.C.REASON_PHRASE[status_code] || '',
      body = options.body;

    if (status_code && (status_code < 200 || status_code >= 700)) {
      throw new TypeError('Invalid status_code: '+ status_code);
    } else if (status_code) {
      reason = 'SIP ;cause=' + status_code + '; text="' + reason_phrase + '"';
      options.extraHeaders.push('Reason: '+ reason);
    }

    options["sdp"] = body;
    options["status"] = C.STATUS_BYE_SENT;
    this.sendRequest(ExSIP.C.BYE, options);
  };


  /**
   * @private
   */
  RTCSession.prototype.sendRequest = function(method, options, requestCallbacks) {
    var request;
    options = options || {};
    if(this.dialog) {
      request = this.dialog.createRequest(method, options.extraHeaders);
    } else {
      request = this.createOutgoingRequest(options["target"], method, options);
    }

    if(!request) {
      return;
    }

    if(options["status"]) {
      this.status = options["status"];
    }
    request.body = options["sdp"];

    var hasSdp = request.body && request.body.length > 0;
    if(!ExSIP.Utils.containsHeader(request.extraHeaders, "Content-Type") && hasSdp) {
      request.extraHeaders.push('Content-Type: application/sdp');
    }

    var request_sender = new RequestSender(this, request, requestCallbacks);
    request_sender.send();
  };

  /**
   * Session Callbacks
   */

  /**
   * Callback to be called from UA instance when TransportError occurs
   * @private
   */
  RTCSession.prototype.onTransportError = function() {
    if(this.status !== C.STATUS_TERMINATED) {
      if (this.status === C.STATUS_CONFIRMED) {
        this.ended('system', null, ExSIP.C.causes.CONNECTION_ERROR);
      } else {
        this.failed('system', null, ExSIP.C.causes.CONNECTION_ERROR);
      }
    }
  };

  /**
   * Callback to be called from UA instance when RequestTimeout occurs
   * @private
   */
  RTCSession.prototype.onRequestTimeout = function() {
    if(this.status !== C.STATUS_TERMINATED) {
      if (this.status === C.STATUS_CONFIRMED) {
        this.ended('system', null, ExSIP.C.causes.REQUEST_TIMEOUT);
      } else {
        this.failed('system', null, ExSIP.C.causes.CONNECTION_ERROR);
      }
    }
  };

  /**
   * Internal Callbacks
   */

  /**
   * @private
   */
  RTCSession.prototype.newRTCSession = function(originator, request) {
    var session = this,
      event_name = 'newRTCSession';

    if (originator === 'remote') {
      session.direction = 'incoming';
      session.local_identity = request.to;
      session.remote_identity = request.from;
    } else if (originator === 'local'){
      session.direction = 'outgoing';
      session.local_identity = request.from;
      session.remote_identity = request.to;
    }

    session.ua.emit(event_name, session.ua, {
      originator: originator,
      session: session,
      request: request
    });
  };

  /**
   * @private
   */
  RTCSession.prototype.connecting = function(originator, request) {
    var session = this,
      event_name = 'connecting';

    session.emit(event_name, session, {
      originator: 'local',
      request: request
    });
  };

  /**
   * @private
   */
  RTCSession.prototype.progress = function(originator, response) {
    var session = this,
      event_name = 'progress';

    session.emit(event_name, session, {
      originator: originator,
      response: response || null
    });
  };

  RTCSession.prototype.isStarted = function() {
    return this.start_time !== null;
  };

  RTCSession.prototype.isHeld = function() {
    return this.isOnHold;
  };

  /**
   * @private
   */
  RTCSession.prototype.started = function(originator, message, isReconnect) {
    var session = this,
      event_name = 'started';

    session.start_time = new Date();

    session.emit(event_name, session, {
      originator: originator,
      response: message || null,
      isReconnect: isReconnect
    });
  };

  RTCSession.prototype.held = function() {
    this.isOnHold = true;
    this.emit('held', this);
  };

  RTCSession.prototype.resumed = function() {
    this.isOnHold = false;
    this.emit('resumed', this);
  };

  /**
   * @private
   */
  RTCSession.prototype.ended = function(originator, message, cause) {
    var session = this,
      event_name = 'ended';

    session.end_time = new Date();

    session.close();
    session.emit(event_name, session, {
      originator: originator,
      message: message || null,
      cause: cause
    });
  };

  /**
   * @private
   */
  RTCSession.prototype.failed = function(originator, message, cause) {
    var session = this,
      event_name = 'failed';

    logger.warn('failed : '+cause, this.ua);

    session.close();
    session.emit(event_name, session, {
      originator: originator,
      message: message || null,
      cause: cause
    });
  };


  RTCSession.C = C;
  ExSIP.RTCSession = RTCSession;
}(ExSIP));
