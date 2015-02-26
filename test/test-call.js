require('./include/common');

describe('call', function() {

  beforeEach(function() {
    ua = testUA.createFakeUA({trace_sip: true, use_preloaded_route: false});
    ua.on('newRTCSession', function(e){ session = e.data.session; });
    testUA.mockWebRTC();
    testUA.startAndConnect(ua);

    ua.transport.onMessage({data: testUA.ringingResponse(ua)});
    ua.transport.onMessage({data: testUA.inviteResponse(ua)});
  });

  it('hangup', function() {
    session.terminate();
    var byeMsg = testUA.popMessageSentAndClear(ua);
    testUA.responseFor(byeMsg, {method: 'BYE', noSdp: true});
    var ackMsg = testUA.popMessageSentAndClear(ua);
    expect(ackMsg.method).toEqual(ExSIP.C.ACK);
  });
});
