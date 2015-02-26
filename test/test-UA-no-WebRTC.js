require('./include/common');

describe('UA-no-WebRTC', function() {

  it('UA wrong configuration', function() {
    expect(
      function() {
        new ExSIP.UA({'lalala': 'lololo'});
      }).toThrow(
      ExSIP.Exceptions.ConfigurationError
    );
  });

  it('UA no WS connection', function() {
    var ua = new ExSIP.UA(testUA.UA_CONFIGURATION);

    expect(ua instanceof(ExSIP.UA)).toEqual(true);

    ua.start();

    expect(ua.contact.toString()).toEqual( '<sip:' + ua.contact.uri.user + '@' + ua.configuration.via_host + ';transport=ws>');
    expect(ua.contact.toString({outbound: false, anonymous: false, foo: true})).toEqual('<sip:' + ua.contact.uri.user + '@' + ua.configuration.via_host + ';transport=ws>');
    expect(ua.contact.toString({outbound: true})).toEqual( '<sip:' + ua.contact.uri.user + '@' + ua.configuration.via_host + ';transport=ws;ob>');
    expect(ua.contact.toString({anonymous: true})).toEqual( '<sip:anonymous@anonymous.invalid;transport=ws>');
    expect(ua.contact.toString({anonymous: true, outbound: true})).toEqual('<sip:anonymous@anonymous.invalid;transport=ws;ob>');

    for (var parameter in testUA.UA_CONFIGURATION_AFTER_START) {
      switch(parameter) {
        case 'uri':
        case 'registrar_server':
          expect(ua.configuration[parameter].toString()).toEqual( testUA.UA_CONFIGURATION_AFTER_START[parameter], 'testing parameter ' + parameter);
          break;
        default:
          expect(ua.configuration[parameter]).toEqual( testUA.UA_CONFIGURATION_AFTER_START[parameter], 'testing parameter ' + parameter);
      }
    }

    ua.sendMessage('test', 'FAIL WITH CONNECTION_ERROR PLEASE', {
      eventHandlers: {
        failed: function(e) {
          expect(e.data.cause).toEqual( ExSIP.C.causes.CONNECTION_ERROR);
        }
      }
    });

    expect(
      function() {
        ua.sendMessage('sip:ibc@iñaki.ðđß', 'FAIL WITH INVALID_TARGET PLEASE');
      }).toThrow(
      ExSIP.Exceptions.TypeError
    );

    
  });

});
