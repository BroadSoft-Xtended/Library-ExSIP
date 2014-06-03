module( "sendDTMF", {
  setup: function() {
    ua = TestExSIP.Helpers.createFakeUA({trace_sip: true, use_preloaded_route: false});
    ua.on('newRTCSession', function(e){ session = e.data.session; });
    TestExSIP.Helpers.mockWebRTC();
    TestExSIP.Helpers.startAndConnect(ua);

    ua.transport.onMessage({data: TestExSIP.Helpers.ringingResponse(ua)});
    ua.transport.onMessage({data: TestExSIP.Helpers.inviteResponse(ua, {videoPort: "0", hasBandwidth: true})});
  }, teardown: function() {
  }
});

test('dtmf sent with multiple tones', function() {
  var toneSent = '';
  session.dtmf.dtmfSender.insertDTMF = function(tone) { toneSent = tone;}
  session.sendDTMF(',,0430813#', {duration: 100, interToneGap: 100});
  session.dtmf.processQueuedDTMFs();
  strictEqual(toneSent, ',,0430813#');
});

test('with multiple tones queued', function() {
  var toneSent = '';
  session.dtmf.dtmfSender.insertDTMF = function(tone) { toneSent = tone;}
  session.sendDTMF('1', {duration: 100, interToneGap: 100});
  strictEqual(toneSent, '');
  session.sendDTMF('2', {duration: 100, interToneGap: 100});
  strictEqual(toneSent, '');
  session.sendDTMF('3', {duration: 100, interToneGap: 100});
  strictEqual(toneSent, '');
  session.dtmf.processQueuedDTMFs();
  strictEqual(toneSent, '123');
});

test('with multiple tones and reinvite', function() {
  var toneSent = '';
  session.dtmf.dtmfSender.insertDTMF = function(tone) { toneSent = tone;}
  session.sendDTMF('1', {duration: 100, interToneGap: 100});
  strictEqual(toneSent, '');
  session.sendDTMF('2', {duration: 100, interToneGap: 100});
  strictEqual(toneSent, '');
  session.sendDTMF('3', {duration: 100, interToneGap: 100});
  strictEqual(toneSent, '');
  session.dtmf.processQueuedDTMFs();
  strictEqual(toneSent, '123');
  session.dtmf.dtmfSender.ontonechange({tone:'1'});
  session.dtmf.dtmfSender.ontonechange({tone:'2'});

  ua.transport.onMessage({data: TestExSIP.Helpers.inviteRequest(ua, {withoutVideo: true})});
  session.rtcMediaHandler.peerConnection.setLocalDescription(TestExSIP.Helpers.createDescription({withoutVideo: true, type: "answer"}));
  TestExSIP.Helpers.triggerOnIceCandidate(session);

  toneSent = '';
  session.dtmf.dtmfSender.insertDTMF = function(tone) { toneSent = tone;}
  session.dtmf.processQueuedDTMFs();
  strictEqual(toneSent, '3');
});
test('with multiple tones as batch and reinvite', function() {
  var toneSent = '';
  session.dtmf.dtmfSender.insertDTMF = function(tone) { toneSent = tone;}
  session.sendDTMF('123', {duration: 100, interToneGap: 100});
  strictEqual(toneSent, '');
  session.dtmf.processQueuedDTMFs();
  strictEqual(toneSent, '123');
  session.dtmf.dtmfSender.ontonechange({tone:'1'});
  session.dtmf.dtmfSender.ontonechange({tone:'2'});

  ua.transport.onMessage({data: TestExSIP.Helpers.inviteRequest(ua, {withoutVideo: true})});
  session.rtcMediaHandler.peerConnection.setLocalDescription(TestExSIP.Helpers.createDescription({withoutVideo: true, type: "answer"}));
  TestExSIP.Helpers.triggerOnIceCandidate(session);

  toneSent = '';
  session.dtmf.dtmfSender.insertDTMF = function(tone) { toneSent = tone;}
  session.dtmf.processQueuedDTMFs();
  strictEqual(toneSent, '3');
});