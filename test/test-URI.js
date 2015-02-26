require('./include/common');
var URI = require('../src/URI');

describe('URI', function() {

  it('ExSIP.URI', function() {
    var uri;

    uri = new ExSIP.URI(null, 'alice', 'exsip.net', 6060);

    expect(uri.scheme).toEqual( 'sip');
    expect(uri.user).toEqual( 'alice');
    expect(uri.host).toEqual( 'exsip.net');
    expect(uri.port).toEqual( 6060);
    expect(uri.isPhoneNumber()).toEqual( false);
    expect(uri.parameters).toEqual( {});
    expect(uri.headers).toEqual( {});
    expect(uri.toString()).toEqual( 'sip:alice@exsip.net:6060');
    expect(uri.toAor()).toEqual( 'sip:alice@exsip.net');
    expect(uri.toAor(false)).toEqual( 'sip:alice@exsip.net');
    expect(uri.toAor(true)).toEqual( 'sip:alice@exsip.net:6060');

    uri.scheme = 'SIPS';
    expect(uri.scheme).toEqual( 'sips');
    expect(uri.toAor()).toEqual( 'sips:alice@exsip.net');
    uri.scheme = 'sip';

    uri.user = 'Iñaki ðđ';
    expect(uri.user).toEqual( 'Iñaki ðđ');
    expect(uri.toString()).toEqual( 'sip:I%C3%B1aki%20%C3%B0%C4%91@exsip.net:6060');
    expect(uri.toAor()).toEqual( 'sip:I%C3%B1aki%20%C3%B0%C4%91@exsip.net');
    expect(uri.isPhoneNumber()).toEqual( false);

    uri.user = '%61lice';
    expect(uri.toAor()).toEqual( 'sip:alice@exsip.net');
    expect(uri.isPhoneNumber()).toEqual( false);

    uri.user = null;
    expect(uri.user).toEqual( null);
    expect(uri.toAor()).toEqual( 'sip:exsip.net');
    uri.user = 'alice';

    expect(
      function() {
        uri.host = null;
      }).toThrow(
      TypeError
    );
    expect(
      function() {
        uri.host = {
          bar: 'foo'
        };
      }).toThrow(
      TypeError
    );
    expect(uri.host).toEqual( 'exsip.net');

    uri.host = 'VERSATICA.com';
    expect(uri.host).toEqual( 'versatica.com');
    uri.host = 'exsip.net';

    uri.port = null;
    expect(uri.port).toEqual( null);

    uri.port = undefined;
    expect(uri.port).toEqual( null);

    uri.port = 'ABCD'; // Should become null.
    expect(uri.toString()).toEqual( 'sip:alice@exsip.net');

    uri.port = '123ABCD'; // Should become 123.
    expect(uri.toString()).toEqual( 'sip:alice@exsip.net:123');

    uri.port = 0;
    expect(uri.port).toEqual( 0);
    expect(uri.toString()).toEqual( 'sip:alice@exsip.net:0');
    uri.port = null;

    expect(uri.hasParam('foo')).toEqual( false);

    uri.setParam('Foo', null);
    expect(uri.hasParam('FOO')).toEqual( true);

    uri.setParam('Baz', 123);
    expect(uri.getParam('baz')).toEqual( '123');
    expect(uri.toString()).toEqual( 'sip:alice@exsip.net;foo;baz=123');

    uri.setParam('zero', 0);
    expect(uri.hasParam('ZERO')).toEqual( true);
    expect(uri.getParam('ZERO')).toEqual( '0');
    expect(uri.toString()).toEqual( 'sip:alice@exsip.net;foo;baz=123;zero=0');
    expect(uri.deleteParam('ZERO')).toEqual( '0');

    expect(uri.deleteParam('baZ')).toEqual( '123');
    expect(uri.deleteParam('NOO')).toEqual( undefined);
    expect(uri.toString()).toEqual( 'sip:alice@exsip.net;foo');

    uri.clearParams();
    expect(uri.toString()).toEqual( 'sip:alice@exsip.net');

    expect(uri.hasHeader('foo')).toEqual( false);

    uri.setHeader('Foo', 'LALALA');
    expect(uri.hasHeader('FOO')).toEqual( true);
    expect(uri.getHeader('FOO')).toEqual( ['LALALA']);
    expect(uri.toString()).toEqual( 'sip:alice@exsip.net?Foo=LALALA');

    uri.setHeader('bAz', ['ABC-1', 'ABC-2']);
    expect(uri.getHeader('baz')).toEqual( ['ABC-1', 'ABC-2']);
    expect(uri.toString()).toEqual( 'sip:alice@exsip.net?Foo=LALALA&Baz=ABC-1&Baz=ABC-2');

    expect(uri.deleteHeader('baZ')).toEqual( ['ABC-1', 'ABC-2']);
    expect(uri.deleteHeader('NOO')).toEqual( undefined);

    uri.clearHeaders();
    expect(uri.toString()).toEqual( 'sip:alice@exsip.net');

    var uri2 = uri.clone();
    expect(uri2.toString()).toEqual( uri.toString());
    uri2.user = 'popo';
    expect(uri2.user).toEqual( 'popo');
    expect(uri.user).toEqual( 'alice');

    uri2.user = '1111111111';
    expect(uri2.isPhoneNumber()).toEqual( true);

    uri2.user = '+1111111111';
    expect(uri2.isPhoneNumber()).toEqual( true);

    uri2.user = '+user1234';
    expect(uri2.isPhoneNumber()).toEqual( false);
    
  });
});