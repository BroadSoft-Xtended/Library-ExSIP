module( "failover setup", {
  setup: function() {
    ua = TestExSIP.Helpers.createUAAndCall({ws_servers: [
      {'ws_uri':'ws://localhost:12345', 'weight':5},
      {'ws_uri':'ws://localhost:23456', 'weight':5},
      {'ws_uri':'ws://localhost:34567', 'weight':10}
    ], max_transport_recovery_attempts: "1",
      connection_recovery_min_interval: "2",
      ws_server_reconnection_timeout: "0"});
  }, teardown: function() {
  }
});

test('WEBRTC-48 : on 503 response with multiple servers', function() {
  var disconnectedEvent;
  var retryTimeInMs = '';
  ua.on('disconnected', function(e){ disconnectedEvent = e; });
  ua.retry = function(timeInMs, server, callback){
    retryTimeInMs = timeInMs;
    var t = new ExSIP.Transport(ua, server);
    callback(t);
    t.onOpen();
  }

  ua.transport.onMessage({data: TestExSIP.Helpers.inviteResponse(ua, {status_code: "503 Service Unavailable", retryAfter: 30})});
  strictEqual(disconnectedEvent.data.transport !== undefined, true, "Should trigger disconnected event with transport specified");
  strictEqual(disconnectedEvent.data.retryAfter, undefined, "Should trigger disconnected event without retryAfter specified");
  strictEqual(disconnectedEvent.data.reason, 'Service Unavailable', "Should trigger disconnected event with reason specified");
  strictEqual(disconnectedEvent.data.code, 503, "Should trigger disconnected event with code specified");
  strictEqual(retryTimeInMs, 0, "Should call retry");

  var inviteMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(inviteMsg.method, ExSIP.C.INVITE);
});

test('getNextWsServer', function() {
  var nextRetryIn = '';
  ua.retry = function(retry, server){nextRetryIn = retry; new ExSIP.Transport(ua, server);}
  var firstServer = ua.transport.server.ws_uri;
  strictEqual(ua.usedServers.length, 1, "should have used one server");

  ua.onTransportError(ua.transport);
  var secondServer = ua.transport.server.ws_uri;
  notStrictEqual(secondServer, firstServer, "should not match first server used");
  strictEqual(nextRetryIn, 0, "should retry instantly");
  strictEqual(ua.usedServers.length, 2, "should have used two servers");
  strictEqual(ua.transportRecoverAttempts, 0, "should NOT count as transport recover attempt");
  nextRetryIn = '';

  ua.onTransportError(ua.transport);
  var thirdServer = ua.transport.server.ws_uri;
  notStrictEqual(thirdServer, firstServer, "should not match first server used");
  notStrictEqual(thirdServer, secondServer, "should not match second server used");
  strictEqual(nextRetryIn, 0, "should retry instantly");
  strictEqual(ua.usedServers.length, 3, "should have used three servers");
  nextRetryIn = '';

  // should reset the used servers
  ua.onTransportError(ua.transport);
  strictEqual(nextRetryIn, 2, "should retry in 2 seconds");
  strictEqual(ua.usedServers.length, 1, "should have reset used servers to one");
  strictEqual(ua.transportRecoverAttempts, 1, "should count as transport recover attempt");

  ua.onTransportError(ua.transport);
  ua.onTransportError(ua.transport);

  nextRetryIn = '';
  ua.onTransportError(ua.transport);
  strictEqual(nextRetryIn, '', "should NOT call retry as transportRecoverAttempts >= max_transport_recovery_attempts");

});

module( "non-failover setup", {
  setup: function() {
    ua = TestExSIP.Helpers.createUAAndCall({ws_servers: [
      {'ws_uri':'ws://localhost:12345', 'weight':5}
    ], max_transport_recovery_attempts: "10",
      connection_recovery_min_interval: "0",
      ws_server_reconnection_timeout: "0"});
  }, teardown: function() {
  }
});

test('WEBRTC-48 : on 503 response with only one server', function() {
  var disconnectedEvent;
  var retryTimeInMs = '';
  ua.on('disconnected', function(e){ disconnectedEvent = e; });
  ua.retry = function(timeInMs, server, count){retryTimeInMs = timeInMs;}

  ua.transport.onMessage({data: TestExSIP.Helpers.inviteResponse(ua, {status_code: "503 Service Unavailable", retryAfter: 30})});
  strictEqual(disconnectedEvent.data.transport !== undefined, true, "Should trigger disconnected event with transport specified");
  strictEqual(disconnectedEvent.data.retryAfter, undefined, "Should trigger disconnected event without retryAfter specified");
  strictEqual(disconnectedEvent.data.reason, 'Service Unavailable', "Should trigger disconnected event with reason specified");
  strictEqual(disconnectedEvent.data.code, 503, "Should trigger disconnected event with code specified");
  strictEqual(retryTimeInMs, '', "Should NOT call retry");
});

test('WEBRTC-51 : disconnect while in call', function() {
  var retryTimeInMs = '';
  ua.retry = function(timeInMs, server, count){retryTimeInMs = timeInMs;}
  ua.transport.onMessage({data: TestExSIP.Helpers.inviteResponse(ua)});

  ua.transport.readyState = function(){return WebSocket.CLOSED;};
  ua.transport.onClose({wasClean: false});
  strictEqual(ua.usedServers.length, 2, "Should have two used servers after reConnect()");
  retryTimeInMs = '';

  ua.transport.onClose({wasClean: false});
  strictEqual(retryTimeInMs, 0, "Should call retry");
});

module( "setRtcMediaHandlerOptions", {
  setup: function() {
    ua = TestExSIP.Helpers.createFakeUA({trace_sip: true, use_preloaded_route: false});
    ua.on('newRTCSession', function(e){ session = e.data.session; });
    TestExSIP.Helpers.mockWebRTC();

    ua.setRtcMediaHandlerOptions({videoBandwidth: '512'});
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