module.exports = RTCMediaHandler;

/**
 * Dependencies.
 */
var ExSIP_C = require('../Constants');
var WebRTC = require('../WebRTC');
var Utils = require('../Utils');
var DataChannel = require('./DataChannel');


/* RTCMediaHandler
 * -class PeerConnection helper Class.
 * -param {RTCSession} session
 * -param {Object} [contraints]
 */
function RTCMediaHandler(session, constraints) {
  constraints = constraints || {};
  this.logger = session.ua.getLogger('ExSIP.rtcsession.rtcmediahandler', session.id);

  this.logger.log('constraints : '+Utils.toString(constraints), session.ua);
  this.session = session;
  this.localMedia = null;
  this.peerConnection = null;
  this.createOfferConstraints = null;
  this.dataChannel = null;
  this.ready = true;

  this.init(constraints);
}


RTCMediaHandler.prototype = {
  isReady: function() {
    return this.ready;
  },

  copy: function(rtcMediaHandler) {
    var self = this;

    var streamAdditionSucceeded = function() {
    };
    var streamAdditionFailed = function() {
      if (self.session.status === ExSIP_C.STATUS_TERMINATED) {
        return;
      }

      self.session.failed('local', null, ExSIP_C.causes.WEBRTC_ERROR);
    };

    var description = new WebRTC.RTCSessionDescription({type: this.getSetLocalDescriptionType(), sdp: rtcMediaHandler.peerConnection.localDescription.sdp});
    this.setLocalDescription(description);

    this.addStream(rtcMediaHandler.localMedia, streamAdditionSucceeded, streamAdditionFailed);
  },

  connect: function(stream, connectSucceeded, connectFailed, options) {
    var self = this;
    options = options || {};
    this.logger.log('connect with isAnswer : '+options.isAnswer+" and remoteSdp : "+options.remoteSdp, self.session.ua);

    var setLocalDescription = function(callback) {
      self.setLocalDescription(options.localDescription, callback || connectSucceeded, connectFailed);
    };

    var setRemoteDescription = function(successCallback) {
      self.onMessage(
        self.getSetRemoteLocationType(),
        options.remoteSdp,
        successCallback || connectSucceeded, function(e){
          self.logger.error("setRemoteDescription failed");
          self.logger.error(Utils.toString(e));
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
      }, connectFailed, options.createOfferConstraints, options);
    };

    var streamAdditionSucceeded = function() {
      var hasRemoteSdp = options.remoteSdp && options.remoteSdp.length > 0;
      var isRemote = options.isAnswer && hasRemoteSdp;
      self.logger.log("isRemote : "+isRemote+", isAnswer : "+options.isAnswer+", hasRemoteSdp :"+hasRemoteSdp, self.session.ua);
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
      if (self.session.status === ExSIP_C.STATUS_TERMINATED) {
        return;
      }

      self.session.failed('local', null, ExSIP_C.causes.WEBRTC_ERROR);
      connectFailed();
    };

    this.addStream(
      stream,
      streamAdditionSucceeded,
      streamAdditionFailed
    );
  },

  createOffer: function(onSuccess, onFailure, constraints, options) {
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

    this.createOfferConstraints = constraints;
    this.logger.log("createOffer with createOfferConstraints : "+Utils.toString(this.createOfferConstraints), this.session.ua);
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
        self.logger.error('unable to create offer');
        self.logger.error(e);
        onFailure(e);
      },
      constraints
    );
  },

  getRemoteDescriptionSdp: function() {
    return this.peerConnection.remoteDescription ? this.peerConnection.remoteDescription.sdp : undefined;
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
    this.logger.log("createAnswer with constraints : "+constraints, this.session.ua);
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
        self.logger.error('unable to create answer');
        self.logger.error(e);
        onFailure(e);
      },
      constraints
    );
  },

  setLocalDescription: function(sessionDescription, onSuccess, onFailure) {
    var self = this;

    this.logger.log('peerConnection.setLocalDescription : '+Utils.toString(sessionDescription));
    this.peerConnection.setLocalDescription(
      sessionDescription,
      onSuccess,
      function(e) {
        self.logger.error('unable to set local description');
        self.logger.error(e);
        onFailure(e);
      }
    );
  },

  addStream: function(stream, onSuccess, onFailure, constraints) {
    try {
      this.logger.log("add stream : "+Utils.toString(stream), this.session.ua);
      this.peerConnection.addStream(stream, constraints);
    } catch(e) {
      this.logger.error('error adding stream');
      this.logger.error(e);
      onFailure();
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
      this.logger.log("remove stream : "+Utils.toString(stream), this.session.ua);
      this.peerConnection.removeStream(stream);
    } catch(e) {
      this.logger.error('error removing stream');
      this.logger.error(e);
      return false;
    }

    return true;
  },

  getSetLocalDescriptionType: function(){
    var state = this.peerConnection.signalingState;
    if(state === 'stable' || state === 'have-local-offer') {
      return "offer";
    } else if(state === 'have-remote-offer' || state === 'have-local-pr-answer'){
      return "answer";
    } else {
      this.logger.error("state "+state +" not implemented - returning offer");
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
      this.logger.error("state "+state +" not implemented - returning offer");
      return "offer";
    }
  },

  sendData: function(data) {
    if(this.dataChannel) {
      this.dataChannel.send(data);
    } else {
      this.logger.error('datachannel is not enabled - see UA.configuration.enable_datachannel');
    }
  },

  /**
  * peerConnection creation.
  */
  init: function(options) {
    options = options || {};

    var idx, length, server,
      self = this,
      servers = [],
      constraints = options.constraints || {},
      stun_servers = options.stun_servers  || null,
      turn_servers = options.turn_servers || null,
      config = this.session.ua.configuration;

    if (!stun_servers) {
      stun_servers = config.stun_servers;
    }

    if (!turn_servers) {
      turn_servers = config.turn_servers;
    }

    /* Change 'url' to 'urls' whenever this issue is solved:
     * https://code.google.com/p/webrtc/issues/detail?id=2096
     */

    if (stun_servers.length > 0) {
      servers.push({'url': stun_servers});
    }

    length = turn_servers.length;
    for (idx = 0; idx < length; idx++) {
      server = turn_servers[idx];
      servers.push({
        'url': server.urls,
        'username': server.username,
        'credential': server.credential
      });
    }

    this.peerConnection = new WebRTC.RTCPeerConnection({'iceServers': servers}, constraints);

    this.peerConnection.onaddstream = function(e) {
      self.logger.debug('pc.onaddstream : '+ e.stream.id);
    };

    this.peerConnection.onpeeridentity = function(e) { 
      self.logger.debug('pc.onpeeridentity : '+Utils.toString(e));
    };

    this.peerConnection.onidpassertionerror = function(e) { 
      self.logger.debug('pc.onidpassertionerror : '+Utils.toString(e));
    };

    this.peerConnection.onidpvalidationerror = function(e) { 
      self.logger.debug('pc.onidpvalidationerror : '+Utils.toString(e));
    };
    
    this.peerConnection.onremovestream = function(e) {
      self.logger.debug('pc.onremovestream : '+ e.stream.id);
    };

    this.peerConnection.onnegotiationneeded = function(e) {
      self.logger.debug('pc.onnegotiationneeded : '+ Utils.toString(e));
    };

    this.peerConnection.onsignalingstatechange = function(e) {
      self.logger.debug('pc.onsignalingstatechange : '+ Utils.toString(e));
    };

    this.peerConnection.onicecandidate = function(e) {
      self.logger.debug('pc.onicecandidate : '+ Utils.toString(e));
      if (e.candidate && self.session.ua.rtcMediaHandlerOptions.enableICE) {
        self.logger.debug('ICE candidate received: '+ e.candidate.candidate);
      } else if (self.onIceCompleted !== undefined) {
        self.logger.log('onIceCompleted with ready : '+ self.ready+" and candidate : "+Utils.toString(e.candidate), self.session.ua);
        if(!self.ready && e.candidate) {
          self.onIceCompleted();
        }      
      }
    };

    this.peerConnection.oniceconnectionstatechange = function() {
      self.logger.debug('pc.oniceconnectionstatechange : '+ this.iceConnectionState);

      if (this.iceConnectionState === 'connected') {
        self.session.iceConnected();
      } else if (this.iceConnectionState === 'completed') {
        self.session.iceCompleted();
      } else if (this.iceConnectionState === 'closed') {
        self.session.iceClosed();
      } else if (this.iceConnectionState === 'failed') {
        self.session.terminate({
          cause: ExSIP_C.causes.RTP_TIMEOUT,
          status_code: 200,
          reason_phrase: ExSIP_C.causes.RTP_TIMEOUT
        });
      }
    };


    this.peerConnection.onstatechange = function() {
      self.logger.debug('pc.onstatechange : '+ this.readyState);
    };

    if(self.session.ua.configuration.enable_datachannel) {
      this.dataChannel = new DataChannel(this.session, this.peerConnection);
    }
  },

  close: function(stopLocalMedia) {
    this.logger.debug('closing PeerConnection');
    if(this.peerConnection) {
      if(this.peerConnection.signalingState !== 'closed') {
        this.logger.log('closing PeerConnection', this.session.ua);
        this.peerConnection.close();
      }

      if(stopLocalMedia) {
        if(this.localMedia) {
          this.logger.log('stopping local media '+Utils.toString(this.localMedia), this.session.ua);
          (this.localMedia.getTracks() || []).forEach(function(track){
            track.stop();
          });
        }
      }
    }
  },

  /**
  * -param {Object} mediaConstraints
  * -param {Function} onSuccess
  * -param {Function} onFailure
  */
  getUserMedia: function(onSuccess, onFailure, constraints) {
    var self = this;

    this.logger.debug('requesting access to local media : '+JSON.stringify(constraints));

    WebRTC.getUserMedia(constraints,
      function(stream) {
        self.logger.debug('got local media stream');
        self.localMedia = stream;
        onSuccess(stream);
      },
      function(e) {
        self.logger.error('unable to get user media');
        self.logger.error(e);
        onFailure();
      }
    );
  },

  /**
  * Message reception.
  * -param {String} type
  * -param {String} sdp
  * -param {Function} onSuccess
  * -param {Function} onFailure
  */
  onMessage: function(type, body, onSuccess, onFailure) {
    var self = this;
    var description = new WebRTC.RTCSessionDescription({type: type, sdp:body});
    if(this.session.ua.rtcMediaHandlerOptions.videoBandwidth) {
      description.setVideoBandwidth(this.session.ua.rtcMediaHandlerOptions.videoBandwidth);
      this.logger.log("Modifying SDP with videoBandwidth : "+this.session.ua.rtcMediaHandlerOptions.videoBandwidth);
    }

    if(this.peerConnection) {
      if(!description.sdp) {
        this.logger.log('empty sdp on setRemoteDescription - calling success');
        onSuccess();
        return;
      }

      var unsupportedMedia = description.removeUnsupportedMedia();
      if(unsupportedMedia) {
        this.logger.log('removed unsupported media : '+unsupportedMedia);
        this.peerConnection.remoteUnsupportedMedia = unsupportedMedia;
      }

      this.logger.log('peerConnection.setRemoteDescription : description : '+Utils.toString(description));
      this.logger.log('peerConnection.setRemoteDescription for type '+description.type+' : '+description.sdp);
      this.peerConnection.setRemoteDescription(
        description,
        onSuccess,
        function(e){
          self.logger.log("----------setRemoteDescription with error : "+JSON.stringify(e));
          onFailure(e);
        }
      );
    }
  }
};