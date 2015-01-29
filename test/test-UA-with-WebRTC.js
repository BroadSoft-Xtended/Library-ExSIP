require('./include/common');
var testUA = require('./include/testUA');
var ExSIP = require('../');
var WebRTC = require('../src/WebRTC');
var ExSIP_C = require('../src/Constants');
var Utils = require('../src/Utils');
var Transport = require('../src/Transport');

exports.failover = {

  setUp: function(callback) {
    ua = testUA.createUAAndCall({
      ws_servers: [{
        'ws_uri': 'ws://localhost:12345',
        'weight': 5
      }, {
        'ws_uri': 'ws://localhost:23456',
        'weight': 5
      }, {
        'ws_uri': 'ws://localhost:34567',
        'weight': 10
      }],
      max_transport_recovery_attempts: "1",
      connection_recovery_min_interval: "2",
      ws_server_reconnection_timeout: "0"
    });
    callback();
  },

  'WEBRTC-48 : on 503 response with multiple servers': function(test) {
    var disconnectedEvent;
    var retryTimeInMs = '';
    ua.on('disconnected', function(e) {
      disconnectedEvent = e;
    });
    ua.retry = function(timeInMs, server, callback) {
      retryTimeInMs = timeInMs;
      var t = new Transport(ua, server);
      callback(t);
      t.onOpen();
    }

    ua.transport.onMessage({
      data: testUA.inviteResponse(ua, {
        status_code: "503 Service Unavailable",
        retryAfter: 30
      })
    });
    test.strictEqual(disconnectedEvent.data.transport !== undefined, true, "Should trigger disconnected event with transport specified");
    test.strictEqual(disconnectedEvent.data.retryAfter, undefined, "Should trigger disconnected event without retryAfter specified");
    test.strictEqual(disconnectedEvent.data.reason, 'Service Unavailable', "Should trigger disconnected event with reason specified");
    test.strictEqual(disconnectedEvent.data.code, 503, "Should trigger disconnected event with code specified");
    test.strictEqual(retryTimeInMs, 0, "Should call retry");

    var inviteMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(inviteMsg.method, ExSIP_C.INVITE);
    test.done();
  },

  '237388 : route-advance to next WRS when an INVITE is timed-out': function(test) {
    var branch = Object.keys(ua.transactions.ict)[0];
    var clientTransaction = ua.transactions.ict[branch];
    var firstServer = ua.transport.server.ws_uri;

    var retryTimeInMs = '',
      retryServer;
    ua.retry = function(timeInMs, server, count) {
      console.log('************ retry: ', server);
      retryTimeInMs = timeInMs;
      retryServer = server;
    }
    clientTransaction.timer_B();

    // call again
    testUA.connect(ua);
    var secondServer = ua.transport.server.ws_uri;
    test.notStrictEqual(secondServer, firstServer, "Should call again with other WRS server");
    test.notStrictEqual(secondServer, '', "Should call again with non empty WRS server");
    test.done();
  },

  'getNextWsServer': function(test) {
    var nextRetryIn = '';
    var transport = ua.transport;
    ua.retry = function(retry, server) {
      nextRetryIn = retry;
      var t = new Transport(ua, server);
      t.connect();
    }
    ua.onTransportConnecting = function(t){
      transport = t;
    }
    var firstServer = transport.server.ws_uri;
    test.strictEqual(ua.usedServers.length, 1, "should have used one server");

    ua.onTransportError(transport);
    var secondServer = transport.server.ws_uri;
    test.notStrictEqual(secondServer, firstServer, "should not match first server used");
    test.strictEqual(nextRetryIn, 0, "should retry instantly");
    test.strictEqual(ua.usedServers.length, 2, "should have used two servers");
    test.strictEqual(ua.transportRecoverAttempts, 0, "should NOT count as transport recover attempt");
    nextRetryIn = '';

    ua.onTransportError(transport);
    var thirdServer = transport.server.ws_uri;
    test.notStrictEqual(thirdServer, firstServer, "should not match first server used");
    test.notStrictEqual(thirdServer, secondServer, "should not match second server used");
    test.strictEqual(nextRetryIn, 0, "should retry instantly");
    test.strictEqual(ua.usedServers.length, 3, "should have used three servers");
    nextRetryIn = '';

    // should reset the used servers
    ua.onTransportError(transport);
    test.strictEqual(nextRetryIn, 2, "should retry in 2 seconds");
    test.strictEqual(ua.usedServers.length, 1, "should have reset used servers to one");
    test.strictEqual(ua.transportRecoverAttempts, 1, "should count as transport recover attempt : "+ua.transportRecoverAttempts);

    ua.onTransportError(transport);
    ua.onTransportError(transport);

    nextRetryIn = '';
    ua.onTransportError(transport);
    test.strictEqual(nextRetryIn, '', "should NOT call retry as transportRecoverAttempts >= max_transport_recovery_attempts");

    test.done();
  }
}

exports.nonfailover = {

  setUp: function(callback) {
    ua = testUA.createUAAndCall({
      ws_servers: [{
        'ws_uri': 'ws://localhost:12345',
        'weight': 5
      }],
      max_transport_recovery_attempts: "10",
      connection_recovery_min_interval: "0",
      ws_server_reconnection_timeout: "0"
    });
    callback();
  },

  'WEBRTC-48 : on 503 response with only one server': function(test) {
    var disconnectedEvent;
    var retryTimeInMs = '';
    ua.on('disconnected', function(e) {
      disconnectedEvent = e;
    });
    ua.retry = function(timeInMs, server, count) {
      retryTimeInMs = timeInMs;
    }

    ua.transport.onMessage({
      data: testUA.inviteResponse(ua, {
        status_code: "503 Service Unavailable",
        retryAfter: 30
      })
    });
    test.strictEqual(disconnectedEvent.data.transport !== undefined, true, "Should trigger disconnected event with transport specified");
    test.strictEqual(disconnectedEvent.data.retryAfter, undefined, "Should trigger disconnected event without retryAfter specified");
    test.strictEqual(disconnectedEvent.data.reason, 'Service Unavailable', "Should trigger disconnected event with reason specified");
    test.strictEqual(disconnectedEvent.data.code, 503, "Should trigger disconnected event with code specified");
    test.strictEqual(retryTimeInMs, '', "Should NOT call retry");
    test.done();
  },

  'WEBRTC-51 : disconnect while in call': function(test) {
    var retryTimeInMs = '';
    ua.retry = function(timeInMs, server, count) {
      retryTimeInMs = timeInMs;
    }
    ua.transport.onMessage({
      data: testUA.inviteResponse(ua)
    });

    ua.transport.readyState = function() {
      return 3; //WebSocket.CLOSED
    };
    ua.transport.onClose({
      wasClean: false
    });
    test.strictEqual(ua.usedServers.length, 2, "Should have two used servers after reConnect()");
    retryTimeInMs = '';

    ua.transport.onClose({
      wasClean: false
    });
    test.strictEqual(retryTimeInMs, 0, "Should call retry");
    test.done();
  }
}

exports.setRtcMediaHandlerOptions = {
  setUp: function(callback) {
    ua = testUA.createFakeUA({
      trace_sip: true,
      use_preloaded_route: false
    });
    ua.on('newRTCSession', function(e) {
      session = e.data.session;
    });
    testUA.mockWebRTC();

    ua.setRtcMediaHandlerOptions({
      videoBandwidth: '512'
    });
    testUA.startAndConnect(ua);
    callback();
  },

  'without b=AS': function(test) {
    testInviteRTCMessage(test, {
      withoutVideoBandwidth: true
    });
    test.done();
  },

  'with b=AS': function(test) {
    testInviteRTCMessage(test, {
      withoutVideoBandwidth: false
    });
    test.done();
  }
}

function testInviteRTCMessage(test, options) {
  ua.transport.onMessage({
    data: testUA.ringingResponse(ua)
  });
  ua.transport.onMessage({
    data: testUA.inviteResponse(ua, options)
  });
  test.strictEqual(session.rtcMediaHandler.peerConnection.remoteDescription.getVideoBandwidth(), "512")
}