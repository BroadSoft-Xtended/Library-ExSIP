require('./include/common');

describe('classes', function() {

  it('new URI', function() {
    var uri = new ExSIP.URI(null, 'alice', 'jssip.net', 6060);

    expect(uri.scheme).toEqual( 'sip');
    expect(uri.user).toEqual( 'alice');
    expect(uri.host).toEqual( 'jssip.net');
    expect(uri.port).toEqual( 6060);
    expect(uri.parameters).toEqual( {});
    expect(uri.headers).toEqual( {});
    expect(uri.toString()).toEqual( 'sip:alice@jssip.net:6060');
    expect(uri.toAor()).toEqual( 'sip:alice@jssip.net');
    expect(uri.toAor(false)).toEqual( 'sip:alice@jssip.net');
    expect(uri.toAor(true)).toEqual( 'sip:alice@jssip.net:6060');

    uri.scheme = 'SIPS';
    expect(uri.scheme).toEqual( 'sips');
    expect(uri.toAor()).toEqual( 'sips:alice@jssip.net');
    uri.scheme = 'sip';

    uri.user = 'Iñaki ðđ';
    expect(uri.user).toEqual( 'Iñaki ðđ');
    expect(uri.toString()).toEqual( 'sip:I%C3%B1aki%20%C3%B0%C4%91@jssip.net:6060');
    expect(uri.toAor()).toEqual( 'sip:I%C3%B1aki%20%C3%B0%C4%91@jssip.net');

    uri.user = '%61lice';
    expect(uri.toAor()).toEqual( 'sip:alice@jssip.net');

    uri.user = null;
    expect(uri.user).toEqual( null);
    expect(uri.toAor()).toEqual( 'sip:jssip.net');
    uri.user = 'alice';

    expect(function(){uri.host = null}).toThrow(TypeError);
    expect(uri.host).toEqual( 'jssip.net');

    uri.host = 'VERSATICA.com';
    expect(uri.host).toEqual( 'versatica.com');
    uri.host = 'jssip.net';

    uri.port = null;
    expect(uri.port).toEqual( null);

    uri.port = undefined;
    expect(uri.port).toEqual( null);

    uri.port = 'ABCD';  // Should become null.
    expect(uri.toString()).toEqual( 'sip:alice@jssip.net');

    uri.port = '123ABCD';  // Should become 123.
    expect(uri.toString()).toEqual( 'sip:alice@jssip.net:123');

    uri.port = 0;
    expect(uri.port).toEqual( 0);
    expect(uri.toString()).toEqual( 'sip:alice@jssip.net:0');
    uri.port = null;

    expect(uri.hasParam('foo')).toEqual( false);

    uri.setParam('Foo', null);
    expect(uri.hasParam('FOO')).toEqual( true);

    uri.setParam('Baz', 123);
    expect(uri.getParam('baz')).toEqual( '123');
    expect(uri.toString()).toEqual( 'sip:alice@jssip.net;foo;baz=123');

    uri.setParam('zero', 0);
    expect(uri.hasParam('ZERO')).toEqual( true);
    expect(uri.getParam('ZERO')).toEqual( '0');
    expect(uri.toString()).toEqual( 'sip:alice@jssip.net;foo;baz=123;zero=0');
    expect(uri.deleteParam('ZERO')).toEqual( '0');

    expect(uri.deleteParam('baZ')).toEqual( '123');
    expect(uri.deleteParam('NOO')).toEqual( undefined);
    expect(uri.toString()).toEqual( 'sip:alice@jssip.net;foo');

    uri.clearParams();
    expect(uri.toString()).toEqual( 'sip:alice@jssip.net');

    expect(uri.hasHeader('foo')).toEqual( false);

    uri.setHeader('Foo', 'LALALA');
    expect(uri.hasHeader('FOO')).toEqual( true);
    expect(uri.getHeader('FOO')).toEqual( ['LALALA']);
    expect(uri.toString()).toEqual( 'sip:alice@jssip.net?Foo=LALALA');

    uri.setHeader('bAz', ['ABC-1', 'ABC-2']);
    expect(uri.getHeader('baz')).toEqual( ['ABC-1', 'ABC-2']);
    expect(uri.toString()).toEqual( 'sip:alice@jssip.net?Foo=LALALA&Baz=ABC-1&Baz=ABC-2');

    expect(uri.deleteHeader('baZ')).toEqual( ['ABC-1', 'ABC-2']);
    expect(uri.deleteHeader('NOO')).toEqual( undefined);

    uri.clearHeaders();
    expect(uri.toString()).toEqual( 'sip:alice@jssip.net');

    var uri2 = uri.clone();
    expect(uri2.toString()).toEqual( uri.toString());
    uri2.user = 'popo';
    expect(uri2.user).toEqual( 'popo');
    expect(uri.user).toEqual( 'alice');

    
  });

  it('new NameAddr', function() {
    var uri = new ExSIP.URI('sip', 'alice', 'jssip.net');
    var name = new ExSIP.NameAddrHeader(uri, 'Alice æßð');

    expect(name.display_name).toEqual( 'Alice æßð');
    expect(name.toString()).toEqual( '"Alice æßð" <sip:alice@jssip.net>');

    name.display_name = null;
    expect(name.toString()).toEqual( '<sip:alice@jssip.net>');

    name.display_name = 0;
    expect(name.toString()).toEqual( '"0" <sip:alice@jssip.net>');

    name.display_name = "";
    expect(name.toString()).toEqual( '<sip:alice@jssip.net>');

    expect(name.parameters).toEqual( {});

    name.setParam('Foo', null);
    expect(name.hasParam('FOO')).toEqual( true);

    name.setParam('Baz', 123);
    expect(name.getParam('baz')).toEqual( '123');
    expect(name.toString()).toEqual( '<sip:alice@jssip.net>;foo;baz=123');

    expect(name.deleteParam('bAz')).toEqual( '123');

    name.clearParams();
    expect(name.toString()).toEqual( '<sip:alice@jssip.net>');

    var name2 = name.clone();
    expect(name2.toString()).toEqual( name.toString());
    name2.display_name = '@ł€';
    expect(name2.display_name).toEqual( '@ł€');
    expect(name.user).toEqual( undefined);

    
  });

});
