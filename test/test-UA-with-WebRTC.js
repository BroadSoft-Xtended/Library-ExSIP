module( "ws_servers", {
  setup: function() {
    ua = TestExSIP.Helpers.createFakeUA({ws_servers: [
      {'ws_uri':'ws://localhost:12345', 'weight':5},
      {'ws_uri':'ws://localhost:23456', 'weight':5},
      {'ws_uri':'ws://localhost:34567', 'weight':10}
    ], max_transport_recovery_attempts: "1",
      connection_recovery_min_interval: "0"});
    ua.on('newRTCSession', function(e){ session = e.data.session; });
    TestExSIP.Helpers.mockWebRTC();

    ua.setRtcMediaHandlerOptions({videoBandwidth: '512', disableICE: true});
    TestExSIP.Helpers.startAndConnect(ua);
  }, teardown: function() {
  }
});
test('on 503 response', function() {
  var onTransportErrorCalled = false;
  ua.onTransportError = function(){onTransportErrorCalled = true};
  TestExSIP.Helpers.startAndConnect(ua);

  ua.transport.onMessage({data: TestExSIP.Helpers.inviteResponse(ua, {status_code: "503 Service Unavailable"})});
  strictEqual(onTransportErrorCalled, true);
});
test('getNextWsServer', function() {
  var firstServer = ua.transport.server.ws_uri;
  var servers = ua.configuration.ws_servers.map(function(server){return server.ws_uri;});
  notStrictEqual(servers.indexOf(firstServer), -1);
  strictEqual(ua.usedServers.length, 1);

  ua.onTransportError(ua.transport);
  servers.splice(servers.indexOf(firstServer), 1);
  var secondServer = ua.transport.server.ws_uri;
  notStrictEqual(servers.indexOf(secondServer), -1);
  strictEqual(servers.length, 2);
  strictEqual(ua.usedServers.length, 2);

  ua.onTransportError(ua.transport);
  servers.splice(servers.indexOf(secondServer), 1);
  var thirdServer = ua.transport.server.ws_uri
  notStrictEqual(servers.indexOf(thirdServer), -1);
  strictEqual(servers.length, 1);
  strictEqual(ua.usedServers.length, 3);

  // should reset the used servers and start over again with configuration ws_servers
  ua.onTransportError(ua.transport);
  var servers = ua.configuration.ws_servers.map(function(server){return server.ws_uri;});
  notStrictEqual(servers.indexOf(ua.transport.server.ws_uri), -1);
  strictEqual(ua.usedServers.length, 1);
});

module( "setRtcMediaHandlerOptions", {
  setup: function() {
    ua = TestExSIP.Helpers.createFakeUA({trace_sip: true, use_preloaded_route: false});
    ua.on('newRTCSession', function(e){ session = e.data.session; });
    TestExSIP.Helpers.mockWebRTC();

    ua.setRtcMediaHandlerOptions({videoBandwidth: '512', disableICE: true});
    TestExSIP.Helpers.startAndConnect(ua);
  }, teardown: function() {
  }
});
test('without b=AS', function() {
  testInviteRTCMessage({withoutVideoBandwidth: true});
});

test('with b=AS', function() {
  testInviteRTCMessage({withoutVideoBandwidth: false});
});

function testInviteRTCMessage(options) {
  ua.transport.onMessage({data: TestExSIP.Helpers.ringingResponse(ua)});
  ua.transport.onMessage({data: TestExSIP.Helpers.inviteResponse(ua, options)});
  strictEqual(session.rtcMediaHandler.peerConnection.remoteDescription.getVideoBandwidth(), "512")
}