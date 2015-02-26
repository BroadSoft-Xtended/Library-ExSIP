require('./include/common');

describe('configuration', function() {

  it('p_asserted_identity', function() {
    var ua = testUA.createUAAndCall({p_asserted_identity: 'webrtc_rocks', destination: "other@exsip.net"});
    var inviteRequest = testUA.popMessageSent(ua);
    expect(inviteRequest.getHeader('P-Asserted-Identity')).toEqual( 'webrtc_rocks');
  });

  it('enable_ims', function() {
    var ua = testUA.createUAAndCall({enable_ims: true, destination: "other@exsip.net"});
    var inviteRequest = testUA.popMessageSent(ua);
    expect(inviteRequest.getHeader('P-Asserted-Identity')).toEqual( '\"Fake UA ð→€ł !!!\" <sip:fakeUA@exsip.net>');
    expect(inviteRequest.getHeader('From').indexOf('"Fake UA ð→€ł !!!" <sip:fakeUA@exsip.net>;tag=')).toNotEqual( -1);
    expect(inviteRequest.getHeader('To')).toEqual( '<sip:other@exsip.net>');
    expect(inviteRequest.data.indexOf('INVITE sip:other@exsip.net SIP/2.0')).toNotEqual( -1);
  });

  it('enable_ims with phone number', function() {
    var ua = testUA.createUAAndCall({enable_ims: true, uri: 'sip:+111111111@exsip.net', destination: "+1222222222@exsip.net"});
    var inviteRequest = testUA.popMessageSent(ua);
    expect(inviteRequest.getHeader('P-Asserted-Identity')).toEqual( '\"Fake UA ð→€ł !!!\" <sip:+111111111@exsip.net;user=phone>');
    expect(inviteRequest.getHeader('From').indexOf('"Fake UA ð→€ł !!!" <sip:+111111111@exsip.net;user=phone>;tag=')).toNotEqual( -1);
    expect(inviteRequest.getHeader('To')).toEqual( '<sip:+1222222222@exsip.net;user=phone>');
    expect(inviteRequest.data.indexOf('INVITE sip:+1222222222@exsip.net;user=phone SIP/2.0')).toNotEqual( -1);
  });

  it('enable_ims with phone number and ack', function() {
    var ua = testUA.createUAAndCall({enable_ims: true, uri: 'sip:+111111111@exsip.net', destination: "+1222222222@exsip.net"});
    var inviteRequest = testUA.popMessageSent(ua);

    testUA.responseFor(inviteRequest);

    var ackMsg = testUA.popMessageSent(ua);
    expect(ackMsg.method).toEqual( ExSIP.C.ACK);
    expect(ackMsg.getHeader('From').indexOf('"Fake UA ð→€ł !!!" <sip:+111111111@exsip.net;user=phone>;tag=')).toNotEqual( -1, "Should contain the user=phone in From header : "+ackMsg.getHeader('From'));
    expect(ackMsg.getHeader('To').indexOf("<sip:+1222222222@exsip.net;user=phone>;tag=")).toNotEqual( -1, "Should contain the user=phone in To header : "+ackMsg.getHeader('To'));
  });

  it('enable_ims = false and with phone number', function() {
    var ua = testUA.createUAAndCall({enable_ims: false, uri: 'sip:+111111111@exsip.net', destination: "+1222222222@exsip.net"});
    var inviteRequest = testUA.popMessageSent(ua);
    expect(inviteRequest.getHeader('P-Asserted-Identity')).toEqual( undefined);
    expect(inviteRequest.getHeader('From').indexOf('"Fake UA ð→€ł !!!" <sip:+111111111@exsip.net>;tag=')).toNotEqual( -1);
    expect(inviteRequest.getHeader('To')).toEqual( '<sip:+1222222222@exsip.net>');
    expect(inviteRequest.data.indexOf('INVITE sip:+1222222222@exsip.net SIP/2.0')).toNotEqual( -1);
  });
});
