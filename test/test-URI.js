module( "ExSIP.URI", {
  setup: function() {
  }, teardown: function() {
  }
});

test('ExSIP.URI', function() {
  var uri;

  uri = new ExSIP.URI(null, 'alice', 'exsip.net', 6060);

  strictEqual(uri.scheme, 'sip');
  strictEqual(uri.user, 'alice');
  strictEqual(uri.host, 'exsip.net');
  strictEqual(uri.port, 6060);
  strictEqual(uri.isPhoneNumber(), false);
  deepEqual(uri.parameters, {});
  deepEqual(uri.headers, {});
  strictEqual(uri.toString(), 'sip:alice@exsip.net:6060');
  strictEqual(uri.toAor(), 'sip:alice@exsip.net');
  strictEqual(uri.toAor(false), 'sip:alice@exsip.net');
  strictEqual(uri.toAor(true), 'sip:alice@exsip.net:6060');

  uri.scheme = 'SIPS';
  strictEqual(uri.scheme, 'sips');
  strictEqual(uri.toAor(), 'sips:alice@exsip.net');
  uri.scheme = 'sip';

  uri.user = 'Iñaki ðđ';
  strictEqual(uri.user, 'Iñaki ðđ');
  strictEqual(uri.toString(), 'sip:I%C3%B1aki%20%C3%B0%C4%91@exsip.net:6060');
  strictEqual(uri.toAor(), 'sip:I%C3%B1aki%20%C3%B0%C4%91@exsip.net');
  strictEqual(uri.isPhoneNumber(), false);

  uri.user = '%61lice';
  strictEqual(uri.toAor(), 'sip:alice@exsip.net');
  strictEqual(uri.isPhoneNumber(), false);

  uri.user = null;
  strictEqual(uri.user, null);
  strictEqual(uri.toAor(), 'sip:exsip.net');
  uri.user = 'alice';

  throws(
    function() {
      uri.host = null;
    },
    TypeError
  );
  throws(
    function() {
      uri.host = {bar: 'foo'};
    },
    TypeError
  );
  strictEqual(uri.host, 'exsip.net');

  uri.host = 'VERSATICA.com';
  strictEqual(uri.host, 'versatica.com');
  uri.host = 'exsip.net';

  uri.port = null;
  strictEqual(uri.port, null);

  uri.port = undefined;
  strictEqual(uri.port, null);

  uri.port = 'ABCD';  // Should become null.
  strictEqual(uri.toString(), 'sip:alice@exsip.net');

  uri.port = '123ABCD';  // Should become 123.
  strictEqual(uri.toString(), 'sip:alice@exsip.net:123');

  uri.port = 0;
  strictEqual(uri.port, 0);
  strictEqual(uri.toString(), 'sip:alice@exsip.net:0');
  uri.port = null;

  strictEqual(uri.hasParam('foo'), false);

  uri.setParam('Foo', null);
  strictEqual(uri.hasParam('FOO'), true);

  uri.setParam('Baz', 123);
  strictEqual(uri.getParam('baz'), '123');
  strictEqual(uri.toString(), 'sip:alice@exsip.net;foo;baz=123');

  uri.setParam('zero', 0);
  strictEqual(uri.hasParam('ZERO'), true);
  strictEqual(uri.getParam('ZERO'), '0');
  strictEqual(uri.toString(), 'sip:alice@exsip.net;foo;baz=123;zero=0');
  strictEqual(uri.deleteParam('ZERO'), '0');

  strictEqual(uri.deleteParam('baZ'), '123');
  strictEqual(uri.deleteParam('NOO'), undefined);
  strictEqual(uri.toString(), 'sip:alice@exsip.net;foo');

  uri.clearParams();
  strictEqual(uri.toString(), 'sip:alice@exsip.net');

  strictEqual(uri.hasHeader('foo'), false);

  uri.setHeader('Foo', 'LALALA');
  strictEqual(uri.hasHeader('FOO'), true);
  deepEqual(uri.getHeader('FOO'), ['LALALA']);
  strictEqual(uri.toString(), 'sip:alice@exsip.net?Foo=LALALA');

  uri.setHeader('bAz', ['ABC-1', 'ABC-2']);
  deepEqual(uri.getHeader('baz'), ['ABC-1', 'ABC-2']);
  strictEqual(uri.toString(), 'sip:alice@exsip.net?Foo=LALALA&Baz=ABC-1&Baz=ABC-2');

  deepEqual(uri.deleteHeader('baZ'), ['ABC-1', 'ABC-2']);
  deepEqual(uri.deleteHeader('NOO'), undefined);

  uri.clearHeaders();
  strictEqual(uri.toString(), 'sip:alice@exsip.net');

  var uri2 = uri.clone();
  strictEqual(uri2.toString(), uri.toString());
  uri2.user = 'popo';
  strictEqual(uri2.user, 'popo');
  strictEqual(uri.user, 'alice');

  uri2.user = '1111111111';
  strictEqual(uri2.isPhoneNumber(), true);

  uri2.user = '+1111111111';
  strictEqual(uri2.isPhoneNumber(), true);

  uri2.user = '+user1234';
  strictEqual(uri2.isPhoneNumber(), false);
});

