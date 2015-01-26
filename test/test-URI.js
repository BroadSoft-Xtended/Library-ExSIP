module( "ExSIP.URI", {
  setup: function() {
  }, teardown: function() {
  }
});

test('ExSIP.URI', function() {
  var uri;

  uri = new ExSIP.URI(null, 'alice', 'exsip.net', 6060);

  test.strictEqual(uri.scheme, 'sip');
  test.strictEqual(uri.user, 'alice');
  test.strictEqual(uri.host, 'exsip.net');
  test.strictEqual(uri.port, 6060);
  test.strictEqual(uri.isPhoneNumber(), false);
  deepEqual(uri.parameters, {});
  deepEqual(uri.headers, {});
  test.strictEqual(uri.toString(), 'sip:alice@exsip.net:6060');
  test.strictEqual(uri.toAor(), 'sip:alice@exsip.net');
  test.strictEqual(uri.toAor(false), 'sip:alice@exsip.net');
  test.strictEqual(uri.toAor(true), 'sip:alice@exsip.net:6060');

  uri.scheme = 'SIPS';
  test.strictEqual(uri.scheme, 'sips');
  test.strictEqual(uri.toAor(), 'sips:alice@exsip.net');
  uri.scheme = 'sip';

  uri.user = 'Iñaki ðđ';
  test.strictEqual(uri.user, 'Iñaki ðđ');
  test.strictEqual(uri.toString(), 'sip:I%C3%B1aki%20%C3%B0%C4%91@exsip.net:6060');
  test.strictEqual(uri.toAor(), 'sip:I%C3%B1aki%20%C3%B0%C4%91@exsip.net');
  test.strictEqual(uri.isPhoneNumber(), false);

  uri.user = '%61lice';
  test.strictEqual(uri.toAor(), 'sip:alice@exsip.net');
  test.strictEqual(uri.isPhoneNumber(), false);

  uri.user = null;
  test.strictEqual(uri.user, null);
  test.strictEqual(uri.toAor(), 'sip:exsip.net');
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
  test.strictEqual(uri.host, 'exsip.net');

  uri.host = 'VERSATICA.com';
  test.strictEqual(uri.host, 'versatica.com');
  uri.host = 'exsip.net';

  uri.port = null;
  test.strictEqual(uri.port, null);

  uri.port = undefined;
  test.strictEqual(uri.port, null);

  uri.port = 'ABCD';  // Should become null.
  test.strictEqual(uri.toString(), 'sip:alice@exsip.net');

  uri.port = '123ABCD';  // Should become 123.
  test.strictEqual(uri.toString(), 'sip:alice@exsip.net:123');

  uri.port = 0;
  test.strictEqual(uri.port, 0);
  test.strictEqual(uri.toString(), 'sip:alice@exsip.net:0');
  uri.port = null;

  test.strictEqual(uri.hasParam('foo'), false);

  uri.setParam('Foo', null);
  test.strictEqual(uri.hasParam('FOO'), true);

  uri.setParam('Baz', 123);
  test.strictEqual(uri.getParam('baz'), '123');
  test.strictEqual(uri.toString(), 'sip:alice@exsip.net;foo;baz=123');

  uri.setParam('zero', 0);
  test.strictEqual(uri.hasParam('ZERO'), true);
  test.strictEqual(uri.getParam('ZERO'), '0');
  test.strictEqual(uri.toString(), 'sip:alice@exsip.net;foo;baz=123;zero=0');
  test.strictEqual(uri.deleteParam('ZERO'), '0');

  test.strictEqual(uri.deleteParam('baZ'), '123');
  test.strictEqual(uri.deleteParam('NOO'), undefined);
  test.strictEqual(uri.toString(), 'sip:alice@exsip.net;foo');

  uri.clearParams();
  test.strictEqual(uri.toString(), 'sip:alice@exsip.net');

  test.strictEqual(uri.hasHeader('foo'), false);

  uri.setHeader('Foo', 'LALALA');
  test.strictEqual(uri.hasHeader('FOO'), true);
  deepEqual(uri.getHeader('FOO'), ['LALALA']);
  test.strictEqual(uri.toString(), 'sip:alice@exsip.net?Foo=LALALA');

  uri.setHeader('bAz', ['ABC-1', 'ABC-2']);
  deepEqual(uri.getHeader('baz'), ['ABC-1', 'ABC-2']);
  test.strictEqual(uri.toString(), 'sip:alice@exsip.net?Foo=LALALA&Baz=ABC-1&Baz=ABC-2');

  deepEqual(uri.deleteHeader('baZ'), ['ABC-1', 'ABC-2']);
  deepEqual(uri.deleteHeader('NOO'), undefined);

  uri.clearHeaders();
  test.strictEqual(uri.toString(), 'sip:alice@exsip.net');

  var uri2 = uri.clone();
  test.strictEqual(uri2.toString(), uri.toString());
  uri2.user = 'popo';
  test.strictEqual(uri2.user, 'popo');
  test.strictEqual(uri.user, 'alice');

  uri2.user = '1111111111';
  test.strictEqual(uri2.isPhoneNumber(), true);

  uri2.user = '+1111111111';
  test.strictEqual(uri2.isPhoneNumber(), true);

  uri2.user = '+user1234';
  test.strictEqual(uri2.isPhoneNumber(), false);
});

