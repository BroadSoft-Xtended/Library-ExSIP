require('./include/common');

describe('register', function() {

  it('without password', function() {
    ua = testUA.createFakeUA({
      trace_sip: true,
      use_preloaded_route: false,
      register: true,
      password: null
    });
    testUA.mockWebRTC();
    testUA.start(ua);
    testUA.onOpen(ua);
    var registerMsg = testUA.popMessageSent(ua);
    expect(registerMsg.method).toEqual( "REGISTER");
    
  });

  it('without password and 401 Unauthorized response', function() {
    ua = testUA.createFakeUA({
      trace_sip: true,
      use_preloaded_route: false,
      register: true,
      password: null
    });
    var registrationFailedStatusCode = null;
    ua.on('registrationFailed', function(e) {
      registrationFailedStatusCode = e.data.response.status_code;
    });
    testUA.mockWebRTC();
    testUA.start(ua);
    testUA.onOpen(ua);
    var registerMsg = testUA.popMessageSentAndClear(ua);
    testUA.responseFor(registerMsg, {
      status_code: "401 Unauthorized",
      noSdp: true,
      method: "REGISTER",
      www_authenticate: "DIGEST qop=\"auth\",nonce=\"BroadWorksXhou9t4uvTc36x37BW\",realm=\"broadsoft.com\",algorithm=MD5"
    });
    var registerAuthMsg = testUA.popMessageSent(ua);
    expect(registerAuthMsg.method).toEqual( "REGISTER");
    expect(registerAuthMsg.getHeader('Authorization').indexOf("Digest algorithm=MD5).toEqual( username=\"fakeUA\", realm=\"broadsoft.com\"") !== -1, true);

    testUA.responseFor(registerAuthMsg, {
      status_code: "403 Forbidden",
      noSdp: true,
      method: "REGISTER"
    });
    expect(registrationFailedStatusCode).toEqual( 403);
        
  });
});