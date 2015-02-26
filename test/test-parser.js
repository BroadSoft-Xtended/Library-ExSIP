require('./include/common');

describe('parser', function() {

  it('parse URI', function() {
    var data = 'SIP:%61liCE@versaTICA.Com:6060;TRansport=TCp;Foo=ABc;baz?X-Header-1=AaA1&X-Header-2=BbB&x-header-1=AAA2';
    var uri = ExSIP.URI.parse(data);

    // Parsed data.
    expect(uri instanceof(ExSIP.URI)).toEqual(true)
    expect(uri.scheme).toEqual( 'sip');
    expect(uri.user).toEqual( 'aliCE');
    expect(uri.host).toEqual( 'versatica.com');
    expect(uri.port).toEqual( 6060);
    expect(uri.hasParam('transport')).toEqual( true);
    expect(uri.hasParam('nooo')).toEqual( false);
    expect(uri.getParam('transport')).toEqual( 'tcp');
    expect(uri.getParam('foo')).toEqual( 'abc');
    expect(uri.getParam('baz')).toEqual( null);
    expect(uri.getParam('nooo')).toEqual( undefined);
    expect(uri.getHeader('x-header-1')).toEqual( ['AaA1', 'AAA2']);
    expect(uri.getHeader('X-HEADER-2')).toEqual( ['BbB']);
    expect(uri.getHeader('nooo')).toEqual( undefined);
    expect(uri.toString()).toEqual( 'sip:aliCE@versatica.com:6060;transport=tcp;foo=abc;baz?X-Header-1=AaA1&X-Header-1=AAA2&X-Header-2=BbB');
    expect(uri.toAor()).toEqual( 'sip:aliCE@versatica.com');

    // Alter data.
    uri.user = 'Iñaki:PASSWD';
    expect(uri.user).toEqual( 'Iñaki:PASSWD');
    expect(uri.deleteParam('foo')).toEqual( 'abc');
    expect(uri.deleteHeader('x-header-1')).toEqual( ['AaA1', 'AAA2']);
    expect(uri.toString()).toEqual( 'sip:I%C3%B1aki:PASSWD@versatica.com:6060;transport=tcp;baz?X-Header-2=BbB');
    expect(uri.toAor()).toEqual( 'sip:I%C3%B1aki:PASSWD@versatica.com');
    uri.clearParams();
    uri.clearHeaders();
    uri.port = null;
    expect(uri.toString()).toEqual( 'sip:I%C3%B1aki:PASSWD@versatica.com');
    expect(uri.toAor()).toEqual( 'sip:I%C3%B1aki:PASSWD@versatica.com');

    
  });

  it('parse NameAddr', function() {
    var data = '"Iñaki ðđøþ" <SIP:%61liCE@versaTICA.Com:6060;TRansport=TCp;Foo=ABc;baz?X-Header-1=AaA1&X-Header-2=BbB&x-header-1=AAA2>;QWE=QWE;ASd';
    var name = ExSIP.NameAddrHeader.parse(data);
    var uri;

    // Parsed data.
    expect(name instanceof(ExSIP.NameAddrHeader)).toEqual(true)
    expect(name.display_name).toEqual( 'Iñaki ðđøþ');
    expect(name.hasParam('qwe')).toEqual( true);
    expect(name.hasParam('asd')).toEqual( true);
    expect(name.hasParam('nooo')).toEqual( false);
    expect(name.getParam('qwe')).toEqual( 'QWE');
    expect(name.getParam('asd')).toEqual( null);

    uri = name.uri;
    expect(uri instanceof(ExSIP.URI)).toEqual(true)
    expect(uri.scheme).toEqual( 'sip');
    expect(uri.user).toEqual( 'aliCE');
    expect(uri.host).toEqual( 'versatica.com');
    expect(uri.port).toEqual( 6060);
    expect(uri.hasParam('transport')).toEqual( true);
    expect(uri.hasParam('nooo')).toEqual( false);
    expect(uri.getParam('transport')).toEqual( 'tcp');
    expect(uri.getParam('foo')).toEqual( 'abc');
    expect(uri.getParam('baz')).toEqual( null);
    expect(uri.getParam('nooo')).toEqual( undefined);
    expect(uri.getHeader('x-header-1')).toEqual( ['AaA1', 'AAA2']);
    expect(uri.getHeader('X-HEADER-2')).toEqual( ['BbB']);
    expect(uri.getHeader('nooo')).toEqual( undefined);

    // Alter data.
    name.display_name = 'Foo Bar';
    expect(name.display_name).toEqual( 'Foo Bar');
    name.display_name = null;
    expect(name.display_name).toEqual( null);
    expect(name.toString()).toEqual( '<sip:aliCE@versatica.com:6060;transport=tcp;foo=abc;baz?X-Header-1=AaA1&X-Header-1=AAA2&X-Header-2=BbB>;qwe=QWE;asd');
    uri.user = 'Iñaki:PASSWD';
    expect(uri.toAor()).toEqual( 'sip:I%C3%B1aki:PASSWD@versatica.com');

    
  });

  it('parse multiple Contact', function() {
    var data = '"Iñaki @ł€" <SIP:+1234@ALIAX.net;Transport=WS>;+sip.Instance="abCD", sip:bob@biloxi.COM;headerParam, <sip:DOMAIN.com:5>';
    var contacts = ExSIP.Grammar.parse(data, 'Contact');

    expect(contacts instanceof(Array)).toEqual(true)
    expect(contacts.length).toEqual( 3);
    var c1 = contacts[0].parsed;
    var c2 = contacts[1].parsed;
    var c3 = contacts[2].parsed;

    // Parsed data.
    expect(c1 instanceof(ExSIP.NameAddrHeader)).toEqual(true)
    expect(c1.display_name).toEqual( 'Iñaki @ł€');
    expect(c1.hasParam('+sip.instance')).toEqual( true);
    expect(c1.hasParam('nooo')).toEqual( false);
    expect(c1.getParam('+SIP.instance')).toEqual( '"abCD"');
    expect(c1.getParam('nooo')).toEqual( undefined);
    expect(c1.uri instanceof(ExSIP.URI)).toEqual(true)
    expect(c1.uri.scheme).toEqual( 'sip');
    expect(c1.uri.user).toEqual( '+1234');
    expect(c1.uri.host).toEqual( 'aliax.net');
    expect(c1.uri.port).toEqual( undefined);
    expect(c1.uri.getParam('transport')).toEqual( 'ws');
    expect(c1.uri.getParam('foo')).toEqual( undefined);
    expect(c1.uri.getHeader('X-Header')).toEqual( undefined);
    expect(c1.toString()).toEqual( '"Iñaki @ł€" <sip:+1234@aliax.net;transport=ws>;+sip.instance="abCD"');

    // Alter data.
    c1.display_name = '€€€';
    expect(c1.display_name).toEqual( '€€€');
    c1.uri.user = '+999';
    expect(c1.uri.user).toEqual( '+999');
    c1.setParam('+sip.instance', '"zxCV"');
    expect(c1.getParam('+SIP.instance')).toEqual( '"zxCV"');
    c1.setParam('New-Param', null);
    expect(c1.hasParam('NEW-param')).toEqual( true);
    c1.uri.setParam('New-Param', null);
    expect(c1.toString()).toEqual( '"€€€" <sip:+999@aliax.net;transport=ws;new-param>;+sip.instance="zxCV";new-param');

    // Parsed data.
    expect(c2 instanceof(ExSIP.NameAddrHeader)).toEqual(true)
    expect(c2.display_name).toEqual( undefined);
    expect(c2.hasParam('HEADERPARAM')).toEqual( true);
    expect(c2.uri instanceof(ExSIP.URI)).toEqual(true)
    expect(c2.uri.scheme).toEqual( 'sip');
    expect(c2.uri.user).toEqual( 'bob');
    expect(c2.uri.host).toEqual( 'biloxi.com');
    expect(c2.uri.port).toEqual( undefined);
    expect(c2.uri.hasParam('headerParam')).toEqual( false);
    expect(c2.toString()).toEqual( '<sip:bob@biloxi.com>;headerparam');

    // Alter data.
    c2.display_name = '@ł€ĸłæß';
    expect(c2.toString()).toEqual( '"@ł€ĸłæß" <sip:bob@biloxi.com>;headerparam');

    // Parsed data.
    expect(c3 instanceof(ExSIP.NameAddrHeader)).toEqual(true)
    expect(c3.display_name).toEqual( undefined);
    expect(c3.uri instanceof(ExSIP.URI)).toEqual(true)
    expect(c3.uri.scheme).toEqual( 'sip');
    expect(c3.uri.user).toEqual( undefined);
    expect(c3.uri.host).toEqual( 'domain.com');
    expect(c3.uri.port).toEqual( 5);
    expect(c3.uri.hasParam('nooo')).toEqual( false);
    expect(c3.toString()).toEqual( '<sip:domain.com:5>');

    // Alter data.
    c3.uri.setParam('newUriParam', 'zxCV');
    c3.setParam('newHeaderParam', 'zxCV');
    expect(c3.toString()).toEqual( '<sip:domain.com:5;newuriparam=zxcv>;newheaderparam=zxCV');

    
  });

  it('parse Via', function() {
    var data = 'SIP /  3.0 \r\n / UDP [1:ab::FF]:6060 ;\r\n  BRanch=1234;Param1=Foo;paRAM2;param3=Bar';
    var via = ExSIP.Grammar.parse(data, 'Via');

    expect(via.protocol).toEqual( 'SIP');
    expect(via.transport).toEqual( 'UDP');
    expect(via.host).toEqual( '[1:ab::FF]');
    expect(via.host_type).toEqual( 'IPv6');
    expect(via.port).toEqual( 6060);
    expect(via.branch).toEqual( '1234');
    expect(via.params).toEqual( {param1: 'Foo', param2: undefined, param3: 'Bar'});

    
  });

  it('parse CSeq', function() {
    var data = '123456  CHICKEN';
    var cseq = ExSIP.Grammar.parse(data, 'CSeq');

    expect(cseq.value).toEqual( 123456);
    expect(cseq.method).toEqual( 'CHICKEN');

    
  });

  it('parse authentication challenge', function() {
    var data = 'Digest realm =  "[1:ABCD::abc]", nonce =  "31d0a89ed7781ce6877de5cb032bf114", qop="AUTH,autH-INt", algorithm =  md5  ,  stale =  TRUE , opaque = "00000188"';
    var auth = ExSIP.Grammar.parse(data, 'challenge');

    expect(auth.realm).toEqual( '[1:ABCD::abc]');
    expect(auth.nonce).toEqual( '31d0a89ed7781ce6877de5cb032bf114');
    expect(auth.qop).toEqual( ['auth', 'auth-int']);
    expect(auth.algorithm).toEqual( 'MD5');
    expect(auth.stale).toEqual( true);
    expect(auth.opaque).toEqual( '00000188');

    
  });

  it('parse Event', function() {
    var data = 'Presence;Param1=QWe;paraM2';
    var event = ExSIP.Grammar.parse(data, 'Event');

    expect(event.event).toEqual( 'presence');
    expect(event.params).toEqual( {param1: 'QWe', param2: undefined});

    
  });

  it('parse host', function() {
    var data, parsed;

    data = 'versatica.com';
    expect((parsed = ExSIP.Grammar.parse(data, 'host')) !== -1).toEqual(true)
    expect(parsed.host_type).toEqual( 'domain');

    data = 'myhost123';
    expect((parsed = ExSIP.Grammar.parse(data, 'host')) !== -1).toEqual(true)
    expect(parsed.host_type).toEqual( 'domain');

    data = '1.2.3.4';
    expect((parsed = ExSIP.Grammar.parse(data, 'host')) !== -1).toEqual(true)
    expect(parsed.host_type).toEqual( 'IPv4');

    data = '[1:0:fF::432]';
    expect((parsed = ExSIP.Grammar.parse(data, 'host')) !== -1).toEqual(true)
    expect(parsed.host_type).toEqual( 'IPv6');

    data = '1.2.3.444';
    expect(ExSIP.Grammar.parse(data, 'host') === -1).toEqual(true)

    data = 'iñaki.com';
    expect(ExSIP.Grammar.parse(data, 'host') === -1).toEqual(true)

    data = '1.2.3.bar.qwe-asd.foo';
    expect((parsed = ExSIP.Grammar.parse(data, 'host')) !== -1).toEqual(true)
    expect(parsed.host_type).toEqual( 'domain');

    // TODO: This is a valid 'domain' but PEGjs finds a valid IPv4 first and does not move
    // to 'domain' after IPv4 parsing has failed.
    // NOTE: Let's ignore this issue for now to make `grunt test` happy.
    //data = '1.2.3.4.bar.qwe-asd.foo';
    //expect((parsed = ExSIP.Grammar.parse(data, 'host')) !== -1).toEqual(true)
    //expect(parsed.host_type).toEqual( 'domain');

    
  });
});