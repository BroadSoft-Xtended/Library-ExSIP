module( "sendDTMF", {
  setup: function() {
  }, teardown: function() {
  }
});

test('enable_ims', function() {
  var ua = TestExSIP.Helpers.createUAAndCall({enable_ims: true});
  var inviteRequest = TestExSIP.Helpers.popMessageSent(ua);
  strictEqual(inviteRequest.getHeader('P-Preferred-Identity'), '\"Fake UA ð→€ł !!!\" <sip:fakeUA@exsip.net>');
});
