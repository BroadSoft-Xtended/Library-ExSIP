module( "incoming call", {
  setup: function() {
    ua = TestExSIP.Helpers.createFakeUA({trace_sip: true, use_preloaded_route: false});
    ua.on('newRTCSession', function(e){ session = e.data.session; });
    TestExSIP.Helpers.mockWebRTC();
    TestExSIP.Helpers.start(ua);

    ua.transport.onMessage({data: TestExSIP.Helpers.initialInviteRequest(ua, {})});
  }, teardown: function() {
  }
});
test('terminate before answering', function() {
  session.terminate();
  var cancelRequest = TestExSIP.Helpers.popMessageSent();
  strictEqual(cancelRequest.method, ExSIP.C.CANCEL, "Should send a cancel request");
});
test('with Firefox and null candidate', function() {
  window.mozRTCPeerConnection = {};
  session.answer();
  TestExSIP.Helpers.triggerOnIceCandidate(session, {withoutCandidate: true});
  var answerMsg = TestExSIP.Helpers.popMessageSent(ua);
  strictEqual(answerMsg.status_code, 200);
  window.mozRTCPeerConnection = undefined;
});
