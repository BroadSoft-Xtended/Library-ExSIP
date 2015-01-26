module( "failover setup", {
  setup: function() {
    ua = test.createUAAndCall({ws_servers: [
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

  ua.transport.onMessage({data: test.inviteResponse(ua, {status_code: "503 Service Unavailable", retryAfter: 30})});
  test.test.strictEqual(disconnectedEvent.data.transport !== undefined, true, "Should trigger disconnected event with transport specified");
  test.test.strictEqual(disconnectedEvent.data.retryAfter, undefined, "Should trigger disconnected event without retryAfter specified");
  test.test.strictEqual(disconnectedEvent.data.reason, 'Service Unavailable', "Should trigger disconnected event with reason specified");
  test.test.strictEqual(disconnectedEvent.data.code, 503, "Should trigger disconnected event with code specified");
  test.test.strictEqual(retryTimeInMs, 0, "Should call retry");

  var inviteMsg = test.popMessageSentAndClear(ua);
  test.test.strictEqual(inviteMsg.method, ExSIP.C.INVITE);
});

test('237388 : route-advance to next WRS when an INVITE is timed-out', function() {
  var branch = Object.keys(ua.transactions.ict)[0];
  var clientTransaction = ua.transactions.ict[branch];
  var firstServer = ua.transport.server.ws_uri;

  var retryTimeInMs = '', retryServer;
  ua.retry = function(timeInMs, server, count){retryTimeInMs = timeInMs; retryServer = server;}
  clientTransaction.timer_B();

  // call again
  test.connect(ua);
  var secondServer = ua.transport.server.ws_uri;
  notStrictEqual(secondServer, firstServer, "Should call again with other WRS server");
  notStrictEqual(secondServer, '', "Should call again with non empty WRS server");
});

test('getNextWsServer', function() {
  var nextRetryIn = '';
  ua.retry = function(retry, server){nextRetryIn = retry; new ExSIP.Transport(ua, server);}
  var firstServer = ua.transport.server.ws_uri;
  test.test.strictEqual(ua.usedServers.length, 1, "should have used one server");

  ua.onTransportError(ua.transport);
  var secondServer = ua.transport.server.ws_uri;
  notStrictEqual(secondServer, firstServer, "should not match first server used");
  test.test.strictEqual(nextRetryIn, 0, "should retry instantly");
  test.test.strictEqual(ua.usedServers.length, 2, "should have used two servers");
  test.test.strictEqual(ua.transportRecoverAttempts, 0, "should NOT count as transport recover attempt");
  nextRetryIn = '';

  ua.onTransportError(ua.transport);
  var thirdServer = ua.transport.server.ws_uri;
  notStrictEqual(thirdServer, firstServer, "should not match first server used");
  notStrictEqual(thirdServer, secondServer, "should not match second server used");
  test.test.strictEqual(nextRetryIn, 0, "should retry instantly");
  test.test.strictEqual(ua.usedServers.length, 3, "should have used three servers");
  nextRetryIn = '';

  // should reset the used servers
  ua.onTransportError(ua.transport);
  test.test.strictEqual(nextRetryIn, 2, "should retry in 2 seconds");
  test.test.strictEqual(ua.usedServers.length, 1, "should have reset used servers to one");
  test.test.strictEqual(ua.transportRecoverAttempts, 1, "should count as transport recover attempt");

  ua.onTransportError(ua.transport);
  ua.onTransportError(ua.transport);

  nextRetryIn = '';
  ua.onTransportError(ua.transport);
  test.test.strictEqual(nextRetryIn, '', "should NOT call retry as transportRecoverAttempts >= max_transport_recovery_attempts");

});

module( "non-failover setup", {
  setup: function() {
    ua = test.createUAAndCall({ws_servers: [
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

  ua.transport.onMessage({data: test.inviteResponse(ua, {status_code: "503 Service Unavailable", retryAfter: 30})});
  test.test.strictEqual(disconnectedEvent.data.transport !== undefined, true, "Should trigger disconnected event with transport specified");
  test.test.strictEqual(disconnectedEvent.data.retryAfter, undefined, "Should trigger disconnected event without retryAfter specified");
  test.test.strictEqual(disconnectedEvent.data.reason, 'Service Unavailable', "Should trigger disconnected event with reason specified");
  test.test.strictEqual(disconnectedEvent.data.code, 503, "Should trigger disconnected event with code specified");
  test.test.strictEqual(retryTimeInMs, '', "Should NOT call retry");
});

test('WEBRTC-51 : disconnect while in call', function() {
  var retryTimeInMs = '';
  ua.retry = function(timeInMs, server, count){retryTimeInMs = timeInMs;}
  ua.transport.onMessage({data: test.inviteResponse(ua)});

  ua.transport.readyState = function(){return WebSocket.CLOSED;};
  ua.transport.onClose({wasClean: false});
  test.test.strictEqual(ua.usedServers.length, 2, "Should have two used servers after reConnect()");
  retryTimeInMs = '';

  ua.transport.onClose({wasClean: false});
  test.test.strictEqual(retryTimeInMs, 0, "Should call retry");
});

module( "setRtcMediaHandlerOptions", {
  setup: function() {
    ua = test.createFakeUA({trace_sip: true, use_preloaded_route: false});
    ua.on('newRTCSession', function(e){ session = e.data.session; });
    test.mockWebRTC();

    ua.setRtcMediaHandlerOptions({videoBandwidth: '512'});
    test.startAndConnect(ua);
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
  ua.transport.onMessage({data: test.ringingResponse(ua)});
  ua.transport.onMessage({data: test.inviteResponse(ua, options)});
  test.test.strictEqual(session.rtcMediaHandler.peerConnection.remoteDescription.getVideoBandwidth(), "512")
}