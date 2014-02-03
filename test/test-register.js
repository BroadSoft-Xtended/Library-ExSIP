module( "register", {
  setup: function() {
  }, teardown: function() {
  }
});

test('without password', function() {
  ua = TestExSIP.Helpers.createFakeUA({trace_sip: true, use_preloaded_route: false, register: true, password: null});
  TestExSIP.Helpers.mockWebRTC();
  TestExSIP.Helpers.start(ua);
  TestExSIP.Helpers.onOpen(ua);
  var registerMsg = TestExSIP.Helpers.popMessageSent(ua);
  strictEqual(registerMsg.method, "REGISTER");
});

test('without password and 401 Unauthorized response', function() {
  ua = TestExSIP.Helpers.createFakeUA({trace_sip: true, use_preloaded_route: false, register: true, password: null});
  var registrationFailedStatusCode = null;
  ua.on('registrationFailed', function(e)
  {
    registrationFailedStatusCode = e.data.response.status_code;
  });
  TestExSIP.Helpers.mockWebRTC();
  TestExSIP.Helpers.start(ua);
  TestExSIP.Helpers.onOpen(ua);
  var registerMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  TestExSIP.Helpers.responseFor(registerMsg, {status_code: "401 Unauthorized", noSdp: true, method: "REGISTER",
    www_authenticate: "DIGEST qop=\"auth\",nonce=\"BroadWorksXhou9t4uvTc36x37BW\",realm=\"broadsoft.com\",algorithm=MD5"});
  var registerAuthMsg = TestExSIP.Helpers.popMessageSent(ua);
  strictEqual(registerAuthMsg.method, "REGISTER");
  strictEqual(registerAuthMsg.getHeader('Authorization').indexOf("Digest algorithm=MD5, username=\"fakeUA\", realm=\"broadsoft.com\"") !== -1, true);

  TestExSIP.Helpers.responseFor(registerAuthMsg, {status_code: "403 Forbidden", noSdp: true, method: "REGISTER"});
  strictEqual(registrationFailedStatusCode, 403);
});