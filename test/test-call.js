module( "call", {
  setup: function() {
    ua = TestExSIP.Helpers.createFakeUA({trace_sip: true, use_preloaded_route: false});
    ua.on('newRTCSession', function(e){ session = e.data.session; });
    TestExSIP.Helpers.mockWebRTC();
    TestExSIP.Helpers.startAndConnect(ua);

    ua.transport.onMessage({data: TestExSIP.Helpers.ringingResponse(ua)});
    ua.transport.onMessage({data: TestExSIP.Helpers.inviteResponse(ua)});
  }, teardown: function() {
  }
});
test('hangup', function() {
  session.terminate();
  var byeMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  TestExSIP.Helpers.responseFor(byeMsg, {method: "BYE", noSdp: true});
  var ackMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(ackMsg.method, ExSIP.C.ACK);
});
