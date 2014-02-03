module( "ExSIP.UA", {
  setup: function() {
  }, teardown: function() {
  }
});

test('UA wrong configuration', function() {
  throws(
    function() {
      new ExSIP.UA({'lalala': 'lololo'});
    },
    ExSIP.Exceptions.ConfigurationError
  );
});

test('UA no WS connection', function() {
  var ua = TestExSIP.Helpers.createFakeUA();
  ok(ua instanceof(ExSIP.UA));

  ua.start();

  strictEqual(ua.contact.toString(), '<sip:' + ua.contact.uri.user + '@' + ua.configuration.via_host + ';transport=ws>');
  strictEqual(ua.contact.toString({outbound: false, anonymous: false, foo: true}), '<sip:' + ua.contact.uri.user + '@' + ua.configuration.via_host + ';transport=ws>');
  strictEqual(ua.contact.toString({outbound: true}), '<sip:' + ua.contact.uri.user + '@' + ua.configuration.via_host + ';transport=ws;ob>');
  strictEqual(ua.contact.toString({anonymous: true}), '<sip:anonymous@anonymous.invalid;transport=ws>');
  strictEqual(ua.contact.toString({anonymous: true, outbound: true}), '<sip:anonymous@anonymous.invalid;transport=ws;ob>');

  for (parameter in TestExSIP.Helpers.DEFAULT_EXSIP_CONFIGURATION_AFTER_START) {
    switch(parameter) {
      case 'uri':
      case 'registrar_server':
        deepEqual(ua.configuration[parameter].toString(), TestExSIP.Helpers.DEFAULT_EXSIP_CONFIGURATION_AFTER_START[parameter], 'testing parameter ' + parameter);
        break;
      default:
        deepEqual(ua.configuration[parameter], TestExSIP.Helpers.DEFAULT_EXSIP_CONFIGURATION_AFTER_START[parameter], 'testing parameter ' + parameter);
    }
  }

  ua.sendMessage('test', 'FAIL WITH CONNECTION_ERROR PLEASE', {
    eventHandlers: {
      sending: function(e) {
        var ruri = e.data.request.ruri;
        ok(ruri instanceof ExSIP.URI);
        strictEqual(e.data.request.ruri.toString(), 'sip:test@' + ua.configuration.uri.host);
      },
      failed: function(e) {
        strictEqual(e.data.cause, ExSIP.C.causes.CONNECTION_ERROR);
      }
    }
  });

  ua.sendMessage('sip:ibc@iñaki.ðđß', 'FAIL WITH INVALID_TARGET PLEASE', {
    eventHandlers: {
      sending: function(e) {
        var ruri = e.data.request.ruri;
        ok(ruri instanceof ExSIP.URI);
        strictEqual(e.data.request.ruri.toString(), ExSIP.C.INVALID_TARGET_URI);
      },
      failed: function(e) {
        strictEqual(e.data.cause, ExSIP.C.causes.INVALID_TARGET);
      }
    }
  });

});

