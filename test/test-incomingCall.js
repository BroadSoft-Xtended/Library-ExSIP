module( "incoming call", {
  setup: function() {
    ua = TestExSIP.Helpers.createFakeUA({trace_sip: true, use_preloaded_route: false});
    ua.on('newRTCSession', function(e){ session = e.data.session; });
    TestExSIP.Helpers.mockWebRTC();
    TestExSIP.Helpers.start(ua);

  }, teardown: function() {
  }
});
test('terminate before answering', function() {
  ua.transport.onMessage({data: TestExSIP.Helpers.initialInviteRequest(ua, {})});
  session.terminate();
  var cancelRequest = TestExSIP.Helpers.popMessageSent();
  strictEqual(cancelRequest.method, ExSIP.C.CANCEL, "Should send a cancel request");
});
test('with Firefox and null candidate', function() {
  ua.transport.onMessage({data: TestExSIP.Helpers.initialInviteRequest(ua, {})});
  window.mozRTCPeerConnection = {};
  session.answer();
  TestExSIP.Helpers.triggerOnIceCandidate(session, {withoutCandidate: true});
  var answerMsg = TestExSIP.Helpers.popMessageSent(ua);
  strictEqual(answerMsg.status_code, 200);
  window.mozRTCPeerConnection = undefined;
});
test('initial invite without sdp', function() {
  ua.transport.onMessage({data: TestExSIP.Helpers.initialInviteRequest(ua, {noSdp: true})});
  session.answer();
  TestExSIP.Helpers.triggerOnIceCandidate(session);
  var answerMsg = TestExSIP.Helpers.popMessageSent(ua);
  strictEqual(answerMsg.status_code, 200);
  notStrictEqual(answerMsg.body, '', 'should have sdp');
});
