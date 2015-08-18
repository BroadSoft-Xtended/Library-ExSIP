module.exports = RTCSession;


var C = {
  // RTCSession states
  STATUS_NULL: 0,
  STATUS_INVITE_SENT: 1,
  STATUS_1XX_RECEIVED: 2,
  STATUS_INVITE_RECEIVED: 3,
  STATUS_WAITING_FOR_ANSWER: 4,
  STATUS_ANSWERED: 5,
  STATUS_WAITING_FOR_ACK: 6,
  STATUS_CANCELED: 7,
  STATUS_TERMINATED: 8,
  STATUS_CONFIRMED: 9,
  STATUS_REFER_SENT: 10,
  STATUS_BYE_SENT: 11
};

/**
 * Expose C object.
 */
RTCSession.C = C;

/**
 * Dependencies.
 */
var ExSIP_C = require('./Constants');
var EventEmitter = require('./EventEmitter');
var Exceptions = require('./Exceptions');
var Parser = require('./Parser');
var Utils = require('./Utils');
var Timers = require('./Timers');
var UA = require('./UA');
var WebRTC = require('./WebRTC');
var SIPMessage = require('./SIPMessage');
var Dialog = require('./Dialog');
var RequestSender = require('./RequestSender');
var RTCSession_RTCMediaHandler = require('./RTCSession/RTCMediaHandler');
var RTCSession_DTMF = require('./RTCSession/DTMF');


function RTCSession(ua) {
  var events = [
    'connecting',
    'progress',
    'failed',
    'accepted',
    'confirmed',
    'ended',
    'newDTMF',
    'hold',
    'held',
    'resumed',
    'unhold',
    'muted',
    'unmuted',
    'started',
    'onReInvite',
    'dataSent',
    'dataReceived',
    'iceconnected',
    'icecompleted',
    'iceclosed'
  ];

  this.ua = ua;
  this.setStatus(C.STATUS_NULL);
  this.dialog = null;
  this.earlyDialogs = {};
  this.rtcMediaHandler = null;
  this.receiveResponse = this.receiveInviteResponse;

  // RTCSession confirmation flag
  this.is_confirmed = false;

  // is late SDP being negotiated
  this.late_sdp = false;

  // Session Timers
  this.timers = {
    ackTimer: null,
    expiresTimer: null,
    invite2xxTimer: null,
    userNoAnswerTimer: null
  };

  // Custom session empty object for high level use
  this.data = {};
  this.dtmf = new RTCSession_DTMF(this);

  /**
   * User API
   */

  // Mute/Hold state
  this.isOnHold = false;
  this.audioMuted = false;
  this.videoMuted = false;
  this.local_hold = false;
  this.remote_hold = false;
  this.start_time = null;

  this.pending_actions = {
    actions: [],

    length: function() {
      return this.actions.length;
    },

    isPending: function(name) {
      var
        idx = 0,
        length = this.actions.length;

      for (idx; idx < length; idx++) {
        if (this.actions[idx].name === name) {
          return true;
        }
      }
      return false;
    },

    shift: function() {
      return this.actions.shift();
    },

    push: function(name) {
      this.actions.push({
        name: name
      });
    },

    pop: function(name) {
      var
        idx = 0,
        length = this.actions.length;

      for (idx; idx < length; idx++) {
        if (this.actions[idx].name === name) {
          this.actions.splice(idx, 1);
        }
      }
    }
  };

  // Custom session empty object for high level use
  this.data = {};

  this.initEvents(events);
}

RTCSession.prototype = new EventEmitter();

RTCSession.prototype.hasRemoteAudio = function() {
  return this.rtcMediaHandler && this.rtcMediaHandler.peerConnection && this.rtcMediaHandler.peerConnection.remoteDescription &&
  this.rtcMediaHandler.peerConnection.remoteDescription.hasAudio();
};

RTCSession.prototype.hasRemoteVideo = function() {
  return this.rtcMediaHandler && this.rtcMediaHandler.peerConnection && this.rtcMediaHandler.peerConnection.remoteDescription &&
  this.rtcMediaHandler.peerConnection.remoteDescription.hasVideo();
};

RTCSession.prototype.hasLocalAudio = function() {
  return this.rtcMediaHandler && this.rtcMediaHandler.peerConnection && this.rtcMediaHandler.peerConnection.localDescription &&
  this.rtcMediaHandler.peerConnection.localDescription.hasAudio();
};

RTCSession.prototype.hasLocalVideo = function() {
  return this.rtcMediaHandler && this.rtcMediaHandler.peerConnection && this.rtcMediaHandler.peerConnection.localDescription &&
  this.rtcMediaHandler.peerConnection.localDescription.hasVideo();
};

/**
 * Terminate the call.
 */
RTCSession.prototype.terminate = function(options) {
  options = options || {};

  var cancel_reason,
    status_code = options.status_code,
    reason_phrase = options.reason_phrase,
    extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [],
    body = options.body;

  // Check Session Status
  if (this.status === C.STATUS_TERMINATED) {
    throw new Exceptions.InvalidStateError(this.status);
  }

  this.logger.log('terminate with status : ' + this.status);

  switch (this.status) {
    // - UAC -
    case C.STATUS_NULL:
    case C.STATUS_INVITE_SENT:
    case C.STATUS_1XX_RECEIVED:
      this.logger.debug('canceling RTCSession');

      if (status_code && (status_code < 200 || status_code >= 700)) {
        throw new TypeError('Invalid status_code: ' + status_code);
      } else if (status_code) {
        reason_phrase = reason_phrase || ExSIP_C.REASON_PHRASE[status_code] || '';
        cancel_reason = 'SIP ;cause=' + status_code + ' ;text="' + reason_phrase + '"';
      }

      // Check Session Status
      if (this.status === C.STATUS_NULL) {
        this.isCanceled = true;
        this.cancelReason = cancel_reason;
      } else if (this.status === C.STATUS_INVITE_SENT) {
        if (this.received_100) {
          this.logger.debug('canceling after received 100 response');
          if (typeof(this.request.cancel) === 'undefined') {
            this.sendBye(options);
            this.ended('local', null, ExSIP_C.causes.BYE);
          } else {
            this.isCanceled = true;
            this.logger.log('terminate on 100 - setting isCanceled = true', this.ua);
            this.request.cancel(cancel_reason);
          }
        } else {
          this.isCanceled = true;
          this.cancelReason = cancel_reason;
        }
      } else if (this.status === C.STATUS_1XX_RECEIVED) {
        this.isCanceled = true;
        this.logger.log('terminate on 1xx - setting isCanceled = true');
        this.request.cancel(cancel_reason);
      }

      this.setStatus(C.STATUS_CANCELED);

      this.failed('local', null, ExSIP_C.causes.CANCELED);
      break;

      // - UAS -
    case C.STATUS_WAITING_FOR_ANSWER:
      this.logger.log('rejecting RTCSession with 486 Busy Here', this.ua);
      this.request.reply(486);
      this.failed('local', null, ExSIP_C.causes.REJECTED);
      break;
    case C.STATUS_ANSWERED:
      this.logger.debug('rejecting RTCSession');

      status_code = status_code || 480;

      if (status_code < 300 || status_code >= 700) {
        throw new TypeError('Invalid status_code: ' + status_code);
      }

      this.request.reply(status_code, reason_phrase, extraHeaders, body);
      this.failed('local', null, ExSIP_C.causes.REJECTED);
      break;

    case C.STATUS_WAITING_FOR_ACK:
    case C.STATUS_REFER_SENT:
    case C.STATUS_CONFIRMED:
      this.logger.debug('terminating RTCSession');

      // Send Bye
      this.sendBye(options);
      return;
      // reason_phrase = options.reason_phrase || ExSIP_C.REASON_PHRASE[status_code] || '';

      // if (status_code && (status_code < 200 || status_code >= 700)) {
      //   throw new TypeError('Invalid status_code: '+ status_code);
      // } else if (status_code) {
      //   extraHeaders.push('Reason: SIP ;cause=' + status_code + '; text="' + reason_phrase + '"');
      // }

      // /* RFC 3261 section 15 (Terminating a session):
      //   *
      //   * "...the callee's UA MUST NOT send a BYE on a confirmed dialog
      //   * until it has received an ACK for its 2xx response or until the server
      //   * transaction times out."
      //   */
      // if (this.status === C.STATUS_WAITING_FOR_ACK &&
      //     this.direction === 'incoming' &&
      //     this.request.server_transaction.state !== Transactions.C.STATUS_TERMINATED) {

      //   // Save the dialog for later restoration
      //   dialog = this.dialog;

      //   // Send the BYE as soon as the ACK is received...
      //   this.receiveRequest = function(request) {
      //     if(request.method === ExSIP_C.ACK) {
      //       self.sendBye({
      //         extraHeaders: extraHeaders,
      //         body: body
      //       });
      //       // this.sendRequest(ExSIP_C.BYE, {
      //       //   extraHeaders: extraHeaders,
      //       //   body: body
      //       // });
      //       dialog.terminate();
      //     }
      //   };

      //   // .., or when the INVITE transaction times out
      //   this.request.server_transaction.on('stateChanged', function(e){
      //     if (e.sender.state === Transactions.C.STATUS_TERMINATED) {
      //       self.sendBye({
      //         extraHeaders: extraHeaders,
      //         body: body
      //       });
      //       // self.sendRequest(ExSIP_C.BYE, {
      //       //   extraHeaders: extraHeaders,
      //       //   body: body
      //       // });
      //       dialog.terminate();
      //     }
      //   });

      //   this.ended('local', null, cause);

      //   // Restore the dialog into 'this' in order to be able to send the in-dialog BYE :-)
      //   this.dialog = dialog;

      //   // Restore the dialog into 'ua' so the ACK can reach 'this' session
      //   this.ua.dialogs[dialog.id.toString()] = dialog;

      // } else {
      //   self.sendBye({
      //     extraHeaders: extraHeaders,
      //     body: body
      //   });
      //   return;
      //   // this.sendRequest(ExSIP_C.BYE, {
      //   //   extraHeaders: extraHeaders,
      //   //   body: body
      //   // });

      //   // this.ended('local', null, cause);
      // }
  }

  this.close();
};

/**
 * Answer the call.
 */
RTCSession.prototype.answer = function(options) {
  options = options || {};

  var idx, length, sdp, remoteDescription,
    hasAudio = false,
    hasVideo = false,
    self = this,
    request = this.request,
    extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [],
    mediaConstraints = options.mediaConstraints || {},
    mediaStream = options.mediaStream || null,

    // rtcMediaHandler.createAnswer or rtcMediaHandler.createOffer succeeded
    sdpCreationSucceeded = function(body) {
      var
      // run for reply success callback
        replySucceeded = function() {
          self.setStatus(C.STATUS_WAITING_FOR_ACK);

          self.setInvite2xxTimer(request, body);
          self.setACKTimer();
          self.accepted('local');
          self.started('local');
        },

        // run for reply failure callback
        replyFailed = function() {
          self.failed('system', null, ExSIP_C.causes.CONNECTION_ERROR);
        };

      request.reply(200, null, extraHeaders,
        body,
        replySucceeded,
        replyFailed
      );
    },

    // rtcMediaHandler.createAnswer or rtcMediaHandler.createOffer failed
    sdpCreationFailed = function() {
      if (self.status === C.STATUS_TERMINATED) {
        return;
      }

      self.failed('system', null, ExSIP_C.causes.WEBRTC_ERROR);
    };

  this.data = options.data || {};

  // Check Session Direction and Status
  if (this.direction !== 'incoming') {
    throw new Exceptions.NotSupportedError('"answer" not supported for outgoing RTCSession');
  } else if (this.status !== C.STATUS_WAITING_FOR_ANSWER) {
    throw new Exceptions.InvalidStateError(this.status);
  }

  this.setStatus(C.STATUS_ANSWERED);

  // An error on dialog creation will fire 'failed' event
  if (!this.createDialog(request, 'UAS')) {
    request.reply(500, 'Missing Contact header field');
    return;
  }

  clearTimeout(this.timers.userNoAnswerTimer);

  extraHeaders.unshift('Contact: ' + self.contact);

  // Determine incoming media from remote session description
  remoteDescription = this.rtcMediaHandler.peerConnection.remoteDescription || {};
  sdp = Parser.parseSDP(remoteDescription.sdp || '');

  // Make sure sdp is an array, not the case if there is only one media
  if (!(sdp.media instanceof Array)) {
    sdp.media = [sdp.media || []];
  }

  // Go through all medias in SDP to find offered capabilities to answer with
  idx = sdp.media.length;
  while (idx--) {
    if (sdp.media[idx].type === 'audio' &&
      (sdp.media[idx].direction === 'sendrecv' ||
        sdp.media[idx].direction === 'recvonly')) {
      hasAudio = true;
    }
    if (sdp.media[idx].type === 'video' &&
      (sdp.media[idx].direction === 'sendrecv' ||
        sdp.media[idx].direction === 'recvonly')) {
      hasVideo = true;
    }
  }

  // Remove audio from mediaStream if suggested by mediaConstraints
  if (mediaStream && mediaConstraints.audio === false) {
    length = mediaStream.getAudioTracks().length;
    for (idx = 0; idx < length; idx++) {
      mediaStream.removeTrack(mediaStream.getAudioTracks()[idx]);
    }
  }

  // Remove video from mediaStream if suggested by mediaConstraints
  if (mediaStream && mediaConstraints.video === false) {
    length = mediaStream.getVideoTracks().length;
    for (idx = 0; idx < length; idx++) {
      mediaStream.removeTrack(mediaStream.getVideoTracks()[idx]);
    }
  }

  // Set audio constraints based on incoming stream if not supplied
  if (mediaConstraints.audio === undefined) {
    mediaConstraints.audio = hasAudio;
  }

  // Set video constraints based on incoming stream if not supplied
  if (mediaConstraints.video === undefined) {
    mediaConstraints.video = hasVideo;
  }

  this.getUserMedia(mediaConstraints, sdpCreationSucceeded, sdpCreationFailed, {
    isAnswer: true,
    remoteSdp: request.body
  });
};

/**
 * Send a DTMF
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
    throw new Exceptions.InvalidStateError(this.status);
  }

  // Convert to string
  if (typeof tones === 'number') {
    tones = tones.toString();
  }

  // Check tones
  if (!tones || typeof tones !== 'string' || !tones.match(/^[0-9A-D#*,]+$/i)) {
    throw new TypeError('Invalid tones: ' + tones);
  }

  // Check duration
  if (duration && !Utils.isDecimal(duration)) {
    throw new TypeError('Invalid tone duration: ' + duration);
  } else if (!duration) {
    duration = RTCSession_DTMF.C.DEFAULT_DURATION;
  } else if (duration < RTCSession_DTMF.C.MIN_DURATION) {
    this.logger.warn('"duration" value is lower than the minimum allowed, setting it to ' + RTCSession_DTMF.C.MIN_DURATION + ' milliseconds');
    duration = RTCSession_DTMF.C.MIN_DURATION;
  } else if (duration > RTCSession_DTMF.C.MAX_DURATION) {
    this.logger.warn('"duration" value is greater than the maximum allowed, setting it to ' + RTCSession_DTMF.C.MAX_DURATION + ' milliseconds');
    duration = RTCSession_DTMF.C.MAX_DURATION;
  } else {
    duration = Math.abs(duration);
  }
  options.duration = duration;

  // Check interToneGap
  if (interToneGap && !Utils.isDecimal(interToneGap)) {
    throw new TypeError('Invalid interToneGap: ' + interToneGap);
  } else if (!interToneGap) {
    interToneGap = RTCSession_DTMF.C.DEFAULT_INTER_TONE_GAP;
  } else if (interToneGap < RTCSession_DTMF.C.MIN_INTER_TONE_GAP) {
    this.logger.warn('"interToneGap" value is lower than the minimum allowed, setting it to ' + RTCSession_DTMF.C.MIN_INTER_TONE_GAP + ' milliseconds');
    interToneGap = RTCSession_DTMF.C.MIN_INTER_TONE_GAP;
  } else {
    interToneGap = Math.abs(interToneGap);
  }

  this.dtmf.send(tones, options);
};

/**
 * Accepts the reInvite.
 * @param {Object} [options]
 */
RTCSession.prototype.rejectReInvite = function(options) {
  options = options || {};

  this.logger.log('rejecting re-INVITE');

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

  this.logger.log('accepting re-INVITE');

  var replySucceeded = function() {
    var timeout = Timers.T1;

    self.setStatus(C.STATUS_WAITING_FOR_ACK);

    /**
     * RFC3261 13.3.1.4
     * Response retransmissions cannot be accomplished by transaction layer
     *  since it is destroyed when receiving the first 2xx answer
     */
    self.timers.invite2xxTimer = setTimeout(function invite2xxRetransmission() {
        if (self.status !== C.STATUS_WAITING_FOR_ACK) {
          return;
        }

        self.request.reply(200, null, extraHeaders, self.rtcMediaHandler.peerConnection.localDescription.sdp);

        if (timeout < Timers.T2) {
          timeout = timeout * 2;
          if (timeout > Timers.T2) {
            timeout = Timers.T2;
          }
        }
        self.timers.invite2xxTimer = setTimeout(
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
    self.timers.ackTimer = setTimeout(function() {
        if (self.status === C.STATUS_WAITING_FOR_ACK) {
          self.logger.log('no ACK received');
          //                window.clearTimeout(self.timers.invite2xxTimer);
          //                self.sendBye();
          //                self.ended('remote', null, ExSIP.C.causes.NO_ACK);
        }
      },
      Timers.TIMER_H
    );

    self.started('local', undefined, true);
  };

  var replyFailed = function() {
    self.failed('system', null, ExSIP_C.causes.CONNECTION_ERROR);
  };

  //    var previousRemoteDescription = self.rtcMediaHandler.peerConnection.remoteDescription;
  var connectSuccess = function() {
    self.logger.debug('onMessage success');
    self.request.reply(200, null, extraHeaders,
      self.rtcMediaHandler.peerConnection.localDescription.getSdp({
        additionalSdp: self.rtcMediaHandler.peerConnection.remoteUnsupportedMedia
      }),
      replySucceeded,
      replyFailed
    );
  };

  var connectFailed = function(e) {
    self.logger.warn('invalid SDP');
    self.logger.warn(e);
    self.request.reply(488);
  };

  this.initialRemoteSdp = this.initialRemoteSdp || self.rtcMediaHandler.peerConnection.remoteDescription.sdp;
  var sdp = this.request.body;
  if (sdp.length === 0) {
    this.logger.debug('empty sdp');
  }
  this.reconnectRtcMediaHandler(connectSuccess, connectFailed, {
    isAnswer: true,
    remoteSdp: sdp,
    isReconnect: true
  });
};

RTCSession.prototype.reconnectRtcMediaHandler = function(connectSuccess, connectFailed, options) {
  var self = this;
  options = options || {};
  var localMedia = options.localMedia || this.rtcMediaHandler.localMedia || self.ua.localMedia;
  options.createOfferConstraints = options.createOfferConstraints || this.rtcMediaHandler.createOfferConstraints;
  this.rtcMediaHandler.close(!!options.localMedia);

  this.initRtcMediaHandler(options);
  this.rtcMediaHandler.localMedia = localMedia;
  this.rtcMediaHandler.createOfferConstraints = options.createOfferConstraints;
  this.connectRtcMediaHandler(localMedia, function() {
    self.started('local', undefined, true);
    connectSuccess();
  }, connectFailed, options);
};

// /**
//  * Send a generic in-dialog Request
//  */
// RTCSession.prototype.sendRequest = function(method, options, callbacks) {
//   var request = new RTCSession_Request(this, callbacks);

//   if(options.status) {
//     this.status = options.status;
//   }
//   request.body = options.sdp;

//   request.send(method, options);
// };

/**
 * Check if RTCSession is ready for a re-INVITE
 */
RTCSession.prototype.isReadyToReinvite = function() {
  // rtcMediaHandler is not ready
  if (!this.rtcMediaHandler.isReady()) {
    return;
  }

  // Another INVITE transaction is in progress
  if (this.dialog.uac_pending_reply === true || this.dialog.uas_pending_reply === true) {
    return false;
  } else {
    return true;
  }
};


/**
 * Mute
 */
RTCSession.prototype.mute = function(options) {
  options = options || {
    audio: true,
    video: false
  };

  var
    audioMuted = false,
    videoMuted = false;

  if (this.audioMuted === false && options.audio) {
    audioMuted = true;
    this.audioMuted = true;
    this.toogleMuteAudio(true);
  }

  if (this.videoMuted === false && options.video) {
    videoMuted = true;
    this.videoMuted = true;
    this.toogleMuteVideo(true);
  }

  if (audioMuted === true || videoMuted === true) {
    this.onmute({
      audio: audioMuted,
      video: videoMuted
    });
  }
};

/**
 * Unmute
 */
RTCSession.prototype.unmute = function(options) {
  options = options || {
    audio: true,
    video: true
  };

  var
    audioUnMuted = false,
    videoUnMuted = false;

  if (this.audioMuted === true && options.audio) {
    audioUnMuted = true;
    this.audioMuted = false;

    if (this.local_hold === false) {
      this.toogleMuteAudio(false);
    }
  }

  if (this.videoMuted === true && options.video) {
    videoUnMuted = true;
    this.videoMuted = false;

    if (this.local_hold === false) {
      this.toogleMuteVideo(false);
    }
  }

  if (audioUnMuted === true || videoUnMuted === true) {
    this.onunmute({
      audio: audioUnMuted,
      video: videoUnMuted
    });
  }
};

/**
 * isMuted
 */
RTCSession.prototype.isMuted = function() {
  return {
    audio: this.audioMuted,
    video: this.videoMuted
  };
};

/**
 * Hold
 */
// RTCSession.prototype.hold = function() {

//   if (this.status !== C.STATUS_WAITING_FOR_ACK && this.status !== C.STATUS_CONFIRMED) {
//     throw new Exceptions.InvalidStateError(this.status);
//   }

//   this.toogleMuteAudio(true);
//   this.toogleMuteVideo(true);

//   if (!this.isReadyToReinvite()) {
//     /* If there is a pending 'unhold' action, cancel it and don't queue this one
//      * Else, if there isn't any 'hold' action, add this one to the queue
//      * Else, if there is already a 'hold' action, skip
//      */
//     if (this.pending_actions.isPending('unhold')) {
//       this.pending_actions.pop('unhold');
//       return;
//     } else if (!this.pending_actions.isPending('hold')) {
//       this.pending_actions.push('hold');
//       return;
//     } else {
//       return;
//     }
//   } else {
//     if (this.local_hold === true) {
//       return;
//     }
//   }

//   this.onhold('local');

//   this.sendReinvite({
//     mangle: function(body) {
//       var idx, length;

//       body = Parser.parseSDP(body);

//       length = body.media.length;
//       for (idx = 0; idx < length; idx++) {
//         if (body.media[idx].direction === undefined) {
//           body.media[idx].direction = 'sendonly';
//         } else if (body.media[idx].direction === 'sendrecv') {
//           body.media[idx].direction = 'sendonly';
//         } else if (body.media[idx].direction === 'sendonly') {
//           body.media[idx].direction = 'inactive';
//         }
//       }

//       return Parser.writeSDP(body);
//     }
//   });
// };

// /**
//  * Unhold
//  */
// RTCSession.prototype.unhold = function() {

//   if (this.status !== C.STATUS_WAITING_FOR_ACK && this.status !== C.STATUS_CONFIRMED) {
//     throw new Exceptions.InvalidStateError(this.status);
//   }

//   if (!this.audioMuted) {
//     this.toogleMuteAudio(false);
//   }

//   if (!this.videoMuted) {
//     this.toogleMuteVideo(false);
//   }

//   if (!this.isReadyToReinvite()) {
//     /* If there is a pending 'hold' action, cancel it and don't queue this one
//      * Else, if there isn't any 'unhold' action, add this one to the queue
//      * Else, if there is already an 'unhold' action, skip
//      */
//     if (this.pending_actions.isPending('hold')) {
//       this.pending_actions.pop('hold');
//       return;
//     } else if (!this.pending_actions.isPending('unhold')) {
//       this.pending_actions.push('unhold');
//       return;
//     } else {
//       return;
//     }
//   } else {
//     if (this.local_hold === false) {
//       return;
//     }
//   }

//   this.onunhold('local');

//   this.sendReinvite();
// };


/**
 * Session Timers
 */


/**
 * RFC3261 13.3.1.4
 * Response retransmissions cannot be accomplished by transaction layer
 *  since it is destroyed when receiving the first 2xx answer
 */
RTCSession.prototype.setInvite2xxTimer = function(request, body) {
  var
    self = this,
    timeout = Timers.T1;

  this.timers.invite2xxTimer = setTimeout(function invite2xxRetransmission() {
    if (self.status !== C.STATUS_WAITING_FOR_ACK) {
      return;
    }

    request.reply(200, null, ['Contact: ' + self.contact], body);

    if (timeout < Timers.T2) {
      timeout = timeout * 2;
      if (timeout > Timers.T2) {
        timeout = Timers.T2;
      }
    }
    self.timers.invite2xxTimer = setTimeout(
      invite2xxRetransmission, timeout
    );
  }, timeout);
};


/**
 * RFC3261 14.2
 * If a UAS generates a 2xx response and never receives an ACK,
 *  it SHOULD generate a BYE to terminate the dialog.
 */
RTCSession.prototype.setACKTimer = function() {
  var self = this;

  this.timers.ackTimer = setTimeout(function() {
    if (self.status === C.STATUS_WAITING_FOR_ACK) {
      self.logger.debug('no ACK received, terminating the call');
      clearTimeout(self.timers.invite2xxTimer);
      self.sendBye();
      // self.sendRequest(ExSIP_C.BYE);
      self.ended('remote', null, ExSIP_C.causes.NO_ACK);
    }
  }, Timers.TIMER_H);
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
    } else {
      return this.rtcMediaHandler &&
        this.rtcMediaHandler.peerConnection &&
        this.rtcMediaHandler.peerConnection.getLocalStreams() || [];
    }
  } catch (ex) {
    return [];
  }
};

RTCSession.prototype.getRemoteStreams = function() {
  try {
    if (this.rtcMediaHandler.peerConnection.remoteStreams) {
      return this.rtcMediaHandler &&
        this.rtcMediaHandler.peerConnection &&
        this.rtcMediaHandler.peerConnection.remoteStreams || [];
    } else {
      return this.rtcMediaHandler &&
        this.rtcMediaHandler.peerConnection &&
        this.rtcMediaHandler.peerConnection.getRemoteStreams() || [];
    }
  } catch (ex) {
    return [];
  }
};

RTCSession.prototype.initRtcMediaHandler = function(options) {
  options = options || {};
  var constraints = options.RTCConstraints || this.ua.rtcConstraints() || {
    "optional": [{
      'DtlsSrtpKeyAgreement': 'true'
    }]
  };
  this.rtcMediaHandler = new RTCSession_RTCMediaHandler(this, {
    constraints: constraints,
    stun_servers: options.stun_servers,
    turn_servers: options.turn_servers
  });
};
/**
 * Session Management
 */

RTCSession.prototype.init_incoming = function(request) {
  var expires,
    self = this,
    contentType = request.getHeader('Content-Type'),

    waitForAnswer = function() {
      self.setStatus(C.STATUS_WAITING_FOR_ANSWER);

      // Set userNoAnswerTimer
      self.timers.userNoAnswerTimer = setTimeout(function() {
        request.reply(408);
        self.failed('local', null, ExSIP_C.causes.NO_ANSWER);
      }, self.ua.configuration.no_answer_timeout);

      /* Set expiresTimer
       * RFC3261 13.3.1
       */
      if (expires) {
        self.timers.expiresTimer = setTimeout(function() {
          if (self.status === C.STATUS_WAITING_FOR_ANSWER) {
            request.reply(487);
            self.failed('system', null, ExSIP_C.causes.EXPIRES);
          }
        }, expires);
      }

      // Fire 'newRTCSession' event.
      self.newRTCSession('remote', request);

      // Reply 180.
      request.reply(180, null, ['Contact: ' + self.contact]);

      // Fire 'progress' event.
      // TODO: Document that 'response' field in 'progress' event is null for
      // incoming calls.
      self.progress('local', null);
    };

  // Check body and content type
  if (request.body && (contentType !== 'application/sdp')) {
    request.reply(415);
    return;
  }

  // Session parameter initialization
  this.setStatus(C.STATUS_INVITE_RECEIVED);
  this.from_tag = request.from_tag;
  this.id = request.call_id + this.from_tag;
  this.request = request;
  this.contact = this.ua.contact.toString();

  this.logger = this.ua.getLogger('rtcsession', this.id);

  //Save the session into the ua sessions collection.
  this.ua.sessions[this.id] = this;

  //Get the Expires header value if exists
  if (request.hasHeader('expires')) {
    expires = request.getHeader('expires') * 1000;
  }

  /* Set the to_tag before
   * replying a response code that will create a dialog.
   */
  request.to_tag = Utils.newTag();

  // An error on dialog creation will fire 'failed' event
  if (!this.createDialog(request, 'UAS', true)) {
    request.reply(500, 'Missing Contact header field');
    return;
  }

  //Initialize Media Session
  this.initRtcMediaHandler();

  if (request.body) {
    this.rtcMediaHandler.onMessage(
      'offer',
      request.body,
      /*
       * onSuccess
       * SDP Offer is valid. Fire UA newRTCSession
       */
      waitForAnswer,
      /*
       * onFailure
       * Bad media description
       */
      function(e) {
        self.logger.warn('invalid SDP');
        self.logger.warn(e);
        request.reply(488);
      }
    );
  } else {
    this.late_sdp = true;
    waitForAnswer();
  }
};

RTCSession.prototype.connect = function(target, options) {
  var self = this;
  options = options || {};

  this.data = options.data || {};

  this.initRtcMediaHandler(options);

  this.connectLocalMedia(target, options, function() {
    self.sendInviteRequest(target, options);
  }, function() {

  });
};

RTCSession.prototype.close = function() {
  var idx;

  if (this.status === C.STATUS_TERMINATED) {
    return;
  }

  this.logger.debug('closing INVITE session ' + this.id);

  // 1st Step. Terminate media.
  if (this.rtcMediaHandler) {
    this.rtcMediaHandler.close();
  }

  // 2nd Step. Terminate signaling.

  // Clear session timers
  for (idx in this.timers) {
    clearTimeout(this.timers[idx]);
  }

  // Terminate dialogs

  // Terminate confirmed dialog
  if (this.dialog) {
    this.dialog.terminate();
    delete this.dialog;
  }

  // Terminate early dialogs
  for (idx in this.earlyDialogs) {
    this.earlyDialogs[idx].terminate();
    delete this.earlyDialogs[idx];
  }

  this.setStatus(C.STATUS_TERMINATED);

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
      early_dialog = new Dialog(this, message, type, Dialog.C.STATUS_EARLY);

      // Dialog has been successfully created.
      if (early_dialog.id) {
        this.earlyDialogs[id] = early_dialog;
        return true;
      }
      // Dialog not created due to an error.
      else {
        this.failed('remote', message, ExSIP_C.causes.INTERNAL_ERROR);
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
    dialog = new Dialog(this, message, type);

    if (dialog.id) {
      this.to_tag = message.to_tag;
      this.dialog = dialog;
      return true;
    }
    // Dialog not created due to an error
    else {
      this.failed('remote', message, ExSIP_C.causes.INTERNAL_ERROR);
      return false;
    }
  }
};

RTCSession.prototype.connectRtcMediaHandler = function(stream, creationSucceeded, creationFailed, options) {
  this.rtcMediaHandler.connect(stream, creationSucceeded, creationFailed, options);
  this.dtmf.enableDtmfSender(stream, this.rtcMediaHandler.peerConnection);
};

RTCSession.prototype.sendData = function(data) {
  this.rtcMediaHandler.sendData(data);
};

/**
 * Get User Media
 * @private
 */
RTCSession.prototype.getUserMedia = function(constraints, creationSucceeded, creationFailed, options) {
  var self = this;

  var userMediaSucceeded = function(stream) {
    self.ua.localMedia = stream;
    self.connectRtcMediaHandler(stream, creationSucceeded, creationFailed, options);
    //      self.reconnectRtcMediaHandler(creationSucceeded, creationFailed, {localMedia: stream});
  };

  var userMediaFailed = function() {
    if (self.status === C.STATUS_TERMINATED) {
      return;
    }
    self.failed('local', null, ExSIP_C.causes.USER_DENIED_MEDIA_ACCESS);
  };


  if (this.ua.reuseLocalMedia() && this.ua.localMedia) {
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
  options.status = C.STATUS_INVITE_SENT;
  options.sdp = this.rtcMediaHandler.peerConnection.localDescription.sdp;
  options.target = target;
  this.sendRequest(ExSIP_C.INVITE, options, {
    success: inviteSuccessCallback,
    failure: inviteFailureCallback
  });
};
/**
 * Initial Request Sender
 * @private
 */
RTCSession.prototype.createOutgoingRequestSender = function(target, method, options) {
  options = options || {};

  var event, requestParams, iceServers,
    originalTarget = target,
    eventHandlers = options.eventHandlers || {},
    extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [],
    stun_servers = options.stun_servers || null,
    turn_servers = options.turn_servers || null;


  if (stun_servers) {
    iceServers = UA.configuration_check.optional.stun_servers(stun_servers);
    if (!iceServers) {
      throw new TypeError('Invalid stun_servers: ' + stun_servers);
    } else {
      stun_servers = iceServers;
    }
  }

  if (turn_servers) {
    iceServers = UA.configuration_check.optional.turn_servers(turn_servers);
    if (!iceServers) {
      throw new TypeError('Invalid turn_servers: ' + turn_servers);
    } else {
      turn_servers = iceServers;
    }
  }

  if (target === undefined) {
    throw new TypeError('Not enough arguments');
  }

  // Check WebRTC support
  if (!WebRTC.isSupported) {
    throw new Exceptions.NotSupportedError('WebRTC not supported');
  }

  // Check target validity
  target = this.ua.normalizeTarget(target);
  if (!target) {
    throw new TypeError('Invalid target: ' + originalTarget);
  }

  // Check Session Status
  if (this.status !== C.STATUS_NULL) {
    throw new Exceptions.InvalidStateError(this.status);
  }

  // Set event handlers
  for (event in eventHandlers) {
    this.on(event, eventHandlers[event]);
  }

  // Session parameter initialization
  this.from_tag = Utils.newTag();

  // Set anonymous property
  this.anonymous = options.anonymous || false;

  // OutgoingSession specific parameters
  this.isCanceled = false;

  requestParams = {
    from_tag: this.from_tag
  };

  this.contact = this.ua.contact.toString({
    anonymous: this.anonymous,
    outbound: true
  });

  if (this.anonymous) {
    requestParams.from_display_name = 'Anonymous';
    requestParams.from_uri = 'sip:anonymous@anonymous.invalid';

    extraHeaders.push('P-Preferred-Identity: ' + this.ua.configuration.uri.toString());
    extraHeaders.push('Privacy: id');
  }

  extraHeaders.push('Contact: ' + this.contact);
  extraHeaders.push('Allow: ' + Utils.getAllowedMethods(this.ua));

  this.request = new SIPMessage.OutgoingRequest(method, target, this.ua, requestParams, extraHeaders);

  this.id = this.request.call_id + this.from_tag;

  this.logger = this.ua.getLogger('rtcsession', this.id);

  //Save the session into the ua sessions collection.
  this.ua.sessions[this.id] = this;

  this.newRTCSession('local', this.request);

  return new RequestSender(this, this.ua);

};

RTCSession.prototype.sendReferRequest = function(sessionToTransfer, options) {
  this.sessionToTransfer = sessionToTransfer;
  options = options || {};
  options.status = C.STATUS_REFER_SENT;
  options.target = sessionToTransfer.dialog.remote_target;
  this.sendRequest(ExSIP_C.REFER, options);
};

RTCSession.prototype.sendNotifyRequest = function(options, successCallback, failureCallback) {
  options = options || {};
  var extraHeaders = ['Content-Type: message/sipfrag',
    'Subscription-State: ' + (options.subscriptionState || "active;expires=60"),
    'Event: refer'
  ];
  options = Utils.merge_options({
    extraHeaders: extraHeaders
  }, options);
  this.sendRequest(ExSIP_C.NOTIFY, options, {
    success: successCallback,
    failure: failureCallback
  });
};

RTCSession.prototype.isStarted = function() {
  return this.start_time !== null;
};

RTCSession.prototype.isHeld = function() {
  return this.isOnHold;
};

RTCSession.prototype.iceConnected = function(originator, message) {
  var session = this,
    event_name = 'iceconnected';

  session.emit(event_name, session, {
    originator: originator,
    response: message || null
  });
};

RTCSession.prototype.iceCompleted = function(originator, message) {
  var session = this,
    event_name = 'icecompleted';

  session.emit(event_name, session, {
    originator: originator,
    response: message || null
  });
};

RTCSession.prototype.iceClosed = function(originator, message) {
  var session = this,
    event_name = 'iceclosed';

  session.emit(event_name, session, {
    originator: originator,
    response: message || null
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

RTCSession.prototype.hold = function(inviteSuccessCallback, inviteFailureCallback) {
  var self = this;
  this.changeSession({
      audioMode: ExSIP_C.INACTIVE,
      audioPort: "0",
      videoMode: ExSIP_C.INACTIVE,
      videoPort: "0"
    }, function() {
      if (inviteSuccessCallback) {
        inviteSuccessCallback();
      }
      self.held();
    },
    inviteFailureCallback);
};

RTCSession.prototype.unhold = function(inviteSuccessCallback, inviteFailureCallback) {
  var self = this;
  this.changeSession({
      audioMode: ExSIP_C.SENDRECV,
      videoMode: ExSIP_C.SENDRECV
    }, function() {
      if (inviteSuccessCallback) {
        inviteSuccessCallback();
      }
      self.resumed();
    },
    inviteFailureCallback);
};

RTCSession.prototype.changeSession = function(sdpOptions, inviteSuccessCallback, inviteFailureCallback) {
  var self = this;
  this.logger.debug('changeSession : ' + JSON.stringify(sdpOptions));
  if(sdpOptions.hold) {
    sdpOptions.audioMode = ExSIP_C.INACTIVE;
    sdpOptions.videoMode = ExSIP_C.INACTIVE;
  } else if(sdpOptions.resume) {
    sdpOptions.audioMode = ExSIP_C.SENDRECV;
    sdpOptions.videoMode = ExSIP_C.SENDRECV;
  }
  this.reconnectRtcMediaHandler(function() {
    self.logger.debug('changeSession : reconnectRtcMediaHandler : success');
    self.receiveResponse = self.receiveReinviteResponse;
    self.reinviteSucceeded = function(){
      if(sdpOptions.hold) {
        self.held();
      } else if(sdpOptions.resume) {
        self.resumed();
      }
      inviteSuccessCallback && inviteSuccessCallback();
    };
    self.reinviteFailed = inviteFailureCallback;
    self.sendInviteRequest(undefined, undefined);
  }, function() {
    self.logger.error("Could not change local mode");
  }, sdpOptions);
};

/**
 * Reception of Response for Initial INVITE
 */
RTCSession.prototype.receiveInviteResponse = function(response) {
  var cause, dialog,
    session = this;

  // Handle 2XX retransmissions and responses from forked requests
  if (this.dialog && (response.status_code >= 200 && response.status_code <= 299)) {

    /*
     * If it is a retransmission from the endpoint that established
     * the dialog, send an ACK
     */
    if (this.dialog.id.call_id === response.call_id &&
      this.dialog.id.local_tag === response.from_tag &&
      this.dialog.id.remote_tag === response.to_tag) {
      this.sendRequest(ExSIP_C.ACK);
      return;
    }

    // If not, send an ACK  and terminate
    else {
      dialog = new Dialog(this, response, 'UAC');

      if (dialog.error !== undefined) {
        this.logger.error(dialog.error);
        return;
      }

      dialog.sendRequest({
        owner: {
          status: C.STATUS_TERMINATED
        },
        onRequestTimeout: function() {},
        onTransportError: function() {},
        onDialogError: function() {},
        receiveResponse: function() {}
      }, ExSIP_C.ACK);

      dialog.sendRequest({
        owner: {
          status: C.STATUS_TERMINATED
        },
        onRequestTimeout: function() {},
        onTransportError: function() {},
        onDialogError: function() {},
        receiveResponse: function() {}
      }, ExSIP_C.BYE);
      return;
    }

  }

  // Proceed to cancellation if the user requested.
  if (this.isCanceled) {
    // Remove the flag. We are done.
    this.isCanceled = false;

    if (response.status_code >= 100 && response.status_code < 200) {
      this.request.cancel(this.cancelReason);
    } else if (response.status_code >= 200 && response.status_code < 299) {
      this.acceptAndTerminate(response);
    }
    return;
  }

  if (this.status !== C.STATUS_INVITE_SENT && this.status !== C.STATUS_1XX_RECEIVED) {
    return;
  }

  switch (true) {
    case /^100$/.test(response.status_code):
      this.received_100 = true;
      break;
    case /^1[0-9]{2}$/.test(response.status_code):
      this.received_100 = true;
      if (this.status !== C.STATUS_INVITE_SENT && this.status !== C.STATUS_1XX_RECEIVED) {
        break;
      }

      // Do nothing with 1xx responses without To tag.
      if (!response.to_tag) {
        this.logger.warn('1xx response received without to tag');
        break;
      }

      // Create Early Dialog if 1XX comes with contact
      if (response.hasHeader('contact')) {
        // An error on dialog creation will fire 'failed' event
        if (!this.createDialog(response, 'UAC', true)) {
          break;
        }
      }

      this.setStatus(C.STATUS_1XX_RECEIVED);
      this.progress('remote', response);

      if (!response.body) {
        break;
      }

      this.rtcMediaHandler.onMessage(
        'pranswer',
        response.body,
        /*
         * OnSuccess.
         * SDP Answer fits with Offer.
         */
        function() {},
        /*
         * OnFailure.
         * SDP Answer does not fit with Offer.
         */
        function(e) {
          session.logger.warn(e);
          session.earlyDialogs[response.call_id + response.from_tag + response.to_tag].terminate();
        }
      );
      break;
    case /^2[0-9]{2}$/.test(response.status_code):
      this.setStatus(C.STATUS_CONFIRMED);

      if (!response.body) {
        this.acceptAndTerminate(response, 400, ExSIP_C.causes.MISSING_SDP);
        this.failed('remote', response, ExSIP_C.causes.BAD_MEDIA_DESCRIPTION);
        break;
      }

      // An error on dialog creation will fire 'failed' event
      if (!this.createDialog(response, 'UAC')) {
        break;
      }

      this.rtcMediaHandler.onMessage(
        'answer',
        response.body,
        /*
         * onSuccess
         * SDP Answer fits with Offer. Media will start
         */
        function() {
          session.accepted('remote', response);
          session.started('remote', response);
          session.sendRequest(ExSIP_C.ACK);
          session.confirmed('local', null);
        },
        /*
         * onFailure
         * SDP Answer does not fit the Offer. Accept the call and Terminate.
         */
        function(e) {
          session.logger.warn(e);
          session.acceptAndTerminate(response, 488, 'Not Acceptable Here');
          session.failed('remote', response, ExSIP_C.causes.BAD_MEDIA_DESCRIPTION);
        }
      );
      break;
    default:
      cause = Utils.sipErrorCause(response.status_code);
      this.failed('remote', response, cause);
  }
};

/**
 * Dialog Management
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
      early_dialog = new Dialog(this, message, type, Dialog.C.STATUS_EARLY);

      // Dialog has been successfully created.
      if (early_dialog.error) {
        this.logger.error(dialog.error);
        this.failed('remote', message, ExSIP_C.causes.INTERNAL_ERROR);
        return false;
      } else {
        this.earlyDialogs[id] = early_dialog;
        return true;
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
    dialog = new Dialog(this, message, type);

    if (dialog.error) {
      this.logger.error(dialog.error);
      this.failed('remote', message, ExSIP_C.causes.INTERNAL_ERROR);
      return false;
    } else {
      this.to_tag = message.to_tag;
      this.dialog = dialog;
      return true;
    }
  }
};

/**
 * In dialog INVITE Reception
 */

RTCSession.prototype.receiveReinvite = function(request) {
  var
    sdp, idx, direction,
    self = this,
    contentType = request.getHeader('Content-Type'),
    hold = false,

    createSdp = function(onSuccess, onFailure) {
      if (self.late_sdp) {
        self.rtcMediaHandler.createOffer(onSuccess, onFailure);
      } else {
        self.rtcMediaHandler.createAnswer(onSuccess, onFailure);
      }
    },

    answer = function() {
      createSdp(
        // onSuccess
        function(body) {
          request.reply(200, null, ['Contact: ' + self.contact], body,
            function() {
              self.setStatus(C.STATUS_WAITING_FOR_ACK);
              self.setInvite2xxTimer(request, body);
              self.setACKTimer();

              if (self.remote_hold === true && hold === false) {
                self.onunhold('remote');
              } else if (self.remote_hold === false && hold === true) {
                self.onhold('remote');
              }
            }
          );
        },
        // onFailure
        function() {
          request.reply(500);
        }
      );
    };


  if (request.body) {
    if (contentType !== 'application/sdp') {
      this.logger.warn('invalid Content-Type');
      request.reply(415);
      return;
    }

    sdp = Parser.parseSDP(request.body);

    for (idx = 0; idx < sdp.media.length; idx++) {
      direction = sdp.direction || sdp.media[idx].direction || 'sendrecv';

      if (direction === 'sendonly' || direction === 'inactive') {
        hold = true;
      }
    }

    this.rtcMediaHandler.onMessage(
      'offer',
      request.body,
      /*
       * onSuccess
       * SDP Offer is valid
       */
      answer,
      /*
       * onFailure
       * Bad media description
       */
      function(e) {
        self.logger.error(e);
        request.reply(488);
      }
    );
  } else {
    this.late_sdp = true;
    answer();
  }
};

/**
 * In dialog UPDATE Reception
 */

RTCSession.prototype.receiveUpdate = function(request) {
  var
    sdp, idx, direction,
    self = this,
    contentType = request.getHeader('Content-Type'),
    hold = true;

  if (!request.body) {
    request.reply(200);
    return;
  }

  if (contentType !== 'application/sdp') {
    this.logger.warn('invalid Content-Type');
    request.reply(415);
    return;
  }

  sdp = Parser.parseSDP(request.body);

  for (idx = 0; idx < sdp.media.length; idx++) {
    direction = sdp.direction || sdp.media[idx].direction || 'sendrecv';

    if (direction !== 'sendonly' && direction !== 'inactive') {
      hold = false;
    }
  }

  this.rtcMediaHandler.onMessage(
    'offer',
    request.body,
    /*
     * onSuccess
     * SDP Offer is valid
     */
    function() {
      self.rtcMediaHandler.createAnswer(
        function(body) {
          request.reply(200, null, ['Contact: ' + self.contact], body,
            function() {
              if (self.remote_hold === true && hold === false) {
                self.onunhold('remote');
              } else if (self.remote_hold === false && hold === true) {
                self.onhold('remote');
              }
            }
          );
        },
        function() {
          request.reply(500);
        }
      );
    },
    /*
     * onFailure
     * Bad media description
     */
    function(e) {
      self.logger.error(e);
      request.reply(488);
    }
  );
};

/**
 * In dialog Request Reception
 */
RTCSession.prototype.receiveRequest = function(request) {
  var contentType,
    self = this;

  if (request.method === ExSIP_C.CANCEL) {
    /* RFC3261 15 States that a UAS may have accepted an invitation while a CANCEL
     * was in progress and that the UAC MAY continue with the session established by
     * any 2xx response, or MAY terminate with BYE. ExSIP does continue with the
     * established session. So the CANCEL is processed only if the session is not yet
     * established.
     */

    /*
     * Terminate the whole session in case the user didn't accept (or yet send the answer)
     * nor reject the request opening the session.
     */
    if (this.status === C.STATUS_WAITING_FOR_ANSWER || this.status === C.STATUS_ANSWERED) {
      this.setStatus(C.STATUS_CANCELED);
      this.request.reply(487);
      this.failed('remote', request, ExSIP_C.causes.CANCELED);
    }
  } else {
    // Requests arriving here are in-dialog requests.
    switch (request.method) {
      case ExSIP_C.ACK:
        if (this.status === C.STATUS_WAITING_FOR_ACK) {
          clearTimeout(this.timers.ackTimer);
          clearTimeout(this.timers.invite2xxTimer);
          this.setStatus(C.STATUS_CONFIRMED);
          if (request.body.length > 0) {
            this.logger.log('set remoteDescription for late offer ACK');
            this.rtcMediaHandler.onMessage(self.rtcMediaHandler.getSetRemoteLocationType(), request.body, function() {
              self.logger.log('late offer remoteDescription success');
              self.started('local', undefined, true);
            }, function() {
              self.logger.log('late offer remoteDescription failure');
            });
          }
        }
        break;
      case ExSIP_C.BYE:
        if (this.status === C.STATUS_CONFIRMED || this.status === C.STATUS_REFER_SENT) {
          request.reply(200);
          this.ended('remote', request, ExSIP_C.causes.BYE);
        } else if (this.status === C.STATUS_INVITE_RECEIVED) {
          request.reply(200);
          this.request.reply(487, 'BYE Received');
          this.ended('remote', request, ExSIP_C.causes.BYE);
        } else {
          request.reply(403, 'Wrong Status');
        }
        break;
      case ExSIP_C.INVITE:
        if (this.status === C.STATUS_CONFIRMED) {
          this.logger.debug('re-INVITE received');
          this.request = request;
          // accept empty reinvites
          if (!request.body || request.body.length === 0) {
            this.acceptReInvite();
            return;
          }

          var description = new WebRTC.RTCSessionDescription({
            type: "offer",
            sdp: request.body
          });
          var oldDescription = this.rtcMediaHandler.peerConnection.remoteDescription;
          var audioAdd = description.hasActiveAudio() && (!oldDescription || !oldDescription.hasActiveAudio());
          var videoAdd = description.hasActiveVideo() && (!oldDescription || !oldDescription.hasActiveVideo());
          if (audioAdd || videoAdd) {
            this.ua.emit("onReInvite", this.ua, {
              session: this,
              request: request,
              audioAdd: audioAdd,
              videoAdd: videoAdd
            });
          } else {
            this.acceptReInvite();
          }
        } else {
          request.reply(403, 'Wrong Status');
        }
        break;
      case ExSIP_C.INFO:
        if (this.status === C.STATUS_CONFIRMED || this.status === C.STATUS_WAITING_FOR_ACK || this.status === C.STATUS_INVITE_RECEIVED || this.status === C.STATUS_ANSWERED) {
          contentType = request.getHeader('content-type');
          if (contentType && (contentType.match(/^application\/dtmf-relay/i))) {
            new RTCSession_DTMF(this).init_incoming(request);
          } else if (contentType && (contentType.match(/^application\/media_control\+xml/i))) {
            request.reply(200);
            this.started('local', undefined, true);
          } else {
            request.reply(415);
          }
        } else {
          this.logger.debug('Wrong Status : ' + this.status);
          request.reply(403, 'Wrong Status');
        }
        break;
      case ExSIP_C.UPDATE:
        if (this.status === C.STATUS_CONFIRMED) {
          this.logger.debug('UPDATE received');
          this.receiveUpdate(request);
        } else {
          request.reply(403, 'Wrong Status');
        }
        break;
      case ExSIP_C.REFER:
        if (this.status === C.STATUS_CONFIRMED) {
          this.ua.processRefer(this, request);
        }
        break;
      case ExSIP_C.NOTIFY:
        if (this.status === C.STATUS_REFER_SENT) {
          request.reply(200);
          this.logger.log('received NOTIFY with body : ' + request.body);
          var status = parseInt(request.body.match(/SIP\/2.0\s(.*)\s/)[1], 10);
          this.logger.log('NOTIFY status : ' + status);

          if (!this.sessionToTransfer) {
            this.logger.warn('no transferred session for REFER session : ' + this.id);
            return;
          }

          if (status >= 200 && status <= 299) {
            this.logger.log('terminate transferred session : ' + this.sessionToTransfer.id);
            this.sessionToTransfer.terminate();
          } else if (status >= 400 && status <= 699) {
            this.logger.warn('resuming session : ' + this.sessionToTransfer.id);
            this.sessionToTransfer.unhold(function() {
              self.logger.log('resumed session : ' + self.sessionToTransfer.id);
            });
          }
        }
        break;
      default:
        request.reply(501);
    }
  }
};


RTCSession.prototype.setStatus = function(status) {
  if (this.logger) {
    this.logger.debug('setStatus : ' + Object.keys(C)[status]);
  }
  this.status = status;
};

RTCSession.prototype.supports = function(name) {
  var supported = this.request.getHeader("Supported");
  return supported !== undefined && supported.indexOf(name) !== -1;
};

/**
 * @private
 */
RTCSession.prototype.sendACK = function() {
  this.sendRequest(ExSIP_C.ACK);
};

/**
 * @private
 */
RTCSession.prototype.sendBye = function(options) {
  var self = this;
  options = options || {};
  options.extraHeaders = options.extraHeaders || [];

  var reason,
    status_code = options.status_code,
    reason_phrase = options.reason_phrase || ExSIP_C.REASON_PHRASE[status_code] || '',
    body = options.body;

  if (status_code && (status_code < 200 || status_code >= 700)) {
    throw new TypeError('Invalid status_code: ' + status_code);
  } else if (status_code) {
    reason = 'SIP ;cause=' + status_code + '; text="' + reason_phrase + '"';
    options.extraHeaders.push('Reason: ' + reason);
  }

  options.sdp = body;
  options.status = C.STATUS_BYE_SENT;
  var callbacks = {
    success: function() {
      self.sendACK();
      self.ended('local', null, ExSIP_C.causes.BYE);
    }
  };
  this.logger.log('sendBye : ' + callbacks);
  this.sendRequest(ExSIP_C.BYE, options, callbacks);
};


/**
 * @private
 */
RTCSession.prototype.sendRequest = function(method, options, requestCallbacks) {
  var request_sender;
  options = options || {};
  if (this.dialog) {
    this.logger.debug('sendRequest : dialog : ' + method);
    request_sender = this.dialog.createRequestSender(this, method, options);
  } else {
    this.logger.debug('sendRequest : createOutgoingRequestSender : ' + method + ', ' + JSON.stringify(options));
    request_sender = this.createOutgoingRequestSender(options.target, method, options);
  }

  if (!request_sender) {
    return;
  }

  if (options.status) {
    this.setStatus(options.status);
  }
  request_sender.request.body = options.sdp;

  var hasSdp = request_sender.request.body && request_sender.request.body.length > 0;
  if (!Utils.containsHeader(request_sender.request.extraHeaders, "Content-Type") && hasSdp) {
    request_sender.request.extraHeaders.push('Content-Type: application/sdp');
  }
  this.logger.debug('request_sender.request.extraHeaders : ' + Utils.toString(request_sender.request.extraHeaders));

  request_sender.send(requestCallbacks);
};

/**
 * Session 1009s
 */

/**
 * Callback to be called from UA instance when TransportError occurs
 * @private
 */
RTCSession.prototype.onTransportError = function() {
  if (this.status !== C.STATUS_TERMINATED) {
    if (this.status === C.STATUS_CONFIRMED) {
      this.ended('system', null, ExSIP_C.causes.CONNECTION_ERROR);
    } else {
      this.failed('system', null, ExSIP_C.causes.CONNECTION_ERROR);
    }
  }
};

/**
 * Initial Request Sender
 */
RTCSession.prototype.connectLocalMedia = function(target, options, success, failure) {
  var
    self = this;

  // // User media succeeded
  // userMediaSucceeded = function(stream) {
  //   self.rtcMediaHandler.addStream(
  //     stream,
  //     streamAdditionSucceeded,
  //     streamAdditionFailed
  //   );
  // },

  // // User media failed
  // userMediaFailed = function() {
  //   if (self.status === C.STATUS_TERMINATED) {
  //     return;
  //   }

  //   self.failed('local', null, ExSIP_C.causes.USER_DENIED_MEDIA_ACCESS);
  // },

  // // rtcMediaHandler.addStream successfully added
  // streamAdditionSucceeded = function() {
  //   self.connecting(self.request);

  //   if (self.status === C.STATUS_TERMINATED) {
  //     return;
  //   }

  //   self.rtcMediaHandler.createOffer(
  //     offerCreationSucceeded,
  //     offerCreationFailed,
  //     RTCOfferConstraints
  //   );
  // },

  // // rtcMediaHandler.addStream failed
  // streamAdditionFailed = function() {
  //   if (self.status === C.STATUS_TERMINATED) {
  //     return;
  //   }

  //   self.failed('system', null, ExSIP_C.causes.WEBRTC_ERROR);
  // },

  // // rtcMediaHandler.createOffer succeeded
  // offerCreationSucceeded = function(offer) {
  //   if (self.isCanceled || self.status === C.STATUS_TERMINATED) {
  //     return;
  //   }

  //   self.request.body = offer;
  //   self.status = C.STATUS_INVITE_SENT;
  //   request_sender.send();
  // },

  // // rtcMediaHandler.createOffer failed
  // offerCreationFailed = function() {
  //   if (self.status === C.STATUS_TERMINATED) {
  //     return;
  //   }

  //   self.failed('system', null, ExSIP_C.causes.WEBRTC_ERROR);
  // };

  this.receiveResponse = this.receiveInviteResponse;
  var mediaConstraints = options.mediaConstraints || {
    audio: true,
    video: true
  };

  this.getUserMedia(mediaConstraints, function() {
    self.logger.log('getUserMedia succeeded');
    success();
  }, function() {
    self.logger.log('getUserMedia failed');
    self.failed('local', null, ExSIP_C.causes.WEBRTC_ERROR);
    failure();
  }, options);

  // if (mediaStream) {
  //   userMediaSucceeded(mediaStream);
  // } else {
  //   this.getUserMedia(
  //     mediaConstraints,
  //     userMediaSucceeded,
  //     userMediaFailed
  //   );
  // }
};

/**
 * Send Re-INVITE
 */
RTCSession.prototype.sendReinvite = function(options) {
  options = options || {};

  var
    self = this,
    extraHeaders = options.extraHeaders || [],
    eventHandlers = options.eventHandlers || {},
    mangle = options.mangle || null;

  if (eventHandlers.succeeded) {
    this.reinviteSucceeded = eventHandlers.succeeded;
  } else {
    this.reinviteSucceeded = function() {};
  }
  if (eventHandlers.failed) {
    this.reinviteFailed = eventHandlers.failed;
  } else {
    this.reinviteFailed = function() {};
  }

  extraHeaders.push('Contact: ' + this.contact);
  extraHeaders.push('Content-Type: application/sdp');

  this.receiveResponse = this.receiveReinviteResponse;

  this.rtcMediaHandler.createOffer(
    function(body) {
      if (mangle) {
        body = mangle(body);
      }

      self.dialog.sendRequest(self, ExSIP_C.INVITE, {
        extraHeaders: extraHeaders,
        body: body
      });
    },
    function() {
      if (self.isReadyToReinvite()) {
        self.onReadyToReinvite();
      }
      self.reinviteFailed();
    }
  );
};


/**
 * Reception of Response for in-dialog INVITE
 */
RTCSession.prototype.receiveReinviteResponse = function(response) {
  var
    self = this,
    contentType = response.getHeader('Content-Type');

  if (this.status === C.STATUS_TERMINATED) {
    return;
  }

  switch (true) {
    case /^1[0-9]{2}$/.test(response.status_code):
      break;
    case /^2[0-9]{2}$/.test(response.status_code):
      if(this.status !== C.STATUS_CONFIRMED) {
        this.setStatus(C.STATUS_CONFIRMED);
        this.sendRequest(ExSIP_C.ACK);

        if (!response.body) {
          this.reinviteFailed();
          break;
        } else if (contentType !== 'application/sdp') {
          this.reinviteFailed();
          break;
        }

        this.rtcMediaHandler.onMessage(
          'answer',
          response.body,
          /*
           * onSuccess
           * SDP Answer fits with Offer.
           */
          function() {
            if (self.reinviteSucceeded) {
              self.reinviteSucceeded();
            }
          },
          /*
           * onFailure
           * SDP Answer does not fit the Offer.
           */
          function() {
            if (self.reinviteFailed) {
              self.reinviteFailed();
            }
          }
        );

      }
      break;
    default:
      if (this.reinviteFailed) {
        this.reinviteFailed();
      }
  }
};



RTCSession.prototype.acceptAndTerminate = function(response, status_code, reason_phrase) {
  var extraHeaders = [];

  if (status_code) {
    reason_phrase = reason_phrase || ExSIP_C.REASON_PHRASE[status_code] || '';
    extraHeaders.push('Reason: SIP ;cause=' + status_code + '; text="' + reason_phrase + '"');
  }

  // An error on dialog creation will fire 'failed' event
  if (this.dialog || this.createDialog(response, 'UAC')) {
    this.sendRequest(ExSIP_C.ACK);
    this.sendBye();
    // this.sendRequest(ExSIP_C.BYE, {
    //   extraHeaders: extraHeaders
    // });
  }

  // Update session status.
  this.setStatus(C.STATUS_TERMINATED);
};


RTCSession.prototype.toogleMuteAudio = function(mute) {
  var streamIdx, trackIdx, tracks,
    localStreams = this.getLocalStreams();

  for (streamIdx in localStreams) {
    tracks = localStreams[streamIdx].getAudioTracks();
    for (trackIdx in tracks) {
      tracks[trackIdx].enabled = !mute;
    }
  }
};

RTCSession.prototype.toogleMuteVideo = function(mute) {
  var streamIdx, trackIdx, tracks,
    localStreams = this.getLocalStreams();

  for (streamIdx in localStreams) {
    tracks = localStreams[streamIdx].getVideoTracks();
    for (trackIdx in tracks) {
      tracks[trackIdx].enabled = !mute;
    }
  }
};

/**
 * Session Callbacks
 */

RTCSession.prototype.onTransportError = function() {
  if (this.status !== C.STATUS_TERMINATED) {
    if (this.status === C.STATUS_CONFIRMED) {
      this.ended('system', null, ExSIP_C.causes.CONNECTION_ERROR);
    } else {
      this.failed('system', null, ExSIP_C.causes.CONNECTION_ERROR);
    }
  }
};

/**
 * Callback to be called from UA instance when RequestTimeout occurs
 * @private
 */
RTCSession.prototype.onRequestTimeout = function() {
  if (this.status !== C.STATUS_TERMINATED) {
    if (this.status === C.STATUS_CONFIRMED) {
      this.ended('system', null, ExSIP_C.causes.REQUEST_TIMEOUT);
    } else {
      this.ua.reconnect();
      this.failed('system', null, ExSIP_C.causes.CONNECTION_ERROR);
    }
  }
};

RTCSession.prototype.onDialogError = function(response) {
  if (this.status !== C.STATUS_TERMINATED) {
    if (this.status === C.STATUS_CONFIRMED) {
      this.ended('remote', response, ExSIP_C.causes.DIALOG_ERROR);
    } else {
      this.failed('remote', response, ExSIP_C.causes.DIALOG_ERROR);
    }
  }
};

/**
 * Internal Callbacks
 */

RTCSession.prototype.newRTCSession = function(originator, request) {
  var session = this,
    event_name = 'newRTCSession';

  if (originator === 'remote') {
    session.direction = 'incoming';
    session.local_identity = request.to;
    session.remote_identity = request.from;
  } else if (originator === 'local') {
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

RTCSession.prototype.connecting = function(request) {
  var session = this,
    event_name = 'connecting';

  session.emit(event_name, session, {
    request: request
  });
};

RTCSession.prototype.progress = function(originator, response) {
  var session = this,
    event_name = 'progress';

  session.emit(event_name, session, {
    originator: originator,
    response: response || null
  });
};

RTCSession.prototype.accepted = function(originator, message) {
  var session = this,
    event_name = 'accepted';

  session.start_time = new Date();

  session.emit(event_name, session, {
    originator: originator,
    response: message || null
  });
};

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

RTCSession.prototype.confirmed = function(originator, ack) {
  var session = this,
    event_name = 'confirmed';

  this.is_confirmed = true;

  session.emit(event_name, session, {
    originator: originator,
    ack: ack || null
  });
};

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

RTCSession.prototype.failed = function(originator, message, cause) {
  var session = this,
    event_name = 'failed';

  session.close();
  session.emit(event_name, session, {
    originator: originator,
    message: message || null,
    cause: cause
  });
};

RTCSession.prototype.onhold = function(originator) {
  if (originator === 'local') {
    this.local_hold = true;
  } else {
    this.remote_hold = true;
  }

  this.emit('hold', this, {
    originator: originator
  });
};

RTCSession.prototype.onunhold = function(originator) {
  if (originator === 'local') {
    this.local_hold = false;
  } else {
    this.remote_hold = false;
  }

  this.emit('unhold', this, {
    originator: originator
  });
};

RTCSession.prototype.onmute = function(options) {
  this.emit('muted', this, {
    audio: options.audio,
    video: options.video
  });
};

RTCSession.prototype.onunmute = function(options) {
  this.emit('unmuted', this, {
    audio: options.audio,
    video: options.video
  });
};

RTCSession.prototype.onReadyToReinvite = function() {
  var action = (this.pending_actions.length() > 0) ? this.pending_actions.shift() : null;

  if (!action) {
    return;
  }

  if (action.name === 'hold') {
    this.hold();
  } else if (action.name === 'unhold') {
    this.unhold();
  }
};