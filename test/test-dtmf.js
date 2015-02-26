require('./include/common');

describe('dtmf', function() {

  beforeEach(function() {
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
  });

  it('dtmf sent with multiple tones', function() {
    var toneSent = '';
    session.dtmf.dtmfSender.insertDTMF = function(tone) {
      toneSent = tone;
    }
    session.sendDTMF(',,0430813#', {
      duration: 100,
      interToneGap: 100
    });
    session.dtmf.processQueuedDTMFs();
    expect(toneSent).toEqual( ',,0430813#');
  });

  it('with multiple tones queued', function() {
    var toneSent = '';
    session.dtmf.dtmfSender.insertDTMF = function(tone) {
      toneSent = tone;
    }
    session.sendDTMF('1', {
      duration: 100,
      interToneGap: 100
    });
    expect(toneSent).toEqual( '');
    session.sendDTMF('2', {
      duration: 100,
      interToneGap: 100
    });
    expect(toneSent).toEqual( '');
    session.sendDTMF('3', {
      duration: 100,
      interToneGap: 100
    });
    expect(toneSent).toEqual( '');
    session.dtmf.processQueuedDTMFs();
    expect(toneSent).toEqual( '123');
  });

  it('with multiple tones and reinvite', function() {
    var toneSent = '';
    session.dtmf.dtmfSender.insertDTMF = function(tone) {
      toneSent = tone;
    }
    session.sendDTMF('1', {
      duration: 100,
      interToneGap: 100
    });
    expect(toneSent).toEqual( '');
    session.sendDTMF('2', {
      duration: 100,
      interToneGap: 100
    });
    expect(toneSent).toEqual( '');
    session.sendDTMF('3', {
      duration: 100,
      interToneGap: 100
    });
    expect(toneSent).toEqual( '');
    session.dtmf.processQueuedDTMFs();
    expect(toneSent).toEqual( '123');
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
    expect(toneSent).toEqual( '3');
    
  });

  it('with multiple tones as batch and reinvite', function() {
    var toneSent = '';
    session.dtmf.dtmfSender.insertDTMF = function(tone) {
      toneSent = tone;
    }
    session.sendDTMF('123', {
      duration: 100,
      interToneGap: 100
    });
    expect(toneSent).toEqual( '');
    session.dtmf.processQueuedDTMFs();
    expect(toneSent).toEqual( '123');
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
    expect(toneSent).toEqual( '3');
    
  });
});