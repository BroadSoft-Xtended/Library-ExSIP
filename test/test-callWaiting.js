require('./include/common');

describe('callWaiting', function() {

  beforeEach(function() {
    ua = testUA.createFakeUA({trace_sip: true, use_preloaded_route: false});
    ua.on('newRTCSession', function(e){ session = e.data.session; });
    testUA.mockWebRTC();
    testUA.start(ua);
    testUA.receiveInviteAndAnswer();
  });

  it('2nd incoming call', function() {
    var secondCallSession = null;
    ua.on('newRTCSession', function(e){ secondCallSession = e.data.session; });
    var secondCallInviteOptions = {from: "<sip:1234@broadsoft.com>;tag=87654321",
      callId: "1234567890987654321", branch: "z9hG4bKabcd123456"};
    ua.transport.onMessage({data: testUA.initialInviteRequest(ua, secondCallInviteOptions)});
    expect(secondCallSession.remote_identity.uri.toString()).toEqual("sip:1234@broadsoft.com", "Should emitting new session");
  });

});
