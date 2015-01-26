require('./include/common');
var testUA = require('./include/testUA');
var ExSIP = require('../');

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
    testUA.startAndConnect(ua);

    ua.transport.onMessage({
      data: testUA.ringingResponse(ua)
    });
    ua.transport.onMessage({
      data: testUA.inviteResponse(ua, {
        videoPort: "0",
        hasBandwidth: true
      })
    });
    callback();
  },

  'dtmf sent with multiple tones': function(test) {
    var toneSent = '';
    session.dtmf.dtmfSender.insertDTMF = function(tone) {
      toneSent = tone;
    }
    session.sendDTMF(',,0430813#', {
      duration: 100,
      interToneGap: 100
    });
    session.dtmf.processQueuedDTMFs();
    test.strictEqual(toneSent, ',,0430813#');
    test.done();
  },

  'with multiple tones queued': function(test) {
    var toneSent = '';
    session.dtmf.dtmfSender.insertDTMF = function(tone) {
      toneSent = tone;
    }
    session.sendDTMF('1', {
      duration: 100,
      interToneGap: 100
    });
    test.strictEqual(toneSent, '');
    session.sendDTMF('2', {
      duration: 100,
      interToneGap: 100
    });
    test.strictEqual(toneSent, '');
    session.sendDTMF('3', {
      duration: 100,
      interToneGap: 100
    });
    test.strictEqual(toneSent, '');
    session.dtmf.processQueuedDTMFs();
    test.strictEqual(toneSent, '123');
    test.done();
  },

  'with multiple tones and reinvite': function(test) {
    var toneSent = '';
    session.dtmf.dtmfSender.insertDTMF = function(tone) {
      toneSent = tone;
    }
    session.sendDTMF('1', {
      duration: 100,
      interToneGap: 100
    });
    test.strictEqual(toneSent, '');
    session.sendDTMF('2', {
      duration: 100,
      interToneGap: 100
    });
    test.strictEqual(toneSent, '');
    session.sendDTMF('3', {
      duration: 100,
      interToneGap: 100
    });
    test.strictEqual(toneSent, '');
    session.dtmf.processQueuedDTMFs();
    test.strictEqual(toneSent, '123');
    session.dtmf.dtmfSender.ontonechange({
      tone: '1'
    });
    session.dtmf.dtmfSender.ontonechange({
      tone: '2'
    });

    ua.transport.onMessage({
      data: testUA.inviteRequest(ua, {
        withoutVideo: true
      })
    });
    session.rtcMediaHandler.peerConnection.setLocalDescription(testUA.createDescription({
      withoutVideo: true,
      type: "answer"
    }));
    testUA.triggerOnIceCandidate(session);

    toneSent = '';
    session.dtmf.dtmfSender.insertDTMF = function(tone) {
      toneSent = tone;
    }
    session.dtmf.processQueuedDTMFs();
    test.strictEqual(toneSent, '3');
    test.done();
  },

  'with multiple tones as batch and reinvite': function(test) {
    var toneSent = '';
    session.dtmf.dtmfSender.insertDTMF = function(tone) {
      toneSent = tone;
    }
    session.sendDTMF('123', {
      duration: 100,
      interToneGap: 100
    });
    test.strictEqual(toneSent, '');
    session.dtmf.processQueuedDTMFs();
    test.strictEqual(toneSent, '123');
    session.dtmf.dtmfSender.ontonechange({
      tone: '1'
    });
    session.dtmf.dtmfSender.ontonechange({
      tone: '2'
    });

    ua.transport.onMessage({
      data: testUA.inviteRequest(ua, {
        withoutVideo: true
      })
    });
    session.rtcMediaHandler.peerConnection.setLocalDescription(testUA.createDescription({
      withoutVideo: true,
      type: "answer"
    }));
    testUA.triggerOnIceCandidate(session);

    toneSent = '';
    session.dtmf.dtmfSender.insertDTMF = function(tone) {
      toneSent = tone;
    }
    session.dtmf.processQueuedDTMFs();
    test.strictEqual(toneSent, '3');
    test.done();
  }
}