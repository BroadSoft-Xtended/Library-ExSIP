/**
 * @fileoverview RTCMediaHandler
 */

/* RTCMediaHandler
 * @class PeerConnection helper Class.
 * @param {ExSIP.RTCSession} session
 * @param {Object} [contraints]
 */
(function(ExSIP){

  var logger = new ExSIP.Logger(ExSIP.name +' | '+ 'RTCMediaHandler');

var RTCMediaHandler = function(session, constraints) {
  constraints = constraints || {};

  this.session = session;
  this.localMedia = null;
  this.peerConnection = null;
  this.createOfferConstraints = null;

  this.init(constraints);
};

RTCMediaHandler.prototype = {

  copy: function(rtcMediaHandler) {
    var self = this;

    var streamAdditionSucceeded = function() {
    };
    var streamAdditionFailed = function() {
      if (self.session.status === C.STATUS_TERMINATED) {
        return;
      }

      self.session.failed('local', null, ExSIP.C.causes.WEBRTC_ERROR);
    };

    var description = new ExSIP.WebRTC.RTCSessionDescription({type: this.getSetLocalDescriptionType(), sdp: rtcMediaHandler.peerConnection.localDescription.sdp});
    this.setLocalDescription(description);

    this.addStream(rtcMediaHandler.localMedia, streamAdditionSucceeded, streamAdditionFailed);
  },

  connect: function(stream, connectSucceeded, connectFailed, options) {
    var self = this;
    options = options || {};
    logger.log('connect with remoteSdp : '+options.remoteSdp, self.session.ua);

    var setLocalDescription = function() {
      self.setLocalDescription(options.localDescription, connectSucceeded, connectFailed);
    };

    var setRemoteDescription = function(successCallback) {
      self.onMessage(
        options.remoteSdp,
        successCallback, function(e){
          logger.error("setRemoteDescription failed");
          logger.error(e);
          connectFailed();
        }
      );
    };

    var createAnswer = function(){
      self.createAnswer(connectSucceeded, connectFailed, options.mediaConstraints);
    };

    var createOffer = function(){
      self.createOffer(function(){
        if(options.remoteSdp && options.remoteSdp !== "") {
          setRemoteDescription(connectSucceeded);
        } else {
          connectSucceeded();
        }
      }, connectFailed, options);
    };

    var streamAdditionSucceeded = function() {
      var hasRemoteSdp = options.remoteSdp && options.remoteSdp.length > 0;
      logger.log("hasRemoteSdp : "+hasRemoteSdp, self.session.ua);
      if(hasRemoteSdp && options.localDescription) {
        setRemoteDescription(setLocalDescription);
      } else if(hasRemoteSdp){
        setRemoteDescription(createAnswer);
      } else {
        createOffer();
      }
    };

    var streamAdditionFailed = function() {
      if (self.session.status === C.STATUS_TERMINATED) {
        return;
      }

      self.session.failed('local', null, ExSIP.C.causes.WEBRTC_ERROR);
      connectFailed();
    };

    this.addStream(
      stream,
      streamAdditionSucceeded,
      streamAdditionFailed
    );
  },

  createOffer: function(onSuccess, onFailure, options) {
    var self = this;
    options = options || {};

    this.onIceCompleted = function() {
      logger.log('createOffer : onIceCompleted', self.session.ua);
      if (self.peerConnection.localDescription) {
        onSuccess(self.peerConnection.localDescription.sdp);
      }
    };

    this.createOfferConstraints = options.createOfferConstraints;
    logger.log("createOffer with createOfferConstraints : "+this.createOfferConstraints, this.session.ua);
    this.peerConnection.createOffer(
      function(sessionDescription){
        if(options.videoMode) {
          sessionDescription.setVideoMode(options.videoMode);
        }
        if(options.videoPort) {
          sessionDescription.setVideoPort(options.videoPort);
        }
        if(options.audioMode) {
          sessionDescription.setAudioMode(options.audioMode);
        }
        if(options.audioPort) {
          sessionDescription.setAudioPort(options.audioPort);
        }
        self.setLocalDescription(
          sessionDescription,
          function(){
            if(!sessionDescription.isActive() || window.mozRTCPeerConnection) {
              onSuccess(self.peerConnection.localDescription.sdp);
            }
          },
          onFailure
        );
      },
      function(e) {
        logger.error('unable to create offer');
        logger.error(e);
        onFailure(e);
      },
      this.createOfferConstraints);
  },

  createAnswer: function(onSuccess, onFailure, constraints) {
    var self = this;

    this.onIceCompleted = function() {
      logger.log('createAnswer : onIceCompleted', self.session.ua);
      onSuccess(self.peerConnection.localDescription.sdp);
    };

    this.peerConnection.createAnswer(
      function(sessionDescription){
        self.setLocalDescription(
          sessionDescription,
          function(){
            if(!sessionDescription.isActive()) {
              onSuccess(self.peerConnection.localDescription.sdp);
            }
          },
          onFailure
        );
      },
      function(e) {
        logger.error('unable to create answer');
        logger.error(e);
        onFailure(e);
      },
      constraints);
  },

  getRemoteDescriptionSdp: function() {
    return this.peerConnection.remoteDescription ? this.peerConnection.remoteDescription.sdp : undefined;
  },

  setLocalDescription: function(sessionDescription, onSuccess, onFailure) {
    var self = this;
    sessionDescription.type = this.getSetLocalDescriptionType();
    logger.log('peerConnection.setLocalDescription with type '+sessionDescription.type +' : '+sessionDescription.sdp, this.session.ua);
    this.peerConnection.setLocalDescription(
      sessionDescription,
      function(){
        logger.log('setLocalDescription successful', self.session.ua);
        if(onSuccess) {
          onSuccess();
        }
      },
      function(e) {
        logger.error('unable to set local description', self.session.ua);
        logger.error(e);
        onFailure();
      }
    );
  },

  addStream: function(stream, onSuccess, onFailure, constraints) {
    try {
      logger.log("add stream : "+ExSIP.Utils.toString(stream), this.session.ua);
      this.peerConnection.addStream(stream, constraints);
    } catch(e) {
      logger.error('error adding stream');
      logger.error(e);
      onFailure(e);
      return;
    }

    onSuccess();
  },

  clearStreams: function() {
    if(!this.localMedia) {
      return;
    }
    if(this.removeStream(this.localMedia)) {
      this.localMedia = null;
    }
    return;
  },

  removeStream: function(stream) {
    try {
      logger.log("remove stream : "+ExSIP.Utils.toString(stream), this.session.ua);
      this.peerConnection.removeStream(stream);
    } catch(e) {
      logger.error('error removing stream');
      logger.error(e);
      return false;
    }

    return true;
  },

  /**
  * peerConnection creation.
  * @param {Function} onSuccess Fired when there are no more ICE candidates
  */
  init: function(constraints) {
    var idx, length, server, scheme, url,
      self = this,
      servers = [],
      config = this.session.ua.configuration;

    length = config.stun_servers.length;
    for (idx = 0; idx < length; idx++) {
      server = config.stun_servers[idx];
      servers.push({'url': server});
    }

    length = config.turn_servers.length;
    for (idx = 0; idx < length; idx++) {
      server = config.turn_servers[idx];
      url = server.server;
      scheme = url.substr(0, url.indexOf(':'));
      servers.push({
        'url': scheme + ':' + server.username + '@' + url.substr(scheme.length+1),
        'credential': server.password
      });
    }

    this.peerConnection = new ExSIP.WebRTC.RTCPeerConnection({'iceServers': servers}, constraints);

    this.peerConnection.onaddstream = function(e) {
      logger.log('stream added: '+ e.stream.id, self.session.ua);
    };

    this.peerConnection.onremovestream = function(e) {
      logger.log('stream removed: '+ e.stream.id, self.session.ua);
    };

    this.peerConnection.oniceconnectionstatechange = function(e) {
      logger.log('oniceconnectionstatechange : '+ e.iceConnectionState, self.session.ua);
    };

    this.peerConnection.onnegotiationneeded = function(e) {
      logger.log('onnegotiationneeded : '+ e.type, self.session.ua);
    };

    this.peerConnection.onsignalingstatechange = function() {
      logger.log('onsignalingstatechange : '+ this.signalingState, self.session.ua);
    };

    this.peerConnection.ondatachannel = function(e) {
      logger.log('ondatachannel : '+ ExSIP.Utils.toString(e), self.session.ua);
    };

    this.setOnIceCandidateCallback();

    // To be deprecated as per https://code.google.com/p/webrtc/issues/detail?id=1393
    this.peerConnection.ongatheringchange = function(e) {
      var state = (typeof e === 'string' || e instanceof String) ? e : e.currentTarget.iceGatheringState;
      logger.log('ongatheringchange for state : '+ state+'"', self.session.ua);
      if (state === 'complete' && this.iceConnectionState !== 'closed' && self.onIceCompleted !== undefined) {
        self.onIceCompleted();
      }
    };

    this.peerConnection.onicechange = function() {
      logger.log('ICE connection state changed to "'+ this.iceConnectionState +'"', self.session.ua);
    };

    this.peerConnection.onstatechange = function() {
      logger.log('PeerConnection state changed to "'+ this.readyState +'"', self.session.ua);
    };
  },

  getSetLocalDescriptionType: function(){
    var state = this.peerConnection.signalingState;
    if(state === 'stable' || state === 'have-local-offer') {
      return "offer";
    } else if(state === 'have-remote-offer' || state === 'have-local-pr-answer'){
      return "answer";
    } else {
      logger.error("state "+state +" not implemented - returning offer");
      return "offer";
    }
  },

  getSetRemoteLocationType: function(){
    var state = this.peerConnection.signalingState;
    if(state === 'stable' || state === 'have-remote-offer') {
      return "offer";
    } else if(state === 'have-local-offer' || state === 'have-remote-pr-answer'){
      return "answer";
    } else {
      logger.error("state "+state +" not implemented - returning offer");
      return "offer";
    }
  },

  setOnIceCandidateCallback: function(){
    var sent = false, self = this;
    this.peerConnection.onicecandidate = function(e) {
      if (e.candidate && !self.session.ua.rtcMediaHandlerOptions["disableICE"]) {
        logger.log('ICE candidate received: '+ e.candidate.candidate, self.session.ua);
      } else if (self.onIceCompleted !== undefined) {
//        if(e.candidate) {
//          self.peerConnection.addIceCandidate(new ExSIP.WebRTC.RTCIceCandidate(e.candidate));
//        }
        logger.log('onIceCompleted with sent : '+ sent+" and candidate : "+ExSIP.Utils.toString(e.candidate), self.session.ua);
//        if(!sent && e.srcElement.iceGatheringState === 'complete') {
        // only trigger if e.candidate is not null
        if(!sent && e.candidate) {
          sent = true;
          self.onIceCompleted();
        }
      }
    };
  },

  getDTMF: function() {
    if(!this.dtmf) {
      this.dtmf = new DTMF(this.session, this.localMedia, this.peerConnection);
    }
    return this.dtmf;
  },


  close: function() {
    logger.log('closing PeerConnection', this.session.ua);
    this.dtmf = null;
    if(this.peerConnection) {
      if(this.peerConnection.signalingState !== 'closed') {
        this.peerConnection.close();
      }

      if(!this.session.ua.reuseLocalMedia()) {
        if(this.localMedia) {
          this.localMedia.stop();
        }
      }
    }
  },

  sendDTMF: function(tones, options) {
    var duration, interToneGap,
      self = this;

    options = options || {};
    duration = options.duration || null;
    interToneGap = options.interToneGap || null;

    if (tones === undefined) {
      throw new TypeError('Not enough arguments');
    }

    // Check Session Status
    if (this.session.status !== C.STATUS_CONFIRMED && this.session.status !== C.STATUS_WAITING_FOR_ACK) {
      throw new ExSIP.Exceptions.InvalidStateError(this.session.status);
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

    var dtmf = self.getDTMF();
    dtmf.send(tones, options);
  },

  /**
  * @param {Object} mediaConstraints
  * @param {Function} onSuccess
  * @param {Function} onFailure
  */
  getUserMedia: function(onSuccess, onFailure, constraints) {
    var self = this;

    logger.log('requesting access to local media', this.session.ua);

    ExSIP.WebRTC.getUserMedia(constraints,
      function(stream) {
        logger.log('got local media stream', self.session.ua);
        self.localMedia = stream;
        onSuccess(stream);
      },
      function(e) {
        logger.error('unable to get user media');
        logger.error(e);
        onFailure(e);
      }
    );
  },

  /**
  * Message reception.
  * @param {String} type
  * @param {String} sdp
  * @param {Function} onSuccess
  * @param {Function} onFailure
  */
  onMessage: function(body, onSuccess, onFailure) {
    var description = new ExSIP.WebRTC.RTCSessionDescription({type: this.getSetRemoteLocationType(), sdp:body});
    if(this.session.ua.rtcMediaHandlerOptions["videoBandwidth"]) {
      description.setVideoBandwidth(this.session.ua.rtcMediaHandlerOptions["videoBandwidth"]);
      logger.log("Modifying SDP with videoBandwidth : "+this.session.ua.rtcMediaHandlerOptions["videoBandwidth"], this.session.ua);
    }

//    description.sdp = "v=0\r\n"+
//      "o=mscore 1384795821 1 IN IP4 204.117.64.113\r\n"+
//    "s=d4q5no0ml0fhj4h685ur\r\n"+
//    "t=0 0\r\n"+
//    "m=audio 44476 RTP/SAVPF 111 126\r\n"+
//    "c=IN IP4 204.117.64.113\r\n"+
//    "a=rtpmap:111 opus/48000/2\r\n"+
//    "a=rtpmap:126 telephone-event/8000\r\n"+
//    "a=fmtp:111 minptime=10\r\n"+
//    "a=rtcp-mux\r\n"+
//    "a=crypto:0 AES_CM_128_HMAC_SHA1_32 inline:iYtsHDIl+1uXQV91p04VNy/PjJk2bQ2H6lqXVlXI\r\n"+
//    "a=ice-ufrag:oHazMhXZ4VvxTk5r\r\n"+
//    "a=ice-pwd:zCO3DbLuyVpPiFodARvjgUa7\r\n"+
//    "a=ssrc:4282715684 cname:qavdWNEl8g4zsfjY\r\n"+
//    "a=candidate:0 1 udp 2113929216 204.117.64.113 44476 typ host\r\n";
//
    if(this.peerConnection) {
      logger.log('peerConnection.setRemoteDescription for type '+description.type+' : '+description.sdp, this.session.ua);
      this.peerConnection.setRemoteDescription(
        description,
        onSuccess,
        onFailure
      );
    }
  }
};

// Return since it will be assigned to a variable.
return RTCMediaHandler;
}(ExSIP));
