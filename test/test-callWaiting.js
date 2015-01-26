require('./include/common');
var testUA = require('./include/testUA');
var ExSIP = require('../');

module.exports = {
  setUp: function (callback) {
    ua = testUA.createFakeUA({trace_sip: true, use_preloaded_route: false});
    ua.on('newRTCSession', function(e){ session = e.data.session; });
    testUA.mockWebRTC();
    testUA.start(ua);
    testUA.receiveInviteAndAnswer();
    callback();
  },
  '2nd incoming call': function(test) {
    var secondCallSession = null;
    ua.on('newRTCSession', function(e){ secondCallSession = e.data.session; });
    var secondCallInviteOptions = {from: "<sip:1234@broadsoft.com>;tag=87654321",
      callId: "1234567890987654321", branch: "z9hG4bKabcd123456"};
    ua.transport.onMessage({data: testUA.initialInviteRequest(ua, secondCallInviteOptions)});
    test.strictEqual(secondCallSession.remote_identity.uri.toString(), "sip:1234@broadsoft.com", "Should emitting new session");
    test.done();
  }
};
