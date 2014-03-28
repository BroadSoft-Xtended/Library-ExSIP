module( "Configuration", {
  setup: function() {
  }, teardown: function() {
  }
});

test('enable_ims', function() {
  var ua = TestExSIP.Helpers.createUAAndCall({enable_ims: true, destination: "other@exsip.net"});
  var inviteRequest = TestExSIP.Helpers.popMessageSent(ua);
  strictEqual(inviteRequest.getHeader('P-Asserted-Identity'), '\"Fake UA ð→€ł !!!\" <sip:fakeUA@exsip.net>');
  notStrictEqual(inviteRequest.getHeader('From').indexOf('"Fake UA ð→€ł !!!" <sip:fakeUA@exsip.net>;tag='), -1);
  strictEqual(inviteRequest.getHeader('To'), '<sip:other@exsip.net>');
  notStrictEqual(inviteRequest.data.indexOf('INVITE sip:other@exsip.net SIP/2.0'), -1);
});

test('enable_ims with phone number', function() {
  var ua = TestExSIP.Helpers.createUAAndCall({enable_ims: true, uri: 'sip:+111111111@exsip.net', destination: "+1222222222@exsip.net"});
  var inviteRequest = TestExSIP.Helpers.popMessageSent(ua);
  strictEqual(inviteRequest.getHeader('P-Asserted-Identity'), '\"Fake UA ð→€ł !!!\" <sip:+111111111@exsip.net;user=phone>');
  notStrictEqual(inviteRequest.getHeader('From').indexOf('"Fake UA ð→€ł !!!" <sip:+111111111@exsip.net;user=phone>;tag='), -1);
  strictEqual(inviteRequest.getHeader('To'), '<sip:+1222222222@exsip.net;user=phone>');
  notStrictEqual(inviteRequest.data.indexOf('INVITE sip:+1222222222@exsip.net;user=phone SIP/2.0'), -1);
});

test('enable_ims with phone number and ack', function() {
  var ua = TestExSIP.Helpers.createUAAndCall({enable_ims: true, uri: 'sip:+111111111@exsip.net', destination: "+1222222222@exsip.net"});
  var inviteRequest = TestExSIP.Helpers.popMessageSent(ua);

  TestExSIP.Helpers.responseFor(inviteRequest);

  var ackMsg = TestExSIP.Helpers.popMessageSent(ua);
  strictEqual(ackMsg.method, ExSIP.C.ACK);
  notStrictEqual(ackMsg.getHeader('From').indexOf('"Fake UA ð→€ł !!!" <sip:+111111111@exsip.net;user=phone>;tag='), -1, "Should contain the user=phone in From header : "+ackMsg.getHeader('From'));
  notStrictEqual(ackMsg.getHeader('To').indexOf("<sip:+1222222222@exsip.net;user=phone>;tag="), -1, "Should contain the user=phone in To header : "+ackMsg.getHeader('To'));
});

test('enable_ims = false and with phone number', function() {
  var ua = TestExSIP.Helpers.createUAAndCall({enable_ims: false, uri: 'sip:+111111111@exsip.net', destination: "+1222222222@exsip.net"});
  var inviteRequest = TestExSIP.Helpers.popMessageSent(ua);
  strictEqual(inviteRequest.getHeader('P-Asserted-Identity'), undefined);
  notStrictEqual(inviteRequest.getHeader('From').indexOf('"Fake UA ð→€ł !!!" <sip:+111111111@exsip.net>;tag='), -1);
  strictEqual(inviteRequest.getHeader('To'), '<sip:+1222222222@exsip.net>');
  notStrictEqual(inviteRequest.data.indexOf('INVITE sip:+1222222222@exsip.net SIP/2.0'), -1);
});
