require('./include/common');

describe('incomingCall', function() {

  beforeEach(function() {
    ua = testUA.createFakeUA({
      trace_sip: true,
      use_preloaded_route: false
    });
    ua.on('newRTCSession', function(e) {
      session = e.data.session;
    });
    testUA.mockWebRTC();
    testUA.start(ua);
  });

  it('terminate before answering', function() {
    ua.transport.onMessage({
      data: testUA.initialInviteRequest(ua, {})
    });
    session.terminate();
    var answerMsg = testUA.popMessageSent(ua);
    expect(answerMsg.status_code).toEqual(486, "Should send a 486 response");
  });

  it('with Firefox and not null candidate', function() {
    ua.transport.onMessage({
      data: testUA.initialInviteRequest(ua, {})
    });
    mozRTCPeerConnection = {};
    session.answer();
    testUA.triggerOnIceCandidate(session);
    var answerMsg = testUA.popMessageSent(ua);
    expect(answerMsg.status_code).toEqual(200);
    mozRTCPeerConnection = undefined;
  });

  it('initial invite without sdp', function() {
    ua.transport.onMessage({
      data: testUA.initialInviteRequest(ua, {
        noSdp: true
      })
    });
    session.answer();
    testUA.triggerOnIceCandidate(session);
    var answerMsg = testUA.popMessageSent(ua);
    expect(answerMsg.status_code).toEqual(200);
    expect(answerMsg.body).toNotEqual('', 'should have sdp');

  });

  it('INFO received after INVITE', function() {
    var answerMsg = testUA.receiveInviteAndAnswer();
    var started = false;
    session.on('started', function(e) {
      started = true;
    });
    var sdp = '<?xml version="1.0" encoding="utf-8"?>\r\n' +
      '<media_control>\r\n' +
      '<vc_primitive>\r\n' +
      '<to_encoder>\r\n' +
      '<picture_fast_update/>\r\n' +
      '</to_encoder>\r\n' +
      '</vc_primitive>\r\n' +
      '</media_control>\r\n' +
      '\r\n';
    testUA.requestFor(answerMsg, {
      method: 'INFO',
      content_type: 'application/media_control+xml',
      branch: 'z9hG4bK-524287-1---8b28117fe385ce21',
      sdp: sdp
    });

    var infoAnswerMsg = testUA.popMessageSent(ua);
    expect(infoAnswerMsg.status_code).toEqual(200);
    expect(started).toEqual(true, "should trigger started in order to update video streams");

  });

  it('reINVITE received after INVITE and before ACK', function() {
    var answerMsg = testUA.receiveInviteAndAnswer();
    var reinviteMsg = testUA.initialInviteRequest(ua, {
      branch: 'z9hG4bK-524287-1---ab6ff8065ea5f163',
      to_tag: ';tag=' + answerMsg.to_tag,
      cseq: '33333',
      noSdp: true,
      withoutContentType: true,
      supported: 'replaces'
    });
    ua.transport.onMessage({
      data: reinviteMsg
    });

    var reinviteAnswerMsg = testUA.popMessageSentAndClear(ua);
    expect(reinviteAnswerMsg.status_code).toEqual(500);
    expect(reinviteAnswerMsg.getHeader('Retry-After')).toNotEqual(undefined);
    expect(session.status).toEqual(RTCSession.C.STATUS_WAITING_FOR_ACK);

    testUA.ackResponseFor(answerMsg, {
      branch: 'z9hG4bK-524287-1---e126e35bf46fb226',
      cseq: answerMsg.cseq
    });
    expect(session.status).toEqual(RTCSession.C.STATUS_CONFIRMED);

  });

  it('reINVITE received after INVITE and before ACK', function() {
    var answerMsg = testUA.receiveInviteAndAnswer();
    var reinviteMsg = testUA.initialInviteRequest(ua, {
      branch: 'z9hG4bK-524287-1---ab6ff8065ea5f163',
      to_tag: ';tag=' + answerMsg.to_tag,
      cseq: '33333',
      noSdp: true,
      withoutContentType: true,
      supported: 'replaces'
    });
    ua.transport.onMessage({
      data: reinviteMsg
    });

    var reinviteAnswerMsg = testUA.popMessageSentAndClear(ua);
    expect(reinviteAnswerMsg.status_code).toEqual(500);
    expect(reinviteAnswerMsg.getHeader('Retry-After')).toNotEqual(undefined);
    expect(session.status).toEqual(ExSIP.RTCSession.C.STATUS_WAITING_FOR_ACK);

    testUA.ackResponseFor(answerMsg, {
      branch: 'z9hG4bK-524287-1---e126e35bf46fb226',
      cseq: answerMsg.cseq
    });
    expect(session.status).toEqual(ExSIP.RTCSession.C.STATUS_CONFIRMED);
  });
});