<<<<<<< HEAD
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
  var ua = testUA.createFakeUA();
  ok(ua instanceof(ExSIP.UA));

  ua.start();

  test.strictEqual(ua.contact.toString(), '<sip:' + ua.contact.uri.user + '@' + ua.configuration.via_host + ';transport=ws>');
  test.strictEqual(ua.contact.toString({outbound: false, anonymous: false, foo: true}), '<sip:' + ua.contact.uri.user + '@' + ua.configuration.via_host + ';transport=ws>');
  test.strictEqual(ua.contact.toString({outbound: true}), '<sip:' + ua.contact.uri.user + '@' + ua.configuration.via_host + ';transport=ws;ob>');
  test.strictEqual(ua.contact.toString({anonymous: true}), '<sip:anonymous@anonymous.invalid;transport=ws>');
  test.strictEqual(ua.contact.toString({anonymous: true, outbound: true}), '<sip:anonymous@anonymous.invalid;transport=ws;ob>');

  for (parameter in testUA.DEFAULT_EXSIP_CONFIGURATION_AFTER_START) {
    switch(parameter) {
      case 'uri':
      case 'registrar_server':
        deepEqual(ua.configuration[parameter].toString(), testUA.DEFAULT_EXSIP_CONFIGURATION_AFTER_START[parameter], 'testing parameter ' + parameter);
        break;
      default:
        deepEqual(ua.configuration[parameter], testUA.DEFAULT_EXSIP_CONFIGURATION_AFTER_START[parameter], 'testing parameter ' + parameter);
    }
  }

  ua.sendMessage('test', 'FAIL WITH CONNECTION_ERROR PLEASE', {
    eventHandlers: {
      sending: function(e) {
        var ruri = e.data.request.ruri;
        ok(ruri instanceof ExSIP.URI);
        test.strictEqual(e.data.request.ruri.toString(), 'sip:test@' + ua.configuration.uri.host);
      },
      failed: function(e) {
        test.strictEqual(e.data.cause, ExSIP.C.causes.CONNECTION_ERROR);
      }
    }
  });

  ua.sendMessage('sip:ibc@iñaki.ðđß', 'FAIL WITH INVALID_TARGET PLEASE', {
    eventHandlers: {
      sending: function(e) {
        var ruri = e.data.request.ruri;
        ok(ruri instanceof ExSIP.URI);
        test.strictEqual(e.data.request.ruri.toString(), ExSIP.C.INVALID_TARGET_URI);
      },
      failed: function(e) {
        test.strictEqual(e.data.cause, ExSIP.C.causes.INVALID_TARGET);
=======
require('./include/common');
var testUA = require('./include/testUA')
var ExSIP = require('../');


module.exports = {

  'UA wrong configuration': function(test) {
    test.throws(
      function() {
        new ExSIP.UA({'lalala': 'lololo'});
      },
      ExSIP.Exceptions.ConfigurationError
    );

    test.done();
  },

  'UA no WS connection': function(test) {
    var ua = new ExSIP.UA(testUA.UA_CONFIGURATION);

    test.ok(ua instanceof(ExSIP.UA));

    ua.start();

    test.test.strictEqual(ua.contact.toString(), '<sip:' + ua.contact.uri.user + '@' + ua.configuration.via_host + ';transport=ws>');
    test.test.strictEqual(ua.contact.toString({outbound: false, anonymous: false, foo: true}), '<sip:' + ua.contact.uri.user + '@' + ua.configuration.via_host + ';transport=ws>');
    test.test.strictEqual(ua.contact.toString({outbound: true}), '<sip:' + ua.contact.uri.user + '@' + ua.configuration.via_host + ';transport=ws;ob>');
    test.test.strictEqual(ua.contact.toString({anonymous: true}), '<sip:anonymous@anonymous.invalid;transport=ws>');
    test.test.strictEqual(ua.contact.toString({anonymous: true, outbound: true}), '<sip:anonymous@anonymous.invalid;transport=ws;ob>');

    for (var parameter in testUA.UA_CONFIGURATION_AFTER_START) {
      switch(parameter) {
        case 'uri':
        case 'registrar_server':
          test.deepEqual(ua.configuration[parameter].toString(), testUA.UA_CONFIGURATION_AFTER_START[parameter], 'testing parameter ' + parameter);
          break;
        default:
          test.deepEqual(ua.configuration[parameter], testUA.UA_CONFIGURATION_AFTER_START[parameter], 'testing parameter ' + parameter);
      }
    }

    ua.sendMessage('test', 'FAIL WITH CONNECTION_ERROR PLEASE', {
      eventHandlers: {
        failed: function(e) {
          test.test.strictEqual(e.data.cause, ExSIP.C.causes.CONNECTION_ERROR);
        }
>>>>>>> jssip050
      }
    });

    test.throws(
      function() {
        ua.sendMessage('sip:ibc@iñaki.ðđß', 'FAIL WITH INVALID_TARGET PLEASE');
      },
      ExSIP.Exceptions.TypeError
    );

    test.done();
  }

};
