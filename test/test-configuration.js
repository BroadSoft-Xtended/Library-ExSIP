require('./include/common');
var testUA = require('./include/testUA');
var ExSIP = require('../');
var ExSIP_C = require('../src/Constants');
var RTCSession = require('../src/RTCSession');
var Utils = require('../src/Utils');

module.exports = {

  'p_asserted_identity': function(test) {
    var ua = testUA.createUAAndCall({p_asserted_identity: 'webrtc_rocks', destination: "other@exsip.net"});
    var inviteRequest = testUA.popMessageSent(ua);
    test.strictEqual(inviteRequest.getHeader('P-Asserted-Identity'), 'webrtc_rocks');
    test.done();
  },

  'enable_ims': function(test) {
    var ua = testUA.createUAAndCall({enable_ims: true, destination: "other@exsip.net"});
    var inviteRequest = testUA.popMessageSent(ua);
    test.strictEqual(inviteRequest.getHeader('P-Asserted-Identity'), '\"Fake UA ð→€ł !!!\" <sip:fakeUA@exsip.net>');
    test.notStrictEqual(inviteRequest.getHeader('From').indexOf('"Fake UA ð→€ł !!!" <sip:fakeUA@exsip.net>;tag='), -1);
    test.strictEqual(inviteRequest.getHeader('To'), '<sip:other@exsip.net>');
    test.notStrictEqual(inviteRequest.data.indexOf('INVITE sip:other@exsip.net SIP/2.0'), -1);
    test.done();
  },

  'enable_ims with phone number': function(test) {
    var ua = testUA.createUAAndCall({enable_ims: true, uri: 'sip:+111111111@exsip.net', destination: "+1222222222@exsip.net"});
    var inviteRequest = testUA.popMessageSent(ua);
    test.strictEqual(inviteRequest.getHeader('P-Asserted-Identity'), '\"Fake UA ð→€ł !!!\" <sip:+111111111@exsip.net;user=phone>');
    test.notStrictEqual(inviteRequest.getHeader('From').indexOf('"Fake UA ð→€ł !!!" <sip:+111111111@exsip.net;user=phone>;tag='), -1);
    test.strictEqual(inviteRequest.getHeader('To'), '<sip:+1222222222@exsip.net;user=phone>');
    test.notStrictEqual(inviteRequest.data.indexOf('INVITE sip:+1222222222@exsip.net;user=phone SIP/2.0'), -1);
    test.done();
  },

  'enable_ims with phone number and ack': function(test) {
    var ua = testUA.createUAAndCall({enable_ims: true, uri: 'sip:+111111111@exsip.net', destination: "+1222222222@exsip.net"});
    var inviteRequest = testUA.popMessageSent(ua);

    testUA.responseFor(inviteRequest);

    var ackMsg = testUA.popMessageSent(ua);
    test.strictEqual(ackMsg.method, ExSIP.C.ACK);
    test.notStrictEqual(ackMsg.getHeader('From').indexOf('"Fake UA ð→€ł !!!" <sip:+111111111@exsip.net;user=phone>;tag='), -1, "Should contain the user=phone in From header : "+ackMsg.getHeader('From'));
    test.notStrictEqual(ackMsg.getHeader('To').indexOf("<sip:+1222222222@exsip.net;user=phone>;tag="), -1, "Should contain the user=phone in To header : "+ackMsg.getHeader('To'));
    test.done();
  },

  'enable_ims = false and with phone number': function(test) {
    var ua = testUA.createUAAndCall({enable_ims: false, uri: 'sip:+111111111@exsip.net', destination: "+1222222222@exsip.net"});
    var inviteRequest = testUA.popMessageSent(ua);
    test.strictEqual(inviteRequest.getHeader('P-Asserted-Identity'), undefined);
    test.notStrictEqual(inviteRequest.getHeader('From').indexOf('"Fake UA ð→€ł !!!" <sip:+111111111@exsip.net>;tag='), -1);
    test.strictEqual(inviteRequest.getHeader('To'), '<sip:+1222222222@exsip.net>');
    test.notStrictEqual(inviteRequest.data.indexOf('INVITE sip:+1222222222@exsip.net SIP/2.0'), -1);
    test.done();
  }
}
