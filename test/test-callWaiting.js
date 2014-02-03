module( "call waiting", {
  setup: function() {
    ua = TestExSIP.Helpers.createFakeUA({trace_sip: true, use_preloaded_route: false});
    ua.on('newRTCSession', function(e){ session = e.data.session; });
    TestExSIP.Helpers.mockWebRTC();
    TestExSIP.Helpers.start(ua);
    TestExSIP.Helpers.receiveInviteAndAnswer();
  }, teardown: function() {
  }
});
test('2nd incoming call', function() {
  var secondCallSession = null;
  ua.on('newRTCSession', function(e){ secondCallSession = e.data.session; });
  var secondCallInviteOptions = {from: "<sip:1234@exarionetworks.com>;tag=87654321",
    callId: "1234567890987654321", branch: "z9hG4bKabcd123456"};
  ua.transport.onMessage({data: TestExSIP.Helpers.initialInviteRequest(ua, secondCallInviteOptions)});
  strictEqual(secondCallSession.remote_identity.uri.toString(), "sip:1234@exarionetworks.com", "Should emitting new session");
});