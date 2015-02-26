require('./include/common');
var NameAddrHeader = require('../src/NameAddrHeader');
var URI = require('../src/URI');

describe('NameAddrHeader', function() {

  it('ExSIP.NameAddrHeader', function() {
    var name, uri;

    uri = new URI('sip', 'alice', 'exsip.net');
    name = new NameAddrHeader(uri, 'Alice æßð');

    expect(name.display_name).toEqual( 'Alice æßð');
    expect(name.toString()).toEqual( '"Alice æßð" <sip:alice@exsip.net>');

    name.display_name = null;
    expect(name.toString()).toEqual( '<sip:alice@exsip.net>');

    name.display_name = 0;
    expect(name.toString()).toEqual( '"0" <sip:alice@exsip.net>');

    name.display_name = "";
    expect(name.toString()).toEqual( '<sip:alice@exsip.net>');

    expect(name.parameters).toEqual( {});

    name.setParam('Foo', null);
    expect(name.hasParam('FOO')).toEqual( true);

    name.setParam('Baz', 123);
    expect(name.getParam('baz')).toEqual( '123');
    expect(name.toString()).toEqual( '<sip:alice@exsip.net>;foo;baz=123');

    expect(name.deleteParam('bAz')).toEqual( '123');

    name.clearParams();
    expect(name.toString()).toEqual( '<sip:alice@exsip.net>');

    var name2 = name.clone();
    expect(name2.toString()).toEqual( name.toString());
    name2.display_name = '@ł€';
    expect(name2.display_name).toEqual( '@ł€');
    expect(name.user).toEqual( undefined);
    
  });
});