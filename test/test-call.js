require('./include/common');
var testUA = require('./include/testUA');
var ExSIP = require('../');


module.exports = {
  setUp: function (callback) {
    ua = testUA.createFakeUA({trace_sip: true, use_preloaded_route: false});
    ua.on('newRTCSession', function(e){ session = e.data.session; });
    testUA.mockWebRTC();
    testUA.startAndConnect(ua);

    ua.transport.onMessage({data: testUA.ringingResponse(ua)});
    ua.transport.onMessage({data: testUA.inviteResponse(ua)});
    callback();
  },
  'hangup': function(test) {
    session.terminate();
    var byeMsg = testUA.popMessageSentAndClear(ua);
    testUA.responseFor(byeMsg, {method: 'BYE', noSdp: true});
    var ackMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(ackMsg.method, ExSIP.C.ACK);
    test.done();
  }
}