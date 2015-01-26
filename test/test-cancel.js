require('./include/common');
var testUA = require('./include/testUA');
var ExSIP = require('../');
var ExSIP_C = require('../src/Constants');
var RTCSession = require('../src/RTCSession');
var Utils = require('../src/Utils');

module.exports = {
  setUp: function (callback) {
    ua = testUA.createFakeUA({trace_sip: true, use_preloaded_route: false});
    ua.on('newRTCSession', function(e){ session = e.data.session; });
    testUA.mockWebRTC();
    testUA.startAndConnect(ua);
    callback();
  },

  'after 1xx provisional response with 200 response to INVITE': function(test) {
    var inviteMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(inviteMsg.method, ExSIP_C.INVITE);

    ua.transport.onMessage({data: testUA.ringingResponse(ua, {status_code: "100 Trying"})});
    test.strictEqual(session.status, RTCSession.C.STATUS_INVITE_SENT);

    session.terminate();
    var cancelMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(cancelMsg.method, ExSIP_C.CANCEL);

    testUA.responseFor(inviteMsg);
    var byeMsg = testUA.popMessageSent(ua);
    var ackMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(ackMsg.method, ExSIP_C.ACK);
    test.strictEqual(byeMsg.method, ExSIP_C.BYE);

    testUA.responseFor(cancelMsg, {method: ExSIP_C.CANCEL});
    ackMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(ackMsg, null);

    testUA.responseFor(byeMsg, {method: ExSIP_C.BYE});
    ackMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(ackMsg.method, ExSIP_C.ACK);
    test.done();
  },

  'in between 200 response but before sending ACK': function(test) {
    var inviteMsg = testUA.popMessageSentAndClear(ua);

    ua.transport.onMessage({data: testUA.ringingResponse(ua, {status_code: "100 Trying"})});

    // stub setRemoteDescription to not return immediately
    var setRemoteDescriptionSuccess;
    session.rtcMediaHandler.peerConnection.setRemoteDescription = function(description, success, failure){
      console.log("-- RTCPeerConnection.setRemoteDescription() : "+Utils.toString(description));
      this.remoteDescription = description;
      setRemoteDescriptionSuccess = success;
    };
    testUA.responseFor(inviteMsg);
    session.terminate();

    setRemoteDescriptionSuccess();

    var ackMsg = testUA.popMessageSent(ua);
    test.strictEqual(ackMsg.method, ExSIP_C.ACK);

    var byeMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(byeMsg.method, ExSIP_C.BYE);

    testUA.responseFor(byeMsg, {method: ExSIP_C.BYE});
    ackMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(ackMsg.method, ExSIP_C.ACK);
    test.done();
  },

  'after 1xx provisional response with 487 response to INVITE': function(test) {
    var failedCause = '';
    session.on('failed', function(e){ failedCause = e.data.cause; });

    var inviteMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(inviteMsg.method, ExSIP_C.INVITE);

    ua.transport.onMessage({data: testUA.ringingResponse(ua, {status_code: "100 Trying"})});
    test.strictEqual(session.status, RTCSession.C.STATUS_INVITE_SENT);

    session.terminate();
    var cancelMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(cancelMsg.method, ExSIP_C.CANCEL);

    testUA.responseFor(inviteMsg, {status_code: "487 Request Terminated"});
    var ackMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(ackMsg.method, ExSIP_C.ACK);

    testUA.responseFor(cancelMsg, {method: ExSIP_C.CANCEL});
    ackMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(ackMsg, null);

    test.strictEqual(failedCause, 'Canceled');
    test.done();
  }
}
