require('./include/common');

describe('message', function() {

  beforeEach(function() {
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
  });

  it('response with statusCode 606 not acceptable', function() {
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
    expect('Not Acceptable').toEqual( messageText);
    
  });
});