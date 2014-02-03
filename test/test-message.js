module( "message", {
  setup: function() {
    ua = TestExSIP.Helpers.createFakeUA({trace_sip: true, use_preloaded_route: false});
    ua.on('newRTCSession', function(e){ session = e.data.session; });
    TestExSIP.Helpers.mockWebRTC();
    TestExSIP.Helpers.startAndConnect(ua);

    ua.transport.onMessage({data: TestExSIP.Helpers.ringingResponse(ua)});
  }, teardown: function() {
  }
});
test('response with statusCode 606 not acceptable', function() {
  var messageText;
  session.on('failed', function(e){
    messageText = e.data.cause;
  });
  ua.transport.onMessage({data: TestExSIP.Helpers.inviteResponse(ua, {noSdp: true, status_code: '606 Not Acceptable'})});
  TestExSIP.Helpers.ackResponse(ua);
  strictEqual('Not Acceptable', messageText);
});
