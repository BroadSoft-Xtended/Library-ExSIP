require('./include/common');
var Transport = require('../src/Transport');

describe('failover', function() {

  beforeEach(function() {
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
  });

  it('WEBRTC-48 : on 503 response with multiple servers', function() {
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
    expect(disconnectedEvent.data.transport !== undefined).toEqual( true, "Should trigger disconnected event with transport specified");
    expect(disconnectedEvent.data.retryAfter).toEqual( undefined, "Should trigger disconnected event without retryAfter specified");
    expect(disconnectedEvent.data.reason).toEqual( 'Service Unavailable', "Should trigger disconnected event with reason specified");
    expect(disconnectedEvent.data.code).toEqual( 503, "Should trigger disconnected event with code specified");
    expect(retryTimeInMs).toEqual( 0, "Should call retry");

    var inviteMsg = testUA.popMessageSentAndClear(ua);
    expect(inviteMsg.method).toEqual( ExSIP_C.INVITE);
    
  });

  it('237388 : route-advance to next WRS when an INVITE is timed-out', function() {
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
    expect(secondServer).toNotEqual( firstServer, "Should call again with other WRS server");
    expect(secondServer).toNotEqual( '', "Should call again with non empty WRS server");
    
  });

  it('getNextWsServer', function() {
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
    expect(ua.usedServers.length).toEqual( 1, "should have used one server");

    ua.onTransportError(transport);
    var secondServer = transport.server.ws_uri;
    expect(secondServer).toNotEqual( firstServer, "should not match first server used");
    expect(nextRetryIn).toEqual( 0, "should retry instantly");
    expect(ua.usedServers.length).toEqual( 2, "should have used two servers");
    expect(ua.transportRecoverAttempts).toEqual( 0, "should NOT count as transport recover attempt");
    nextRetryIn = '';

    ua.onTransportError(transport);
    var thirdServer = transport.server.ws_uri;
    expect(thirdServer).toNotEqual( firstServer, "should not match first server used");
    expect(thirdServer).toNotEqual( secondServer, "should not match second server used");
    expect(nextRetryIn).toEqual( 0, "should retry instantly");
    expect(ua.usedServers.length).toEqual( 3, "should have used three servers");
    nextRetryIn = '';

    // should reset the used servers
    ua.onTransportError(transport);
    expect(nextRetryIn).toEqual( 2, "should retry in 2 seconds");
    expect(ua.usedServers.length).toEqual( 1, "should have reset used servers to one");
    expect(ua.transportRecoverAttempts).toEqual( 1, "should count as transport recover attempt : "+ua.transportRecoverAttempts);

    ua.onTransportError(transport);
    ua.onTransportError(transport);

    nextRetryIn = '';
    ua.onTransportError(transport);
    expect(nextRetryIn).toEqual( '', "should NOT call retry as transportRecoverAttempts >= max_transport_recovery_attempts");

    
  });
});

describe('non failover', function() {

  beforeEach(function() {
    ua = testUA.createUAAndCall({
      ws_servers: [{
        'ws_uri': 'ws://localhost:12345',
        'weight': 5
      }],
      max_transport_recovery_attempts: "10",
      connection_recovery_min_interval: "0",
      ws_server_reconnection_timeout: "0"
    });
  });

  it('WEBRTC-48 : on 503 response with only one server', function() {
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
    expect(disconnectedEvent.data.transport !== undefined).toEqual( true, "Should trigger disconnected event with transport specified");
    expect(disconnectedEvent.data.retryAfter).toEqual( undefined, "Should trigger disconnected event without retryAfter specified");
    expect(disconnectedEvent.data.reason).toEqual( 'Service Unavailable', "Should trigger disconnected event with reason specified");
    expect(disconnectedEvent.data.code).toEqual( 503, "Should trigger disconnected event with code specified");
    expect(retryTimeInMs).toEqual( '', "Should NOT call retry");
    
  });

  it('WEBRTC-51 : disconnect while in call', function() {
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
    expect(ua.usedServers.length).toEqual( 2, "Should have two used servers after reConnect()");
    retryTimeInMs = '';

    ua.transport.onClose({
      wasClean: false
    });
    expect(retryTimeInMs).toEqual( 0, "Should call retry");
    
  });
});

describe('RTCHandlerOptions', function() {

  beforeEach(function() {
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
  });

  it('without b=AS', function() {
    testInviteRTCMessage({
      withoutVideoBandwidth: true
    });
    
  });

  it('with b=AS', function() {
    testInviteRTCMessage({
      withoutVideoBandwidth: false
    });
    
  });
});

function testInviteRTCMessage(options) {
  ua.transport.onMessage({
    data: testUA.ringingResponse(ua)
  });
  ua.transport.onMessage({
    data: testUA.inviteResponse(ua, options)
  });
  expect(session.rtcMediaHandler.peerConnection.remoteDescription.getVideoBandwidth()).toEqual( "512")
}