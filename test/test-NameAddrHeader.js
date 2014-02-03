module( "ExSIP.NameAddrHeader", {
  setup: function() {
  }, teardown: function() {
  }
});

test('ExSIP.NameAddrHeader', function() {
  var name, uri;

  uri = new ExSIP.URI('sip', 'alice', 'exsip.net');
  name = new ExSIP.NameAddrHeader(uri, 'Alice æßð');

  strictEqual(name.display_name, 'Alice æßð');
  strictEqual(name.toString(), '"Alice æßð" <sip:alice@exsip.net>');

  name.display_name = null;
  strictEqual(name.toString(), '<sip:alice@exsip.net>');

  name.display_name = 0;
  strictEqual(name.toString(), '"0" <sip:alice@exsip.net>');

  name.display_name = "";
  strictEqual(name.toString(), '<sip:alice@exsip.net>');

  deepEqual(name.parameters, {});

  name.setParam('Foo', null);
  strictEqual(name.hasParam('FOO'), true);

  name.setParam('Baz', 123);
  strictEqual(name.getParam('baz'), '123');
  strictEqual(name.toString(), '<sip:alice@exsip.net>;foo;baz=123');

  strictEqual(name.deleteParam('bAz'), '123');

  name.clearParams();
  strictEqual(name.toString(), '<sip:alice@exsip.net>');

  var name2 = name.clone();
  strictEqual(name2.toString(), name.toString());
  name2.display_name = '@ł€';
  strictEqual(name2.display_name, '@ł€');
  strictEqual(name.user, undefined);
});

