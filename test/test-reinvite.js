module( "re-invite", {
  setup: function() {
    ua = TestExSIP.Helpers.createFakeUA({trace_sip: true, use_preloaded_route: false});
    ua.on('newRTCSession', function(e){ session = e.data.session; });
    TestExSIP.Helpers.mockWebRTC();
    TestExSIP.Helpers.startAndConnect(ua);

    ua.transport.onMessage({data: TestExSIP.Helpers.ringingResponse(ua)});
    ua.transport.onMessage({data: TestExSIP.Helpers.inviteResponse(ua, {videoPort: "0", hasBandwidth: true})});
  }, teardown: function() {
  }
});
test('request received', function() {
  var onReInviteEventReceived = false;
  ua.on('onReInvite', function(e){ onReInviteEventReceived = true; });
  ua.transport.onMessage({data: TestExSIP.Helpers.inviteRequest(ua)});
  ok(onReInviteEventReceived);
});
test('reinvite with no sdp after audio only reinvite', function() {
  ua.transport.onMessage({data: TestExSIP.Helpers.inviteRequest(ua, {withoutVideo: true})});
  session.rtcMediaHandler.peerConnection.setLocalDescription(TestExSIP.Helpers.createDescription({withoutVideo: true, type: "answer"}));
  TestExSIP.Helpers.triggerOnIceCandidate(session);
  var answerMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(answerMsg.status_code, 200);
  strictEqual(answerMsg.body.length > 0, true);
  strictEqual(new ExSIP.WebRTC.RTCSessionDescription({type: 'offer', sdp: answerMsg.body}).hasVideo(), false);
  ua.transport.onMessage({data: TestExSIP.Helpers.ackResponse(ua)});

  // receiving empty reinvite - should use initial remote description with video
  var createOfferCalled = true; var createOfferConstraints = null;
  TestExSIP.Helpers.createOffer = function(options){
    createOfferCalled = true;
    createOfferConstraints = options
  };
  ua.transport.onMessage({data: TestExSIP.Helpers.inviteRequest(ua, {noSdp: true, branch: "z9hG4bK-524287-1"})});
  TestExSIP.Helpers.triggerOnIceCandidate(session);
  strictEqual(createOfferCalled, true, "should call createOffer");
  deepEqual(createOfferConstraints, {
    "mandatory": {
      "OfferToReceiveAudio": true,
      "OfferToReceiveVideo": true
    }
  }, 'should have video set but was '+JSON.stringify(createOfferConstraints));
});
test('reinvite with no sdp and ACK with sdp', function() {
  var onReInviteEventReceived = false;
  ua.on('onReInvite', function(e){
    onReInviteEventReceived = true;
  });
  ua.transport.onMessage({data: TestExSIP.Helpers.inviteRequest(ua, {noSdp: true})});
  TestExSIP.Helpers.triggerOnIceCandidate(session);
  var answerMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(answerMsg.status_code, 200);
  strictEqual(answerMsg.body.length > 0, true);
  ok(!onReInviteEventReceived);

  var answerCreated = false, localDescriptionSet = false, remoteDescriptionSet = false, started = false;
  session.on('started', function(e) {
    started = true;
  });
  TestExSIP.Helpers.setLocalDescription = function(description){
      localDescriptionSet = true
  };
  TestExSIP.Helpers.setRemoteDescription = function(description){
    remoteDescriptionSet = true
  };
  TestExSIP.Helpers.createAnswer = function(){
      answerCreated = true;
  };
  var formerRtcMediaHandler = session.rtcMediaHandler;
  ua.transport.onMessage({data: TestExSIP.Helpers.inviteRequest(ua, {method: ExSIP.C.ACK})});
  TestExSIP.Helpers.triggerOnIceCandidate(session);
  strictEqual(session.status, ExSIP.RTCSession.C.STATUS_CONFIRMED);
  strictEqual(session.rtcMediaHandler === formerRtcMediaHandler, true, "should not reconnect after ACK with sdp");
  strictEqual(answerCreated, false, "should not have called createAnswer");
  strictEqual(localDescriptionSet, false, "should not have called setLocalDescription");
  strictEqual(remoteDescriptionSet, true, "should have called setRemoteDescription");
  strictEqual(started, true, "should trigger started in order to update video streams");
});
test('request received from hold from E20', function() {
  var sdp = "v=0\r\n"+
    "o=sipgw 1388678972 2 IN IP4 64.212.220.60\r\n"+
  "s=Lj2WCt1mITKBsSSDc4Vl\r\n"+
  "t=0 0\r\n"+
  "m=audio 0 RTP/SAVPF 0\r\n"+
  "c=IN IP4 64.212.220.60\r\n"+
  "a=rtcp-mux\r\n"+
  "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:COC/s3LiY4fOUr1uvCwcIZZRsdf6a2fVGYDWmwzk\r\n"+
  "a=ice-ufrag:RtZIxhEJ3zID1Ypf\r\n"+
  "a=ice-pwd:FWG7ZZNbGugNZCQjZSOgX7WM\r\n"+
  "a=ssrc:9152188 cname:zRg4D7332YqcdCbE\r\n"+
  "a=candidate:0 1 udp 2113929216 64.212.220.60 2008 typ host\r\n"+
  "a=candidate:1 1 udp 2113929216 10.48.0.60 2008 typ host\r\n"+
  "a=inactive\r\n"+
  "m=video 0 RTP/SAVPF 0\r\n"+
  "c=IN IP4 64.212.220.60\r\n"+
  "a=rtcp-mux\r\n"+
  "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:COC/s3LiY4fOUr1uvCwcIZZRsdf6a2fVGYDWmwzk\r\n"+
  "a=ice-ufrag:huP3RTmmiU85QxKH\r\n"+
  "a=ice-pwd:0WOaXZ58EPVUWVAsKpSuNTDO\r\n"+
  "a=ssrc:13972437 cname:Y3HVaLYMG0Ruh0wg\r\n"+
  "a=candidate:0 1 udp 2113929216 64.212.220.60 2010 typ host\r\n"+
  "a=candidate:1 1 udp 2113929216 10.48.0.60 2010 typ host\r\n"+
  "a=inactive";
  var createDescriptionFunction = TestExSIP.Helpers.createDescription;
  TestExSIP.Helpers.createDescription = function(options) {
    return new ExSIP.WebRTC.RTCSessionDescription({type: (options["type"] || 'offer'), sdp: "v=0\r\n"+
      "o=- 274164285765459605 2 IN IP4 127.0.0.1\r\n"+
    "s=-\r\n"+
    "t=0 0\r\n"+
    "a=msid-semantic: WMS NXWerouyJxAEisiHAp1cSaZrJk24QBGX8MSY\r\n"+
    "m=audio 0 RTP/SAVPF 0\r\n"+
    "c=IN IP4 0.0.0.0\r\n"+
    "a=rtcp:1 IN IP4 0.0.0.0\r\n"+
    "a=mid:audio\r\n"+
    "a=inactive\r\n"+
    "a=rtcp-mux\r\n"+
    "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:LI3rm9WqUckpllQvY4QmmsJVg7b0ap95SEO2zASW\r\n"+
    "a=rtpmap:0 PCMU/8000\r\n"+
    "a=ssrc:861794005 cname:j1/LsMIIY/4E0Vpi\r\n"+
    "a=ssrc:861794005 msid:NXWerouyJxAEisiHAp1cSaZrJk24QBGX8MSY NXWerouyJxAEisiHAp1cSaZrJk24QBGX8MSYa0\r\n"+
    "a=ssrc:861794005 mslabel:NXWerouyJxAEisiHAp1cSaZrJk24QBGX8MSY\r\n"+
    "a=ssrc:861794005 label:NXWerouyJxAEisiHAp1cSaZrJk24QBGX8MSYa0\r\n"+
    "m=video 0 RTP/SAVPF 0\r\n"+
    "c=IN IP4 0.0.0.0\r\n"+
    "a=rtcp:1 IN IP4 0.0.0.0\r\n"+
    "a=mid:video\r\n"+
    "a=inactive\r\n"+
    "a=rtcp-mux\r\n"+
    "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:eK5b9/jUzN+8IrxYsnHluTgEu4nLY1sD6VqUArLO"});
  };
  ua.transport.onMessage({data: TestExSIP.Helpers.sipRequestMessage({}, sdp)});
  var answerMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(answerMsg.status_code, 200);
  TestExSIP.Helpers.createDescription = createDescriptionFunction;
});
test('reinvite with unsupported medias', function() {
  var unsupportedSdp =     "m=video 0 RTP/SAVPF 99\r\n"+
    "a=rtpmap:99 H264/90000\r\n"+
    "a=inactive\r\n"+
    "a=content:slides\r\n"+
    "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:Gi8HeSTpye8o7zuO9h8X9gXawqULMLewfxMO0S69\r\n"+
    "m=application 0 RTP/SAVPF\r\n"+
    "a=inactive\r\n"+
    "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:Gi8HeSTpye8o7zuO9h8X9gXawqULMLewfxMO0S69\r\n"+
    "m=application 0 RTP/SAVPF\r\n"+
    "a=inactive\r\n"+
    "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:Gi8HeSTpye8o7zuO9h8X9gXawqULMLewfxMO0S69";

  var expectedAnswerSdp = "v=0\r\n"+
  "o=BroadWorks 728485 2 IN IP4 10.48.7.56\r\n"+
  "s=-\r\n"+
  "c=IN IP4 10.48.1.13\r\n"+
  "t=0 0\r\n"+
  "m=audio 16550 RTP/AVP 9 126\r\n"+
  "c=IN IP4 10.48.1.23\r\n"+
  "a=rtcp:55761 IN IP4 181.189.138.18\r\n"+
  "a=sendrecv\r\n"+
  "a=rtpmap:9 G722/8000\r\n"+
  "a=rtpmap:126 telephone-event/8000\r\n"+
  "a=fmtp:126 0-15\r\n"+
  "a=candidate:3355351182 1 udp 2113937151 10.0.2.1 59436 typ host generation 0\r\n"+
  "a=candidate:3355351182 2 udp 2113937151 10.0.2.1 59436 typ host generation 0\r\n"+
  "a=fingerprint:sha-256 B1:1D:38:90:8F:72:85:60:AD:10:9F:BB:F5:78:47:AB:A8:DF:01:FA:50:D3:73:C9:20:3D:B4:C0:36:C2:08:29\r\n"+
  "a=ice-ufrag:pXHmklEbg7WBL95R\r\n"+
  "a=ice-pwd:KJa5PdOffxkQ7NtyroEPwzZY\r\n"+
  "m=video 16930 RTP/AVP 99 109 34\r\n"+
  "c=IN IP4 10.48.1.33\r\n"+
  "b=AS:512\r\n"+
  "a=rtcp:55762 IN IP4 181.189.138.18\r\n"+
  "a=rtpmap:99 H264/90000\r\n"+
  "a=fmtp:99 profile-level-id=42801E; packetization-mode=0\r\n"+
  "a=sendrecv\r\n"+
  "a=rtpmap:109 H264/90000\r\n"+
  "a=fmtp:109 profile-level-id=42801E; packetization-mode=0\r\n"+
  "a=rtpmap:34 H263/90000\r\n"+
  "a=fmtp:34 CIF=1;QCIF=1;SQCIF=1\r\n"+
  "a=ice-ufrag:Q8QVGvJo7iPUnNoG\r\n"+
  "a=fingerprint:sha-256 B1:1D:38:90:8F:72:85:60:AD:10:9F:BB:F5:78:47:AB:A8:DF:01:FA:50:D3:73:C9:20:3D:B4:C0:36:C2:08:30\r\n"+
  "a=ice-pwd:Tnws80Vq98O3THLRXLqjWnOf\r\n"+unsupportedSdp;

  var session = null;
  ua.on('onReInvite', function(e)
  {
    e.data.session.acceptReInvite();
    session = e.data.session;
  });

  ua.transport.onMessage({data: TestExSIP.Helpers.inviteRequest(ua, {additionalSdp: unsupportedSdp})});
  TestExSIP.Helpers.triggerOnIceCandidate(session);
  var answerMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(answerMsg.status_code, 200);
  strictEqual(answerMsg.body, expectedAnswerSdp);
});
test('request received from hold', function() {
  var sdp = "v=0\r\n"+
  "o=sipgw 1388756803 3 IN IP4 204.117.64.113\r\n"+
  "s=hTilrLbzMHZlWdwGx5MG\r\n"+
  "c=IN IP4 204.117.64.113\r\n"+
  "t=0 0";
  var createDescriptionFunction = TestExSIP.Helpers.createDescription;
  TestExSIP.Helpers.createDescription = function(options) {
    return new ExSIP.WebRTC.RTCSessionDescription({type: (options["type"] || 'offer'), sdp: "v=0\r\n"+
      "o=- 274164285765459605 2 IN IP4 127.0.0.1\r\n"+
      "s=-\r\n"+
      "t=0 0\r\n"+
      "a=msid-semantic: WMS"});
  };
  ua.transport.onMessage({data: TestExSIP.Helpers.sipRequestMessage({}, sdp)});
  var answerMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(answerMsg.status_code, 200);
  TestExSIP.Helpers.createDescription = createDescriptionFunction;
});

test('hold', function() {
  session.hold();
  var reinviteMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(reinviteMsg.method, ExSIP.C.INVITE);
  deepEqual(session.rtcMediaHandler.createOfferConstraints, TestExSIP.Helpers.getMediaOptions().createOfferConstraints);
});

test('request received and accepting', function() {
  var onReInviteEvent = false, session = null;
  ua.on('onReInvite', function(e)
  {
    onReInviteEvent = true;
    e.data.session.acceptReInvite();
    session = e.data.session;
    ok(!e.data.audioAdd);
    ok(e.data.videoAdd);
  });
  ua.transport.onMessage({data: TestExSIP.Helpers.inviteRequest(ua, {videoBandwidth: "1024"})});
  TestExSIP.Helpers.triggerOnIceCandidate(session);
  ok(onReInviteEvent);
  strictEqual(session.rtcMediaHandler.peerConnection.remoteDescription.getVideoBandwidth(), "1024")
  strictEqual(session.status, ExSIP.RTCSession.C.STATUS_WAITING_FOR_ACK);
  ok(session.rtcMediaHandler.localMedia);
  ok(!session.rtcMediaHandler.localMedia.ended, "local media should not have been stopped");

  ua.transport.onMessage({data: TestExSIP.Helpers.ackResponse(ua)});
  strictEqual(session.status, ExSIP.RTCSession.C.STATUS_CONFIRMED);
});
test('request received and rejecting', function() {
  var onReInviteEvent = false, session = null;
  ua.on('onReInvite', function(e)
  {
    onReInviteEvent = true;
    e.data.session.rejectReInvite();
    session = e.data.session;
  });
  ua.transport.onMessage({data: TestExSIP.Helpers.inviteRequest(ua, {videoBandwidth: "1024"})});
  TestExSIP.Helpers.triggerOnIceCandidate(session);
  ok(onReInviteEvent);
  strictEqual(session.rtcMediaHandler.peerConnection.remoteDescription.getVideoBandwidth(), "512")
  strictEqual(session.status, ExSIP.RTCSession.C.STATUS_CONFIRMED);

  ua.transport.onMessage({data: TestExSIP.Helpers.ackResponse(ua)});
  strictEqual(session.status, ExSIP.RTCSession.C.STATUS_CONFIRMED);
});
test('request with no audio/video change received', function() {
  var onReInviteEvent = false;
  ua.on('onReInvite', function(e){ onReInviteEvent = true; });

  ua.transport.onMessage({data: TestExSIP.Helpers.inviteRequest(ua, {videoPort: "0", videoBandwidth: "1024"})});
  TestExSIP.Helpers.triggerOnIceCandidate(session);
  ok(!onReInviteEvent);
  strictEqual(session.rtcMediaHandler.peerConnection.remoteDescription.getVideoBandwidth(), "1024")
  strictEqual(session.status, ExSIP.RTCSession.C.STATUS_WAITING_FOR_ACK);

  ua.transport.onMessage({data: TestExSIP.Helpers.ackResponse(ua)});
  strictEqual(session.status, ExSIP.RTCSession.C.STATUS_CONFIRMED);
});