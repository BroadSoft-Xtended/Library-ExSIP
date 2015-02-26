require('./include/common');
var testUA = require('./include/testUA');
var ExSIP = require('../');
var RTCSession = require('../src/RTCSession');
var WebRTC = require('../src/WebRTC');
var ExSIP_C = require('../src/Constants');

describe('reinvite', function() {

  beforeEach(function() {
    ua = testUA.createFakeUA({
      trace_sip: true,
      use_preloaded_route: false
    });
    ua.on('newRTCSession', function(e) {
      session = e.data.session;
    });
    testUA.mockWebRTC();
    testUA.startAndConnect(ua);

    ua.transport.onMessage({
      data: testUA.ringingResponse(ua)
    });
    ua.transport.onMessage({
      data: testUA.inviteResponse(ua, {
        videoPort: "0",
        hasBandwidth: true
      })
    });
  });

  it('request received', function() {
    var onReInviteEventReceived = false;
    ua.on('onReInvite', function(e) {
      onReInviteEventReceived = true;
    });
    ua.transport.onMessage({
      data: testUA.inviteRequest(ua)
    });
    expect(onReInviteEventReceived).toEqual(true)
    
  });

  it('reinvite with no sdp after audio only reinvite', function() {
    ua.transport.onMessage({
      data: testUA.inviteRequest(ua, {
        withoutVideo: true
      })
    });
    session.rtcMediaHandler.peerConnection.setLocalDescription(testUA.createDescription({
      withoutVideo: true,
      type: "answer"
    }));
    testUA.triggerOnIceCandidate(session);
    var answerMsg = testUA.popMessageSentAndClear(ua);
    expect(answerMsg.status_code).toEqual( 200);
    expect(answerMsg.body.length > 0).toEqual( true);
    expect(new WebRTC.RTCSessionDescription({
      type: 'offer',
      sdp: answerMsg.body
    }).hasVideo()).toEqual(false);
    ua.transport.onMessage({
      data: testUA.ackResponse(ua)
    });

    // receiving empty reinvite - should use initial remote description with video
    var createOfferCalled = true;
    var createOfferConstraints = null;
    testUA.createOffer = function(options) {
      createOfferCalled = true;
      createOfferConstraints = options
    };
    ua.transport.onMessage({
      data: testUA.inviteRequest(ua, {
        noSdp: true,
        branch: "z9hG4bK-524287-1"
      })
    });
    testUA.triggerOnIceCandidate(session);
    expect(createOfferCalled).toEqual( true, "should call createOffer");
    expect(createOfferConstraints).toEqual( {
      "mandatory": {
        "OfferToReceiveAudio": true,
        "OfferToReceiveVideo": true
      }
    }, 'should have video set but was ' + JSON.stringify(createOfferConstraints));
    
  });

  it('reinvite with no sdp and ACK with sdp', function() {
    var onReInviteEventReceived = false;
    ua.on('onReInvite', function(e) {
      onReInviteEventReceived = true;
    });
    ua.transport.onMessage({
      data: testUA.inviteRequest(ua, {
        noSdp: true
      })
    });
    testUA.triggerOnIceCandidate(session);
    var answerMsg = testUA.popMessageSentAndClear(ua);
    expect(answerMsg.status_code).toEqual( 200);
    expect(answerMsg.body.length > 0).toEqual( true);
    expect(!onReInviteEventReceived).toEqual(true)

    var answerCreated = false,
      localDescriptionSet = false,
      remoteDescriptionSet = false,
      started = false;
    session.on('started', function(e) {
      started = true;
    });
    testUA.setLocalDescription = function(description) {
      localDescriptionSet = true
    };
    testUA.setRemoteDescription = function(description) {
      remoteDescriptionSet = true
    };
    testUA.createAnswer = function() {
      answerCreated = true;
    };
    var formerRtcMediaHandler = session.rtcMediaHandler;
    ua.transport.onMessage({
      data: testUA.inviteRequest(ua, {
        method: ExSIP_C.ACK
      })
    });
    testUA.triggerOnIceCandidate(session);
    expect(session.status).toEqual( RTCSession.C.STATUS_CONFIRMED);
    expect(session.rtcMediaHandler === formerRtcMediaHandler).toEqual( true, "should not reconnect after ACK with sdp");
    expect(answerCreated).toEqual( false, "should not have called createAnswer");
    expect(localDescriptionSet).toEqual( false, "should not have called setLocalDescription");
    expect(remoteDescriptionSet).toEqual( true, "should have called setRemoteDescription");
    expect(started).toEqual( true, "should trigger started in order to update video streams");
    
  });
  it('request received from hold from E20', function() {
    var sdp = "v=0\r\n" +
      "o=sipgw 1388678972 2 IN IP4 64.212.220.60\r\n" +
      "s=Lj2WCt1mITKBsSSDc4Vl\r\n" +
      "t=0 0\r\n" +
      "m=audio 0 RTP/SAVPF 0\r\n" +
      "c=IN IP4 64.212.220.60\r\n" +
      "a=rtcp-mux\r\n" +
      "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:COC/s3LiY4fOUr1uvCwcIZZRsdf6a2fVGYDWmwzk\r\n" +
      "a=ice-ufrag:RtZIxhEJ3zID1Ypf\r\n" +
      "a=ice-pwd:FWG7ZZNbGugNZCQjZSOgX7WM\r\n" +
      "a=ssrc:9152188 cname:zRg4D7332YqcdCbE\r\n" +
      "a=candidate:0 1 udp 2113929216 64.212.220.60 2008 typ host\r\n" +
      "a=candidate:1 1 udp 2113929216 10.48.0.60 2008 typ host\r\n" +
      "a=inactive\r\n" +
      "m=video 0 RTP/SAVPF 0\r\n" +
      "c=IN IP4 64.212.220.60\r\n" +
      "a=rtcp-mux\r\n" +
      "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:COC/s3LiY4fOUr1uvCwcIZZRsdf6a2fVGYDWmwzk\r\n" +
      "a=ice-ufrag:huP3RTmmiU85QxKH\r\n" +
      "a=ice-pwd:0WOaXZ58EPVUWVAsKpSuNTDO\r\n" +
      "a=ssrc:13972437 cname:Y3HVaLYMG0Ruh0wg\r\n" +
      "a=candidate:0 1 udp 2113929216 64.212.220.60 2010 typ host\r\n" +
      "a=candidate:1 1 udp 2113929216 10.48.0.60 2010 typ host\r\n" +
      "a=inactive";
    var createDescriptionFunction = testUA.createDescription;
    testUA.createDescription = function(options) {
      return new WebRTC.RTCSessionDescription({
        type: (options["type"] || 'offer'),
        sdp: "v=0\r\n" +
          "o=- 274164285765459605 2 IN IP4 127.0.0.1\r\n" +
          "s=-\r\n" +
          "t=0 0\r\n" +
          "a=msid-semantic: WMS NXWerouyJxAEisiHAp1cSaZrJk24QBGX8MSY\r\n" +
          "m=audio 0 RTP/SAVPF 0\r\n" +
          "c=IN IP4 0.0.0.0\r\n" +
          "a=rtcp:1 IN IP4 0.0.0.0\r\n" +
          "a=mid:audio\r\n" +
          "a=inactive\r\n" +
          "a=rtcp-mux\r\n" +
          "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:LI3rm9WqUckpllQvY4QmmsJVg7b0ap95SEO2zASW\r\n" +
          "a=rtpmap:0 PCMU/8000\r\n" +
          "a=ssrc:861794005 cname:j1/LsMIIY/4E0Vpi\r\n" +
          "a=ssrc:861794005 msid:NXWerouyJxAEisiHAp1cSaZrJk24QBGX8MSY NXWerouyJxAEisiHAp1cSaZrJk24QBGX8MSYa0\r\n" +
          "a=ssrc:861794005 mslabel:NXWerouyJxAEisiHAp1cSaZrJk24QBGX8MSY\r\n" +
          "a=ssrc:861794005 label:NXWerouyJxAEisiHAp1cSaZrJk24QBGX8MSYa0\r\n" +
          "m=video 0 RTP/SAVPF 0\r\n" +
          "c=IN IP4 0.0.0.0\r\n" +
          "a=rtcp:1 IN IP4 0.0.0.0\r\n" +
          "a=mid:video\r\n" +
          "a=inactive\r\n" +
          "a=rtcp-mux\r\n" +
          "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:eK5b9/jUzN+8IrxYsnHluTgEu4nLY1sD6VqUArLO"
      });
    };
    ua.transport.onMessage({
      data: testUA.sipRequestMessage({}, sdp)
    });
    testUA.triggerOnIceCandidate(session);
    var answerMsg = testUA.popMessageSentAndClear(ua);
    expect(answerMsg.status_code).toEqual( 200);
    testUA.createDescription = createDescriptionFunction;
    
  });
  it('reinvite with unsupported medias', function() {
    var unsupportedSdp = "m=video 0 RTP/SAVPF 99\r\n" +
      "a=rtpmap:99 H264/90000\r\n" +
      "a=inactive\r\n" +
      "a=content:slides\r\n" +
      "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:Gi8HeSTpye8o7zuO9h8X9gXawqULMLewfxMO0S69\r\n" +
      "m=application 0 RTP/SAVPF\r\n" +
      "a=inactive\r\n" +
      "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:Gi8HeSTpye8o7zuO9h8X9gXawqULMLewfxMO0S69\r\n" +
      "m=application 0 RTP/SAVPF\r\n" +
      "a=inactive\r\n" +
      "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:Gi8HeSTpye8o7zuO9h8X9gXawqULMLewfxMO0S69";

    var expectedAnswerSdp = "v=0\r\n" +
      "o=BroadWorks 728485 2 IN IP4 10.48.7.56\r\n" +
      "s=-\r\n" +
      "c=IN IP4 10.48.1.13\r\n" +
      "t=0 0\r\n" +
      "m=audio 16550 RTP/AVP 9 126\r\n" +
      "c=IN IP4 10.48.1.23\r\n" +
      "a=rtcp:55761 IN IP4 181.189.138.18\r\n" +
      "a=sendrecv\r\n" +
      "a=rtpmap:9 G722/8000\r\n" +
      "a=rtpmap:126 telephone-event/8000\r\n" +
      "a=fmtp:126 0-15\r\n" +
      "a=candidate:3355351182 1 udp 2113937151 10.0.2.1 59436 typ host generation 0\r\n" +
      "a=candidate:3355351182 2 udp 2113937151 10.0.2.1 59436 typ host generation 0\r\n" +
      "a=fingerprint:sha-256 B1:1D:38:90:8F:72:85:60:AD:10:9F:BB:F5:78:47:AB:A8:DF:01:FA:50:D3:73:C9:20:3D:B4:C0:36:C2:08:29\r\n" +
      "a=ice-ufrag:pXHmklEbg7WBL95R\r\n" +
      "a=ice-pwd:KJa5PdOffxkQ7NtyroEPwzZY\r\n" +
      "m=video 16930 RTP/AVP 99 109 34\r\n" +
      "c=IN IP4 10.48.1.33\r\n" +
      "b=AS:512\r\n" +
      "a=rtcp:55762 IN IP4 181.189.138.18\r\n" +
      "a=rtpmap:99 H264/90000\r\n" +
      "a=fmtp:99 profile-level-id=42801E; packetization-mode=0\r\n" +
      "a=sendrecv\r\n" +
      "a=rtpmap:109 H264/90000\r\n" +
      "a=fmtp:109 profile-level-id=42801E; packetization-mode=0\r\n" +
      "a=rtpmap:34 H263/90000\r\n" +
      "a=fmtp:34 CIF=1;QCIF=1;SQCIF=1\r\n" +
      "a=ice-ufrag:Q8QVGvJo7iPUnNoG\r\n" +
      "a=fingerprint:sha-256 B1:1D:38:90:8F:72:85:60:AD:10:9F:BB:F5:78:47:AB:A8:DF:01:FA:50:D3:73:C9:20:3D:B4:C0:36:C2:08:30\r\n" +
      "a=ice-pwd:Tnws80Vq98O3THLRXLqjWnOf\r\n" + unsupportedSdp;

    var session = null;
    ua.on('onReInvite', function(e) {
      e.data.session.acceptReInvite();
      session = e.data.session;
    });

    ua.transport.onMessage({
      data: testUA.inviteRequest(ua, {
        additionalSdp: unsupportedSdp
      })
    });
    testUA.triggerOnIceCandidate(session);
    var answerMsg = testUA.popMessageSentAndClear(ua);
    expect(answerMsg.status_code).toEqual( 200);
    expect(answerMsg.body).toEqual( expectedAnswerSdp);
    
  });
  it('request received from hold', function() {
    var sdp = "v=0\r\n" +
      "o=sipgw 1388756803 3 IN IP4 204.117.64.113\r\n" +
      "s=hTilrLbzMHZlWdwGx5MG\r\n" +
      "c=IN IP4 204.117.64.113\r\n" +
      "t=0 0";
    var createDescriptionFunction = testUA.createDescription;
    testUA.createDescription = function(options) {
      return new WebRTC.RTCSessionDescription({
        type: (options["type"] || 'offer'),
        sdp: "v=0\r\n" +
          "o=- 274164285765459605 2 IN IP4 127.0.0.1\r\n" +
          "s=-\r\n" +
          "t=0 0\r\n" +
          "a=msid-semantic: WMS"
      });
    };
    ua.transport.onMessage({
      data: testUA.sipRequestMessage({}, sdp)
    });
    testUA.triggerOnIceCandidate(session);
    var answerMsg = testUA.popMessageSentAndClear(ua);
    expect(answerMsg.status_code).toEqual( 200);
    testUA.createDescription = createDescriptionFunction;
    
  });

  it('hold', function() {
    session.hold();
    testUA.triggerOnIceCandidate(session);
    var reinviteMsg = testUA.popMessageSentAndClear(ua);
    expect(reinviteMsg.method).toEqual( ExSIP_C.INVITE);
    expect(session.rtcMediaHandler.createOfferConstraints).toEqual( testUA.getMediaOptions().createOfferConstraints);
    testUA.responseFor(reinviteMsg, {
      videoMode: ExSIP_C.RECVONLY,
      audioMode: ExSIP_C.RECVONLY
    });
    
  });

  it('request received and accepting', function() {
    var onReInviteEvent = false,
      session = null;
    ua.on('onReInvite', function(e) {
      onReInviteEvent = true;
      e.data.session.acceptReInvite();
      session = e.data.session;
      expect(!e.data.audioAdd).toEqual(true)
      expect(e.data.videoAdd).toEqual(true)
    });
    ua.transport.onMessage({
      data: testUA.inviteRequest(ua, {
        videoBandwidth: "1024"
      })
    });
    testUA.triggerOnIceCandidate(session);
    expect(onReInviteEvent).toEqual(true)
    expect(session.rtcMediaHandler.peerConnection.remoteDescription.getVideoBandwidth()).toEqual( "1024")
    expect(session.status).toEqual( RTCSession.C.STATUS_WAITING_FOR_ACK);
    expect(session.rtcMediaHandler.localMedia).toExist();
    expect(!session.rtcMediaHandler.localMedia.ended, "local media should not have been stopped").toEqual(true)

    ua.transport.onMessage({
      data: testUA.ackResponse(ua)
    });
    expect(session.status).toEqual( RTCSession.C.STATUS_CONFIRMED);
    
  });
  it('request received and rejecting', function() {
    var onReInviteEvent = false,
      session = null;
    ua.on('onReInvite', function(e) {
      onReInviteEvent = true;
      e.data.session.rejectReInvite();
      session = e.data.session;
    });
    ua.transport.onMessage({
      data: testUA.inviteRequest(ua, {
        videoBandwidth: "1024"
      })
    });
    testUA.triggerOnIceCandidate(session);
    expect(onReInviteEvent).toEqual(true)
    expect(session.rtcMediaHandler.peerConnection.remoteDescription.getVideoBandwidth()).toEqual( "512")
    expect(session.status).toEqual( RTCSession.C.STATUS_CONFIRMED);

    ua.transport.onMessage({
      data: testUA.ackResponse(ua)
    });
    expect(session.status).toEqual( RTCSession.C.STATUS_CONFIRMED);
    
  });
  it('request with no audio/video change received', function() {
    var onReInviteEvent = false;
    ua.on('onReInvite', function(e) {
      onReInviteEvent = true;
    });

    ua.transport.onMessage({
      data: testUA.inviteRequest(ua, {
        videoPort: "0",
        videoBandwidth: "1024"
      })
    });
    testUA.triggerOnIceCandidate(session);
    expect(!onReInviteEvent).toEqual(true)
    expect(session.rtcMediaHandler.peerConnection.remoteDescription.getVideoBandwidth()).toEqual( "1024")
    expect(session.status).toEqual( RTCSession.C.STATUS_WAITING_FOR_ACK);

    ua.transport.onMessage({
      data: testUA.ackResponse(ua)
    });
    expect(session.status).toEqual( RTCSession.C.STATUS_CONFIRMED);
    
  });
});