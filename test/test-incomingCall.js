require('./include/common');
var testUA = require('./include/testUA');
var ExSIP = require('../');
var RTCSession = require('../src/RTCSession');

module.exports = {

  setUp: function(callback) {
    ua = testUA.createFakeUA({
      trace_sip: true,
      use_preloaded_route: false
    });
    ua.on('newRTCSession', function(e) {
      session = e.data.session;
    });
    testUA.mockWebRTC();
    testUA.start(ua);
    callback();
  },

  'terminate before answering': function(test) {
    ua.transport.onMessage({
      data: testUA.initialInviteRequest(ua, {})
    });
    session.terminate();
    var answerMsg = testUA.popMessageSent(ua);
    test.strictEqual(answerMsg.status_code, 486, "Should send a 486 response");
    test.done();
  },
  'with Firefox and not null candidate': function(test) {
    ua.transport.onMessage({
      data: testUA.initialInviteRequest(ua, {})
    });
    mozRTCPeerConnection = {};
    session.answer();
    testUA.triggerOnIceCandidate(session);
    var answerMsg = testUA.popMessageSent(ua);
    test.strictEqual(answerMsg.status_code, 200);
    mozRTCPeerConnection = undefined;
    test.done();
  },
  'initial invite without sdp': function(test) {
    ua.transport.onMessage({
      data: testUA.initialInviteRequest(ua, {
        noSdp: true
      })
    });
    session.answer();
    testUA.triggerOnIceCandidate(session);
    var answerMsg = testUA.popMessageSent(ua);
    test.strictEqual(answerMsg.status_code, 200);
    test.notStrictEqual(answerMsg.body, '', 'should have sdp');
    test.done();
  },
  'INFO received after INVITE': function(test) {
    var answerMsg = testUA.receiveInviteAndAnswer();
    var started = false;
    session.on('started', function(e) {
      started = true;
    });
    var sdp = '<?xml version="1.0" encoding="utf-8"?>\r\n' +
      '<media_control>\r\n' +
      '<vc_primitive>\r\n' +
      '<to_encoder>\r\n' +
      '<picture_fast_update/>\r\n' +
      '</to_encoder>\r\n' +
      '</vc_primitive>\r\n' +
      '</media_control>\r\n' +
      '\r\n';
    testUA.requestFor(answerMsg, {
      method: 'INFO',
      content_type: 'application/media_control+xml',
      branch: 'z9hG4bK-524287-1---8b28117fe385ce21',
      sdp: sdp
    });

    var infoAnswerMsg = testUA.popMessageSent(ua);
    test.strictEqual(infoAnswerMsg.status_code, 200);
    test.strictEqual(started, true, "should trigger started in order to update video streams");
    test.done();    
  },
  'reINVITE received after INVITE and before ACK': function(test) {
    var answerMsg = testUA.receiveInviteAndAnswer();
    var reinviteMsg = testUA.initialInviteRequest(ua, {
      branch: 'z9hG4bK-524287-1---ab6ff8065ea5f163', 
      to_tag: ';tag='+answerMsg.to_tag,
      cseq: '33333',
      noSdp: true, 
      withoutContentType: true, 
      supported: 'replaces'
    });
    ua.transport.onMessage({data: reinviteMsg});

    var reinviteAnswerMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(reinviteAnswerMsg.status_code, 500);
    test.notStrictEqual(reinviteAnswerMsg.getHeader('Retry-After'), undefined);
    test.strictEqual(session.status, RTCSession.C.STATUS_WAITING_FOR_ACK);

    testUA.ackResponseFor(answerMsg, {branch: 'z9hG4bK-524287-1---e126e35bf46fb226', cseq: answerMsg.cseq});
    test.strictEqual(session.status, RTCSession.C.STATUS_CONFIRMED);
    test.done();
  }
}