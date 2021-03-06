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

var RTCMediaHandler = function(session) {
  this.session = session;
  this.localMedia = null;
  this.peerConnection = null;
  this.createOfferConstraints = null;
  this.dataChannel = null;
  this.ready = true;
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
    logger.log('connect with isAnswer : '+options.isAnswer+" and remoteSdp : "+options.remoteSdp, self.session.ua);

    var setLocalDescription = function(callback) {
      self.setLocalDescription(options.localDescription, callback || connectSucceeded, connectFailed);
    };

    var setRemoteDescription = function(successCallback) {
      self.onMessage(
        options.remoteSdp,
        successCallback || connectSucceeded, function(e){
          logger.error("setRemoteDescription failed");
          logger.error(ExSIP.Utils.toString(e));
          connectFailed();
        }
      );
    };

    var createAnswer = function(){
      self.createAnswer(connectSucceeded, connectFailed, options.mediaConstraints);
    };

    var createOffer = function(){
      self.createOffer(function(sdp){
        if(options.remoteSdp && options.remoteSdp !== "") {
          setRemoteDescription(connectSucceeded);
        } else {
          connectSucceeded(sdp);
        }
      }, connectFailed, options);
    };

    var streamAdditionSucceeded = function() {
      var hasRemoteSdp = options.remoteSdp && options.remoteSdp.length > 0;
      var isRemote = options.isAnswer && hasRemoteSdp;
      logger.log("isRemote : "+isRemote+", isAnswer : "+options.isAnswer+", hasRemoteSdp :"+hasRemoteSdp, self.session.ua);
      if(isRemote) {
        if(options.localDescription) {
          setRemoteDescription(setLocalDescription);
        } else {
          setRemoteDescription(createAnswer);
        }
      } else {
        if(options.remoteSdp) {
          setLocalDescription(setRemoteDescription);
        } else {
          createOffer();
        }
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

    function onSetLocalDescriptionSuccess() {
      if (self.peerConnection.iceGatheringState === 'complete' && (self.peerConnection.iceConnectionState === 'connected' || self.peerConnection.iceConnectionState === 'completed') ||
          !self.peerConnection.localDescription.isActive()) {
        self.ready = true;
        onSuccess(self.peerConnection.localDescription.sdp);
      } else {
        self.onIceCompleted = function() {
          self.onIceCompleted = undefined;
          self.ready = true;
          onSuccess(self.peerConnection.localDescription.sdp);
        };
      }
    }

    this.ready = false;

    this.createOfferConstraints = options.createOfferConstraints;
    logger.log("createOffer with createOfferConstraints : "+ExSIP.Utils.toString(this.createOfferConstraints), this.session.ua);
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
          onSetLocalDescriptionSuccess,
          function(e) {
            self.ready = true;
            onFailure(e);
          }
        );
      },
      function(e) {
        self.ready = true;
        logger.error('unable to create offer');
        logger.error(e);
        onFailure(e);
      },
      this.createOfferConstraints);
  },

  createAnswer: function(onSuccess, onFailure, constraints) {
    var self = this;

    function onSetLocalDescriptionSuccess() {
      if (self.peerConnection.iceGatheringState === 'complete' && (self.peerConnection.iceConnectionState === 'connected' || self.peerConnection.iceConnectionState === 'completed') ||
          !self.peerConnection.localDescription.isActive()) {
        self.ready = true;
        onSuccess(self.peerConnection.localDescription.sdp);
      } else {
        self.onIceCompleted = function() {
          self.onIceCompleted = undefined;
          self.ready = true;
          onSuccess(self.peerConnection.localDescription.sdp);
        };
      }
    }

    this.ready = false;

    constraints = constraints ||  this.createOfferConstraints;
    logger.log("createAnswer with constraints : "+constraints, this.session.ua);
    this.peerConnection.createAnswer(
      function(sessionDescription){
        self.setLocalDescription(
          sessionDescription,
          onSetLocalDescriptionSuccess,
          function(e) {
            self.ready = true;
            onFailure(e);
          }
        );
      },
      function(e) {
        self.ready = true;
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
    constraints = constraints || {};
    logger.log('constraints : '+ExSIP.Utils.toString(constraints), this.session.ua);

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

    var initPeerConnection = function(cert) {
      logger.log("init peer connection : "+ExSIP.Utils.toString(cert), self.session.ua);
      self.peerConnection = new ExSIP.WebRTC.RTCPeerConnection({'iceServers': servers, certificates: [cert]}, constraints);

      self.peerConnection.onaddstream = function(e) {
        logger.log('stream added: '+ e.stream.id, self.session.ua);
      };

      self.peerConnection.onremovestream = function(e) {
        logger.log('stream removed: '+ e.stream.id, self.session.ua);
      };

      self.peerConnection.oniceconnectionstatechange = function() {
        logger.log('oniceconnectionstatechange : '+ this.iceConnectionState, self.session.ua);
        if(this.iceConnectionState === 'connected') {
          self.session.iceConnected();
        }
        else if(this.iceConnectionState === 'completed') {
          self.session.iceCompleted();
        }
        else if(this.iceConnectionState === 'closed') {
          self.session.iceClosed();
        }
      };

      self.peerConnection.onnegotiationneeded = function(e) {
        logger.log('onnegotiationneeded : '+ e.type, self.session.ua);
      };

      self.peerConnection.onsignalingstatechange = function() {
        logger.log('onsignalingstatechange : '+ this.signalingState, self.session.ua);
      };

      self.peerConnection.onicecandidate = function(e) {
        if (e.candidate && self.session.ua.rtcMediaHandlerOptions["enableICE"]) {
          logger.log('ICE candidate received: '+ e.candidate.candidate, self.session.ua);
        } else if (self.onIceCompleted !== undefined) {
          logger.log('onIceCompleted with ready : '+ self.ready+" and candidate : "+ExSIP.Utils.toString(e.candidate), self.session.ua);
          if(!self.ready && e.candidate) {
            self.onIceCompleted();
          }      
        }
      };

      // To be deprecated as per https://code.google.com/p/webrtc/issues/detail?id=1393
      self.peerConnection.ongatheringchange = function(e) {
        var state = (typeof e === 'string' || e instanceof String) ? e : e.currentTarget.iceGatheringState;
        logger.log('ongatheringchange for state : '+ state+'"', self.session.ua);
        if (state === 'complete' && this.iceConnectionState !== 'closed' && self.onIceCompleted !== undefined) {
          self.onIceCompleted();
        }
      };

      self.peerConnection.onicechange = function() {
        logger.log('ICE connection state changed to "'+ this.iceConnectionState +'"', self.session.ua);
      };

      self.peerConnection.onconnectionstatechange = function() {
        logger.log('PeerConnection state changed to "'+ this.connectionState +'"', self.session.ua);
	if (this.connectionState === 'connected' && self.session.dtmf.queuedDTMFs.length > 0) {
          logger.log('Processing queued DTMF tones', self.session.ua);
          self.session.dtmf.processQueuedDTMFs();
        }
      };

      if(self.session.ua.configuration.enable_datachannel) {
        self.dataChannel = new DataChannel(self.session, self.peerConnection);
      }
    };

    logger.log("servers : "+ExSIP.Utils.toString(servers), this.session.ua);
    var certificate = self.session.ua.configuration.certificate || 'RSA';
    if(certificate === 'ECDSA') {
      certificate = {
        name: 'ECDSA',
        namedCurve: 'P-256'
      };
    } else if(certificate === 'RSA') {
      certificate = { 
        name: "RSASSA-PKCS1-v1_5", 
        modulusLength: 2048, 
        publicExponent: new Uint8Array([1, 0, 1]), 
        hash: "SHA-256" 
      };
    } 
    logger.log("certificate : "+ExSIP.Utils.toString(certificate), this.session.ua);
    return ExSIP.WebRTC.RTCPeerConnection.generateCertificate(certificate).then(initPeerConnection);
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

  sendData: function(data) {
    if(this.dataChannel) {
      this.dataChannel.send(data);
    } else {
      logger.error('datachannel is not enabled - see UA.configuration.enable_datachannel');
    }
  },

  close: function(stopLocalMedia) {
    logger.log('close with stopLocalMedia '+stopLocalMedia, this.session.ua);
    if(this.peerConnection) {
      if(this.peerConnection.signalingState !== 'closed') {
        logger.log('closing PeerConnection', this.session.ua);
        this.peerConnection.close();
      }

      if(stopLocalMedia) {
        if(this.localMedia) {
          logger.log('stopping local media '+ExSIP.Utils.toString(this.localMedia), this.session.ua);
          (this.localMedia.getTracks() || []).forEach(function(track){
            track.stop();
          });
        }
      }
    }
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
      if(this.peerConnection.remoteDescription) {
        logger.log('remote description already exists', this.session.ua);
        onSuccess();
        return;
      }

      if(!description.sdp) {
        logger.log('empty sdp on setRemoteDescription - calling success', this.session.ua);
        onSuccess();
        return;
      }

      var unsupportedMedia = description.removeUnsupportedMedia();
      if(unsupportedMedia) {
        logger.log('removed unsupported media : '+unsupportedMedia);
        this.peerConnection.remoteUnsupportedMedia = unsupportedMedia;
      }
      logger.log('peerConnection.setRemoteDescription for type '+description.type+' : '+description.sdp, this.session.ua);
      this.peerConnection.setRemoteDescription(
        description,
        onSuccess,
        function(e){
          console.log("----------setRemoteDescription with error : "+JSON.stringify(e));
          onFailure(e);
        }
      );
    }
  }
};

// Return since it will be assigned to a variable.
return RTCMediaHandler;
}(ExSIP));
