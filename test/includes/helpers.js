(function(window) {
var TestExSIP = (function() {
  "use string";
  return {};
}());


TestExSIP.Helpers = {

  DEFAULT_EXSIP_CONFIGURATION_AFTER_START: {
    password: null,
    register_expires: 600,
    register_min_expires: 120,
    register: false,
    connection_recovery_min_interval: 2,
    connection_recovery_max_interval: 30,
    use_preloaded_route: true,
    no_answer_timeout: 60000,
    stun_servers: ['stun:stun.l.google.com:19302'],
    trace_sip: true,
    hack_via_tcp: false,
    hack_ip_in_contact: false,
    uri: 'sip:fakeUA@exsip.net',
    registrar_server: 'sip:registrar.exsip.net:6060;transport=tcp',
    ws_servers: [{'ws_uri':'ws://localhost:12345','sip_uri':'<sip:localhost:12345;transport=ws;lr>','weight':0,'status':0,'scheme':'WS'}],
    display_name: 'Fake UA ð→€ł !!!',
    authorization_user: 'fakeUA'
  },

  FAKE_UA_CONFIGURATION: {
    uri: 'f%61keUA@exsip.net',
    ws_servers:  'ws://localhost:12345',
    display_name: 'Fake UA ð→€ł !!!',
    register: false,
    use_preloaded_route: true,
    registrar_server: 'registrar.exsip.NET:6060;TRansport=TCP',
    max_transport_recovery_attempts: "0",
    trace_sip: true
  },

  sendMsgs: [],

  responseFor: function(request, options) {
    options = TestExSIP.Helpers.mergeOptions(request, options);
    ua.transport.onMessage({data: this.inviteResponse(ua, options)});
  },

  mergeOptions: function(request, options) {
    options = options || {};
    options = this.merge(options,  {cseq: request.cseq, from_tag: request.from_tag, from: request.from.toString(),
      to: request.to.toString(), to_tag: request.to_tag, call_id: request.call_id, branch: request.via_branch});
    return options;
  },

  receiveInviteAndAnswer: function(inviteOptions){
    ua.transport.onMessage({data: this.initialInviteRequest(ua, inviteOptions)});

    this.answer(session);

    var answerMsg = this.popMessageSentAndClear(ua);
    strictEqual(answerMsg.status_code, 200);

    this.responseFor(answerMsg, {method: ExSIP.C.ACK});
  },

  byeRequestFor: function(request, options) {
    options = this.mergeOptions(request, options);
    ua.transport.onMessage({data: this.byeRequest(ua, options)});
  },

  notifyRequestFor: function(request, body, options) {
    options = this.mergeOptions(request, options);
    ua.transport.onMessage({data: this.notifyRequest(ua, body, options)});
  },

  isMode: function(body, audioMode, videoMode) {
    var localDescription = new ExSIP.WebRTC.RTCSessionDescription({sdp: body, type: "offer"});
    strictEqual(localDescription.getVideoMode(), videoMode);
    strictEqual(localDescription.getAudioMode(), audioMode);
  },

  merge: function(obj1,obj2){
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
  },

  formatWithTag: function(value, options) {
    if(value.indexOf("tag=") !== -1) {
      return value;
    } else {
      return (value + ";tag="+(options["to_tag"] || "8c9b3674"));
    }
  },

  createFakeUA: function(options) {
    var ua = new ExSIP.UA(ExSIP.Utils.merge_options(this.FAKE_UA_CONFIGURATION, options || {}));
    ua.setRtcMediaHandlerOptions({disableICE: true});
    return ua;
  },

  createUAAndCall: function(configuration) {
    ua = this.createFakeUA(configuration);
    ua.on('newRTCSession', function(e){ session = e.data.session; });
    this.mockWebRTC();
    this.startAndConnect(ua, configuration);
    return ua;
  },

  createSIPMessage: function(ua, sip, options) {
    options = options || {};
    var transactions = Object.keys(ua.transactions.ict).length > 0 ? ua.transactions.ict : ua.transactions.ist;
    var branch = options["branch"] || Object.keys(transactions)[0];
    var callId = options["call_id"] || transactions[branch].request.call_id;
    var session = ua.sessions[Object.keys(ua.sessions)[0]];
    var fromTag = options["from_tag"] || (session ? session.from_tag : "");
    console.log("--- branch : "+branch+", call_id : "+callId+", fromTag : "+fromTag);
    return sip.replace(/<via_host>/g, ua.configuration.via_host).replace(/<branch>/g, branch).replace(/<from_tag>/g, fromTag).replace(/<call_id>/g, callId);
  },

  startAndConnect: function(ua, options) {
    this.start(ua, options);
    this.connect(ua, options);
  },

  onOpen: function(ua) {
    ua.transport.onOpen();
  },

  answer: function(session) {
    var options = this.getMediaOptions();
    var allow = "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY";
    options["extraHeaders"] = ["Allow: "+allow];
    session.answer(options);
    this.triggerOnIceCandidate(session);
  },

  start: function(ua, options) {
    var self = this;
    ua.start();
    ua.transport.send = function(msg){
      self.sendMsgs.push(msg); console.log("-- Transport.send() WebSocket message:\n\n" + msg + "\n");return true;
    };
  },

  connect: function(ua, configuration) {
    configuration = configuration || {};
    var options = this.getMediaOptions();
    var session = ua.call(configuration["destination"] || "sip:fakeUA@exsip.net", options);
    this.triggerOnIceCandidate(session);
    ua.transport.onOpen();
  },

  triggerOnIceCandidate: function(session, options){
    options = options || {};
    var event = {
      srcElement:{iceGatheringState:"complete"},
      candidate:(options["withoutCandidate"] ? undefined : {sdpMLineIndex:0,sdpMid:"audio",
        candidate:"a=candidate:23847997 1 udp 2113937151 169.254.193.143 49229 typ host generation 0"})
    };

    session.rtcMediaHandler.peerConnection.onicecandidate(event);
//    session.rtcMediaHandler.peerConnection.onicecandidate({srcElement:{iceGatheringState:"complete"},
//      candidate:null});
  },

  popMessageSentAndClear: function(ua){
    var msg = this.popMessageSent(ua);
    this.sendMsgs = [];
    return msg;
  },

  popMessageSent: function(ua){
    var data = this.sendMsgs.pop();
    return this.parseMessage(ua, data);
  },

  parseMessage: function(ua, data){
    var dataStr = data.toString();
    return ExSIP.Parser.parseMessage(ua, dataStr);
  },

  popPenultimateMessageSent: function(ua){
    var data = this.sendMsgs.splice(-2, 1);
    return this.parseMessage(ua, data);
  },

  getMediaOptions: function(options){
    options = options || {};
    return {
      mediaConstraints: {audio: (options["audio"] || true), video: (options["video"] || false)},
      RTCConstraints: {'optional': [],'mandatory': {}},
      createOfferConstraints: {mandatory:{OfferToReceiveAudio:true,OfferToReceiveVideo:true}}
    };
  },

  mockWebRTC: function(){
    TestExSIP.Helpers.isIceCandidateReadyFunction = TestExSIP.Helpers.isIceCandidateReadyFunction || ExSIP.WebRTC.RTCPeerConnection.prototype.isIceCandidateReady;
    ExSIP.WebRTC.RTCPeerConnection = function(){
      console.log('-- RTCPeerConnection.new()');
      return {
        localDescription: null,
        remoteDescription: null,
        close: function(){console.log("-- RTCPeerConnection.close()")},
        setRemoteDescription: function(description, success, failure){console.log("-- RTCPeerConnection.setRemoteDescription() : "+ExSIP.Utils.toString(description));this.remoteDescription = description; if(success){success();}},
        addStream: function(){console.log("-- RTCPeerConnection.addStream()")},
        createOffer: function(success){
          console.log("-- RTCPeerConnection.createOffer()");
          TestExSIP.Helpers.createOffer();
          this.signalingState = 'have-local-offer';
          success(TestExSIP.Helpers.createDescription(this.createDescriptionOptions()));
        },
        createAnswer: function(success, failure){
          console.log("-- RTCPeerConnection.createAnswer()");
          this.signalingState = 'have-remote-offer';
          TestExSIP.Helpers.createAnswer();
          if(!this.remoteDescription) {
            throw new Error("CreateAnswer can't be called before SetRemoteDescription");
          }
          else {
            var description = TestExSIP.Helpers.createDescription(this.createDescriptionOptions({type: "answer"}));
            success(description);
          }
        },
        createDTMFSender: function(local_audio_track){
          console.log("-- RTCPeerConnection.createDTMFSender()");
          return new ExSIP.WebRTC.RTCDTMFSender();
        },
        setLocalDescription: function(description, success, failure){
          console.log("-- RTCPeerConnection.setLocalDescription() : "+ExSIP.Utils.toString(description));
          this.localDescription = description; TestExSIP.Helpers.setLocalDescription(description);
          if(success){
            success();
          }
        },
        createDescriptionOptions: function(options){
          return options;
        },
        isIceCandidateReady: function(candidate) {
          return TestExSIP.Helpers.isIceCandidateReadyFunction(candidate);
        }
      }
    };
    ExSIP.WebRTC.getUserMedia = function(constraints, success, failure){
        console.log('-- getUserMedia ');
        success(new ExSIP.WebRTC.MediaStream());
    };
    ExSIP.WebRTC.RTCDTMFSender = function(){
      console.log('-- RTCDTMFSender.new() ');
      return {
        insertDTMF: function(tone, duration, gap){console.log("-- RTCDTMFSender.insertDTMF()")},
        canInsertDTMF: true
      };
    };
    ExSIP.WebRTC.MediaStreamTrack = function(){
        console.log('-- MediaStreamTrack.new() ');
    };
    ExSIP.WebRTC.MediaStream = function(){
      console.log('-- MediaStream.new()');
      return {
        stop: function(){console.log("-- MediaStream.stop()")},
        getAudioTracks: function(){console.log("-- MediaStream.getAudioTracks()"); return [new ExSIP.WebRTC.MediaStreamTrack()];}
      };
    }
//    ExSIP.UA.prototype.recoverTransport = function(){console.log("--recoverTransport");}
    ExSIP.WebRTC.isSupported = true;
  },

  ringingResponse: function(ua) {
    var sip = "SIP/2.0 180 Ringing\r\n"+
      "Via: SIP/2.0/WS <via_host>;branch=<branch>;received=200.49.190.72\r\n"+
      "Contact: <sip:1000@204.117.64.109:8060;transport=ws>\r\n"+
      "To: <sip:fakeUA@exsip.net>;tag=8c9b3674\r\n"+
      "From: \"Dom Webrtc\" <sip:1500@exarionetworks.com>;tag=<from_tag>\r\n"+
      "Call-ID: <call_id>\r\n"+
      "CSeq: 2938 INVITE\r\n"+
      "Content-Length: 0\r\n"+
      "\r\n"+
      "\r\n";
    return TestExSIP.Helpers.createSIPMessage(ua, sip);
  },

  sipResponseMessage: function(options, sdp) {
    var sip = "SIP/2.0 "+(options["status_code"] || "200 OK")+"\r\n"+
      "Via: SIP/2.0/WS "+(options["via_host"] || "<via_host>")+";branch="+(options["branch"] || "<branch>")+";received=200.49.190.72\r\n"+
      "Contact: "+(options["contact"] || "<sip:1000@204.117.64.109:8060;transport=ws>")+"\r\n"+
      "To: "+this.formatWithTag((options["to"] || "\"Dom Webrtc\" <sip:1500@exarionetworks.com>"), options)+"\r\n"+
      "From: "+(options["from"] || "<sip:fakeUA@exsip.net>;tag="+(options["from_tag"] || "<from_tag>"))+"\r\n"+
      "Call-ID: "+(options["call_id"] || "<call_id>")+"\r\n"+
      "CSeq: "+(options["cseq"] || "1353")+" "+(options["method"] || "INVITE")+"\r\n"+
      "Allow: "+(options["allow"] || "INVITE, ACK, CANCEL, OPTIONS, BYE, UPDATE, INVITE, REGISTER, ACK, CANCEL, BYE, INFO")+"\r\n"+
      "Content-Type: "+(options["content_type"] || "application/sdp")+"\r\n"+
      (options["supported"] ? ("Supported: "+options["supported"]+"\r\n") : "")+
      (options["event"] ? ("Event: "+options["event"]+"\r\n") : "")+
      (options["www_authenticate"] ? ("WWW-Authenticate: "+options["www_authenticate"]+"\r\n") : "")+
      (options["retryAfter"] ? ("Retry-After: "+options["retryAfter"]+"\r\n") : "")+
      "Content-Length: "+sdp.length+"\r\n"+
      "\r\n"+
      sdp;
    return TestExSIP.Helpers.createSIPMessage(ua, sip, options);
  },

  sipRequestMessage: function(options, sdp) {
    var sip = (options["method"] || "INVITE")+" sip:fakeUA@exsip.net SIP/2.0\r\n"+
      "Via: SIP/2.0/WS "+(options["via_host"] || "<via_host>")+";branch="+(options["branch"] || "<branch>")+"\r\n"+
      "Max-Forwards: 69\r\n"+
      "To: <sip:fakeUA@exsip.net>;tag="+(options["from_tag"] || "<from_tag>")+"\r\n"+
      "From: \"Dom Webrtc\" <sip:1500@exarionetworks.com>;tag="+(options["to_tag"] || "8c9b3674")+"\r\n"+
      "Call-ID: "+(options["call_id"] || "<call_id>")+"\r\n"+
      "CSeq: 637827301 "+(options["method"] || "INVITE")+"\r\n"+
      "Contact: <sip:5vlmplnu@exarionetworks.com;transport=ws;ob>\r\n"+
      "Allow: "+(options["allow"] || "ACK,CANCEL,BYE,OPTIONS,INVITE")+"\r\n"+
      "Content-Type: "+(options["content_type"] || "application/sdp")+"\r\n"+
      "Supported: "+(options["supported"] || "path, outbound, gruu")+"\r\n"+
      (options["event"] ? ("Event: "+options["event"]+"\r\n") : "")+
      (options["referTo"] ? ("Refer-To: "+options["referTo"]+"\r\n") : "")+
      "User-Agent: BroadSoft ExSIP - 1.5\r\n"+
      "Content-Length: "+sdp.length+"\r\n"+
      "\r\n"+
      sdp;
    return TestExSIP.Helpers.createSIPMessage(ua, sip);
  },

  inviteResponse: function(ua, options) {
    options = options || {};

    var sdp = options["noSdp"] ? "" : this.createSdp(options);

    return this.sipResponseMessage(options, sdp);
  },

  notifyRequest: function(ua, sdp, options) {
    options = options || {};
    options["method"] = "NOTIFY";
    options["content_type"] = "message/sipfrag";
    options["subscription_state"] = "active;expires=60";
    options["event"] = "refer";
    options["supported"] = "replaces, tdialog";
    options["allow"] = "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY";
    return this.sipRequestMessage(options, sdp);
  },

  byeRequest: function(ua, options) {
    options = options || {};
    options["method"] = "BYE";
    options["allow"] = "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY";
    return this.sipRequestMessage(options, "");
  },

  ackResponse: function(ua, options) {
    options = options || {};
    options["method"] = ExSIP.C.ACK;
    return TestExSIP.Helpers.sipRequestMessage(options, "");

  },

  inviteRequest: function(ua, options) {
    options = options || {};
    var sdp = options["noSdp"] ? "" : this.createSdp(options);

    return this.sipRequestMessage(options, sdp);
  },

  createAnswer: function(){
  },

  createOffer: function(){
  },

  setLocalDescription: function(localDescription){
  },

  createDescription: function(options){
    options = options || {};
    return new ExSIP.WebRTC.RTCSessionDescription({type: (options["type"] || 'offer'), sdp: this.createSdp(options)});
  },

  createSdp: function(options){
    options = options || {};
    var sdp = "v=0\r\n"+
      "o=BroadWorks 728485 2 IN IP4 10.48.7.56\r\n"+
      "s=-\r\n"+
      (options["withoutConnection"] ? "" : "c=IN IP4 10.48.1.13\r\n")+
      "t=0 0\r\n"+
      (options["withoutAudio"] ? "" : "m=audio "+(options["audioPort"] || "16550")+" RTP/AVP "+(options["audioCodecs"] || "9 126")+"\r\n"+
        (options["withoutAudioConnection"] ? "" : "c=IN IP4 "+(options["audioIP"] || "10.48.1.23")+"\r\n")+
        (options["withoutAudioRtcp"] ? "" : "a=rtcp:"+(options["audioRtcp"] || "55761 IN IP4 181.189.138.18")+"\r\n")+
        (options["withoutAudioMode"] ? "" : "a="+(options["audioMode"] || ExSIP.C.SENDRECV)+"\r\n")+
        (options["withoutAudioCodecRtpmap"] ? "" : "a=rtpmap:9 "+(options["audioCodec9Rtpmap"] || "G722/8000")+"\r\n")+
        (options["withoutAudioCodecRtpmap"] ? "" : "a=rtpmap:126 "+(options["audioCodec126Rtpmap"] || "telephone-event/8000")+"\r\n")+
        (options["withoutAudioCodecFmtp"] ? "" : "a=fmtp:126 "+(options["audioCodec126Fmtp"] || "0-15")+"\r\n")+
        (options["withoutAudioCandidates"] ? "" : "a=candidate:3355351182 1 udp 2113937151 10.0.2.1 59436 typ host generation 0\r\na=candidate:3355351182 2 udp 2113937151 10.0.2.1 59436 typ host generation 0\r\n")+
        (options["withoutAudioFingerprint"] ? "" : "a=fingerprint:sha-256 B1:1D:38:90:8F:72:85:60:AD:10:9F:BB:F5:78:47:AB:A8:DF:01:FA:50:D3:73:C9:20:3D:B4:C0:36:C2:08:29\r\n")+
        (options["withoutAudioIceUfrag"] ? "" : "a=ice-ufrag:pXHmklEbg7WBL95R\r\n")+
        (options["withoutAudioIcePwd"] ? "" : "a=ice-pwd:KJa5PdOffxkQ7NtyroEPwzZY\r\n"))+
      (options["withoutVideo"] ? "" : "m=video "+(options["videoPort"] || "16930")+" RTP/AVP "+(options["videoCodecs"] || "99 109 34")+"\r\n"+
        (options["withoutVideoConnection"] ? "" : "c=IN IP4 "+(options["videoIP"] || "10.48.1.33")+"\r\n")+
        (options["withoutVideoBandwidth"] ? "" : "b=AS:"+(options["videoBandwidth"] || "512")+"\r\n")+
        (options["withoutVideoRtcp"] ? "" : "a=rtcp:"+(options["videoRtcp"] || "55762 IN IP4 181.189.138.18")+"\r\n")+
        (options["withoutVideoCodecRtpmap"] ? "" : "a=rtpmap:99 "+(options["videoCodec99Rtpmap"] || "H264/90000")+"\r\n")+
        (options["withoutVideoCodecFmtp"] ? "" : "a=fmtp:99 "+(options["videoCodec99Fmtp"] || "profile-level-id=42801E; packetization-mode=0")+"\r\n")+
        (options["withoutVideoMode"] ? "" : "a="+(options["videoMode"] || ExSIP.C.SENDRECV)+"\r\n")+
        (options["withoutVideoCodecRtpmap"] ? "" : "a=rtpmap:109 "+(options["videoCodec109Rtpmap"] || "H264/90000")+"\r\n")+
        (options["withoutVideoCodecFmtp"] ? "" : "a=fmtp:109 "+(options["videoCodec109Fmtp"] || "profile-level-id=42801E; packetization-mode=0")+"\r\n")+
        (options["withoutVideoCodecRtpmap"] ? "" : "a=rtpmap:34 "+(options["videoCodec34Rtpmap"] || "H263/90000")+"\r\n")+
        (options["withoutVideoCodecFmtp"] ? "" : "a=fmtp:34 "+(options["videoCodec34Fmtp"] || "CIF=1;QCIF=1;SQCIF=1")+"\r\n")+
        (options["withoutVideoIceUfrag"] ? "" : "a=ice-ufrag:Q8QVGvJo7iPUnNoG\r\n")+
        (options["withoutVideoFingerprint"] ? "" : "a=fingerprint:sha-256 B1:1D:38:90:8F:72:85:60:AD:10:9F:BB:F5:78:47:AB:A8:DF:01:FA:50:D3:73:C9:20:3D:B4:C0:36:C2:08:30\r\n")+
        (options["withoutVideoIcePwd"] ? "" : "a=ice-pwd:Tnws80Vq98O3THLRXLqjWnOf"));
    return sdp;
  },

  initialInviteRequest: function(ua, options) {
    options = options || {};
    var sdp = this.createSdp(options);

    var sip = "INVITE sip:fakeUA@exsip.net SIP/2.0\r\n"+
      "Via: SIP/2.0/TLS 192.0.2.4;branch="+(options["branch"] || "z9hG4bKnas432")+"\r\n"+
      "Max-Forwards: 69\r\n"+
      "To: <sip:fakeUA@exsip.net>\r\n"+
      "From: "+(options["from"] || "\"Dom Webrtc\" <sip:1500@exarionetworks.com>;tag=7553452")+"\r\n"+
      "Call-ID: "+(options["callId"] || "090459243588173445")+"\r\n"+
      "CSeq: 29887 INVITE\r\n"+
      "Contact: <sip:5vlmplnu@exarionetworks.com;transport=ws;ob>\r\n"+
      "Allow: "+(options["allow"] || "ACK,CANCEL,BYE,OPTIONS,INVITE")+"\r\n"+
      "Content-Type: application/sdp\r\n"+
      "Supported: "+(options["supported"] || "path, outbound, gruu")+"\r\n"+
      "User-Agent: BroadSoft ExSIP - 1.5\r\n"+
      "Content-Length: "+sdp.length+"\r\n"+
      "\r\n"+
      sdp;
    return sip;
  }

};


window.TestExSIP = TestExSIP;
}(window));


