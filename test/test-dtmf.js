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

test('dtmf sent', function() {
  var toneSent = '';
  session.rtcMediaHandler.getDTMF().dtmfSender.insertDTMF = function(tone) { toneSent = tone;}
  session.sendDTMF('1', {duration: 100, interToneGap: 100});
  strictEqual(toneSent, '');
  session.sendDTMF('2', {duration: 100, interToneGap: 100});
  strictEqual(toneSent, '');
  session.sendDTMF('3', {duration: 100, interToneGap: 100});
  strictEqual(toneSent, '');
  session.rtcMediaHandler.getDTMF().processQueuedDTMFs();
  strictEqual(toneSent, '123');
});

test('dtmf sent with multiple tones', function() {
  var toneSent = '';
  session.rtcMediaHandler.getDTMF().dtmfSender.insertDTMF = function(tone) { toneSent = tone;}
  session.sendDTMF(',,0430813#', {duration: 100, interToneGap: 100});
  session.rtcMediaHandler.getDTMF().processQueuedDTMFs();
  strictEqual(toneSent, ',,0430813#');
});

test('dtmf sent after reinvite', function() {
  session.sendDTMF('1', {duration: 100, interToneGap: 100});

  var dtmfSenderBefore = session.rtcMediaHandler.dtmf;
  ua.transport.onMessage({data: TestExSIP.Helpers.inviteRequest(ua, {withoutVideo: true})});
  session.rtcMediaHandler.peerConnection.setLocalDescription(TestExSIP.Helpers.createDescription({withoutVideo: true, type: "answer"}));
  TestExSIP.Helpers.triggerOnIceCandidate(session);
  var answerMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(answerMsg.status_code, 200);

  session.sendDTMF('1', {duration: 100, interToneGap: 100});
  ok(dtmfSenderBefore !== session.rtcMediaHandler.dtmf, "the DTMF should have been recreated");
});
