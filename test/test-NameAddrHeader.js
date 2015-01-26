require('./include/common');
var testUA = require('./include/testUA');
var URI = require('../src/URI');
var NameAddrHeader = require('../src/NameAddrHeader');

module.exports = {

  'ExSIP.NameAddrHeader': function(test) {
    var name, uri;

    uri = new URI('sip', 'alice', 'exsip.net');
    name = new NameAddrHeader(uri, 'Alice æßð');

    test.strictEqual(name.display_name, 'Alice æßð');
    test.strictEqual(name.toString(), '"Alice æßð" <sip:alice@exsip.net>');

    name.display_name = null;
    test.strictEqual(name.toString(), '<sip:alice@exsip.net>');

    name.display_name = 0;
    test.strictEqual(name.toString(), '"0" <sip:alice@exsip.net>');

    name.display_name = "";
    test.strictEqual(name.toString(), '<sip:alice@exsip.net>');

    test.deepEqual(name.parameters, {});

    name.setParam('Foo', null);
    test.strictEqual(name.hasParam('FOO'), true);

    name.setParam('Baz', 123);
    test.strictEqual(name.getParam('baz'), '123');
    test.strictEqual(name.toString(), '<sip:alice@exsip.net>;foo;baz=123');

    test.strictEqual(name.deleteParam('bAz'), '123');

    name.clearParams();
    test.strictEqual(name.toString(), '<sip:alice@exsip.net>');

    var name2 = name.clone();
    test.strictEqual(name2.toString(), name.toString());
    name2.display_name = '@ł€';
    test.strictEqual(name2.display_name, '@ł€');
    test.strictEqual(name.user, undefined);
    test.done();
  }
}