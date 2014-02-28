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
test('with terminate', function() {
  session.terminate();
  var cancelRequest = TestExSIP.Helpers.popMessageSent();
  strictEqual(cancelRequest.method, ExSIP.C.CANCEL, "Should send a cancel request");
});
