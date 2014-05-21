module( "cancel", {
  setup: function() {
    ua = TestExSIP.Helpers.createFakeUA({trace_sip: true, use_preloaded_route: false});
    ua.on('newRTCSession', function(e){ session = e.data.session; });
    TestExSIP.Helpers.mockWebRTC();
    TestExSIP.Helpers.startAndConnect(ua);

  }, teardown: function() {
  }
});
test('after 1xx provisional response with 200 response to INVITE', function() {
  var inviteMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(inviteMsg.method, ExSIP.C.INVITE);

  ua.transport.onMessage({data: TestExSIP.Helpers.ringingResponse(ua, {status_code: "100 Trying"})});
  strictEqual(session.status, ExSIP.RTCSession.C.STATUS_INVITE_SENT);

  session.terminate();
  var cancelMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(cancelMsg.method, ExSIP.C.CANCEL);

  TestExSIP.Helpers.responseFor(inviteMsg);
  var byeMsg = TestExSIP.Helpers.popMessageSent(ua);
  var ackMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(ackMsg.method, ExSIP.C.ACK);
  strictEqual(byeMsg.method, ExSIP.C.BYE);

  TestExSIP.Helpers.responseFor(cancelMsg, {method: ExSIP.C.CANCEL});
  ackMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(ackMsg, null);

  TestExSIP.Helpers.responseFor(byeMsg, {method: ExSIP.C.BYE});
  ackMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(ackMsg.method, ExSIP.C.ACK);
});

test('after 1xx provisional response with 487 response to INVITE', function() {
  var failedCause = '';
  session.on('failed', function(e){ failedCause = e.data.cause; });

  var inviteMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(inviteMsg.method, ExSIP.C.INVITE);

  ua.transport.onMessage({data: TestExSIP.Helpers.ringingResponse(ua, {status_code: "100 Trying"})});
  strictEqual(session.status, ExSIP.RTCSession.C.STATUS_INVITE_SENT);

  session.terminate();
  var cancelMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(cancelMsg.method, ExSIP.C.CANCEL);

  TestExSIP.Helpers.responseFor(inviteMsg, {status_code: "487 Request Terminated"});
  var ackMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(ackMsg.method, ExSIP.C.ACK);

  TestExSIP.Helpers.responseFor(cancelMsg, {method: ExSIP.C.CANCEL});
  ackMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(ackMsg, null);

  strictEqual(failedCause, 'Canceled');
});
