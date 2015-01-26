require('./include/common');
var testUA = require('./include/testUA');
var ExSIP = require('../');

module.exports = {

  setUp: function(callback) {
    ua = testUA.createFakeUA({
      trace_sip: true,
      use_preloaded_route: false
    });
    ua.on('newRTCSession', function(e) {
      session = e.data.session;
    });
    testUA.mockWebRTC();
    testUA.startAndConnect(ua);

    ua.transport.onMessage({
      data: testUA.ringingResponse(ua)
    });
    callback();
  },

  'response with statusCode 606 not acceptable': function(test) {
    var messageText;
    session.on('failed', function(e) {
      messageText = e.data.cause;
    });
    ua.transport.onMessage({
      data: testUA.inviteResponse(ua, {
        noSdp: true,
        status_code: '606 Not Acceptable'
      })
    });
    testUA.ackResponse(ua);
    test.strictEqual('Not Acceptable', messageText);
    test.done();
  }
}