require('./include/common');

describe('cancel', function() {

  beforeEach(function() {
    ua = testUA.createFakeUA({trace_sip: true, use_preloaded_route: false});
    ua.on('newRTCSession', function(e){ session = e.data.session; });
    testUA.mockWebRTC();
    testUA.startAndConnect(ua);
  });

  it('after 1xx provisional response with 200 response to INVITE', function() {
    var inviteMsg = testUA.popMessageSentAndClear(ua);
    expect(inviteMsg.method).toEqual( ExSIP_C.INVITE);

    ua.transport.onMessage({data: testUA.ringingResponse(ua, {status_code: "100 Trying"})});
    expect(session.status).toEqual( RTCSession.C.STATUS_INVITE_SENT);

    session.terminate();
    var cancelMsg = testUA.popMessageSentAndClear(ua);
    expect(cancelMsg.method).toEqual( ExSIP_C.CANCEL);

    testUA.responseFor(inviteMsg);
    var byeMsg = testUA.popMessageSent(ua);
    var ackMsg = testUA.popMessageSentAndClear(ua);
    expect(ackMsg.method).toEqual( ExSIP_C.ACK);
    expect(byeMsg.method).toEqual( ExSIP_C.BYE);

    testUA.responseFor(cancelMsg, {method: ExSIP_C.CANCEL});
    ackMsg = testUA.popMessageSentAndClear(ua);
    expect(ackMsg).toEqual( null);

    testUA.responseFor(byeMsg, {method: ExSIP_C.BYE});
    ackMsg = testUA.popMessageSentAndClear(ua);
    expect(ackMsg.method).toEqual( ExSIP_C.ACK);
    
  });

  it('in between 200 response but before sending ACK', function() {
    var inviteMsg = testUA.popMessageSentAndClear(ua);

    ua.transport.onMessage({data: testUA.ringingResponse(ua, {status_code: "100 Trying"})});

    // stub setRemoteDescription to not return immediately
    var setRemoteDescriptionSuccess;
    session.rtcMediaHandler.peerConnection.setRemoteDescription = function(description, success, failure){
      console.log("-- RTCPeerConnection.setRemoteDescription() : "+Utils.toString(description));
      this.remoteDescription = description;
      setRemoteDescriptionSuccess = success;
    };
    testUA.responseFor(inviteMsg);
    session.terminate();

    setRemoteDescriptionSuccess();

    var ackMsg = testUA.popMessageSent(ua);
    expect(ackMsg.method).toEqual( ExSIP_C.ACK);

    var byeMsg = testUA.popMessageSentAndClear(ua);
    expect(byeMsg.method).toEqual( ExSIP_C.BYE);

    testUA.responseFor(byeMsg, {method: ExSIP_C.BYE});
    ackMsg = testUA.popMessageSentAndClear(ua);
    expect(ackMsg.method).toEqual( ExSIP_C.ACK);
    
  });

  it('after 1xx provisional response with 487 response to INVITE', function() {
    var failedCause = '';
    session.on('failed', function(e){ failedCause = e.data.cause; });

    var inviteMsg = testUA.popMessageSentAndClear(ua);
    expect(inviteMsg.method).toEqual( ExSIP_C.INVITE);

    ua.transport.onMessage({data: testUA.ringingResponse(ua, {status_code: "100 Trying"})});
    expect(session.status).toEqual( RTCSession.C.STATUS_INVITE_SENT);

    session.terminate();
    var cancelMsg = testUA.popMessageSentAndClear(ua);
    expect(cancelMsg.method).toEqual( ExSIP_C.CANCEL);

    testUA.responseFor(inviteMsg, {status_code: "487 Request Terminated"});
    var ackMsg = testUA.popMessageSentAndClear(ua);
    expect(ackMsg.method).toEqual( ExSIP_C.ACK);

    testUA.responseFor(cancelMsg, {method: ExSIP_C.CANCEL});
    ackMsg = testUA.popMessageSentAndClear(ua);
    expect(ackMsg).toEqual( null);

    expect(failedCause).toEqual( 'Canceled');
    
  });
});
