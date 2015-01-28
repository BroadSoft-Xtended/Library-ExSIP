module( "transfer", {
  setup: function() {
    ua = TestExSIP.Helpers.createFakeUA({trace_sip: true, use_preloaded_route: false});
    ua.on('newRTCSession', function(e){
      session = e.data.session;

    });
    transferTarget = "transfertarget@chicago.example.com";
    targetContact = "482n4z24kdg@chicago.example.com;gr=8594958";
    TestExSIP.Helpers.mockWebRTC();
    TestExSIP.Helpers.start(ua);
  }, teardown: function() {
  }
});
test('attended with tdialog supported', function() {
  receiveInviteAndAnswer({allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY", supported: "replaces, gruu, tdialog"});
  strictEqual(session.supports('tdialog'), true, "Should support tdialog");

  attendedTransfer();
  ok(referMsg.call_id !== answerMsg.call_id !== inviteTargetMsg.call_id, "Call ID should not be the same");
  ok(referMsg.from_tag !== answerMsg.to_tag !== inviteTargetMsg.to_tag, "From Tag should not be the same");
  ok(referMsg.to_tag !== answerMsg.from_tag !== inviteTargetMsg.from_tag, "To Tag should not be the same");
  strictEqual(referMsg.getHeader("Require"), "tdialog", "Should contain 'Require: tdialog' header");
  strictEqual(referMsg.getHeader("Target-Dialog"), holdTargetMsg.call_id+";local-tag="+holdTargetMsg.from_tag+";remote-tag="+holdTargetMsg.to_tag, "Should contain 'Target-Dialog' header");

  receiveTransferTargetBye();

  receiveNotify100();

  receiveNotify({status_code: 200, status_msg: "OK"});
});

test('attended with tdialog supported and 420 response from target', function() {
  receiveInviteAndAnswer({allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY", supported: "replaces, gruu, tdialog"});
  strictEqual(session.supports('tdialog'), true, "Should support tdialog");

  ua.attendedTransfer(transferTarget, session);

  holdSent();

  responseForHold();

  inviteTargetSent();

  responseForInviteTarget({status_code: "420 Bad Extension"});

  referSent("<sip:"+transferTarget+">");

  ok(referMsg.call_id !== answerMsg.call_id, "Call ID should not be the same");
  strictEqual(referMsg.getHeader("Require"), "tdialog", "Should contain 'Require: tdialog' header");
  strictEqual(referMsg.getHeader("Target-Dialog"), answerMsg.call_id+";local-tag="+answerMsg.from_tag+";remote-tag="+answerMsg.to_tag, "Should contain 'Target-Dialog' header");

  receiveNotify100();

  receiveNotify({status_code: 200, status_msg: "OK"});
});

test('attended with tdialog supported and 603 Declined response from transferee', function() {
  receiveInviteAndAnswer({allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY", supported: "replaces, gruu, tdialog"});

  attendedTransfer();

  receiveTransferTargetBye();

  receiveNotify100();

  receiveNotifyFailure({status_code: 603, status_msg: "Declined"});
});

test('basic with tdialog supported', function() {
  receiveInviteAndAnswer({allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY", supported: "replaces, gruu, tdialog"});
  strictEqual(session.supports('tdialog'), true, "Should support tdialog");

  basicTransfer();
  ok(referMsg.call_id !== answerMsg.call_id, "Call ID should not be the same");
  ok(referMsg.from_tag !== answerMsg.to_tag, "From Tag should not be the same");
  ok(referMsg.to_tag !== answerMsg.from_tag, "To Tag should not be the same");
  strictEqual(referMsg.getHeader("Require"), "tdialog", "Should contain 'Require: tdialog' header");
  strictEqual(referMsg.getHeader("Target-Dialog"), answerMsg.call_id+";local-tag="+answerMsg.from_tag+";remote-tag="+answerMsg.to_tag, "Should contain 'Target-Dialog' header");

  receiveNotify100();

  receiveNotify({status_code: 200, status_msg: "OK"});
});

test('basic and initiating call', function() {
  sendInviteAndReceiveAnswer();

  basicTransfer();

  receiveNotify100();

  receiveNotify({status_code: 200, status_msg: "OK"});
});

test('basic with tdialog supported and target busy', function() {
  receiveInviteAndAnswer({allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY", supported: "replaces, gruu, tdialog"});

  basicTransfer();

  receiveNotify100();

  receiveNotifyFailure({status_code: 486, status_msg: "Busy Here"});
});

test('basic without tdialog supported', function() {
  receiveInviteAndAnswer({allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY", supported: "replaces"});
  strictEqual(session.supports('tdialog'), false, "Should not support tdialog");

  basicTransfer();
  ok(referMsg.call_id === answerMsg.call_id, "Call ID should be the same");
  ok(referMsg.from_tag === answerMsg.to_tag, "From Tag should be the same");
  ok(referMsg.to_tag === answerMsg.from_tag, "To Tag should be the same");
  strictEqual(referMsg.getHeader("Require"), undefined, "Should not contain 'Require: tdialog' header");
  strictEqual(referMsg.getHeader("Target-Dialog"), undefined, "Should not contain 'Target-Dialog' header");

  receiveNotify100();

  receiveNotify({status_code: 200, status_msg: "OK"});
});

test('basic without tdialog supported and 200 refer status code', function() {
  receiveInviteAndAnswer({allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY", supported: "replaces"});
  strictEqual(session.supports('tdialog'), false, "Should not support tdialog");

  basicTransfer();

  receiveNotify100({refer: {statusCode: "200 OK"}});

  receiveNotify({status_code: 200, status_msg: "OK"});
});

test('basic as transferee', function() {
  sendInviteAndReceiveAnswer();

  receiveHold();

  receiveRefer();
});

test('attended as transferee', function() {
  sendInviteAndReceiveAnswer();

  receiveHold();

  receiveRefer({referRequest: {referTo: "<sip:"+transferTarget+"?Replaces=592435881734450904%3Bto-tag%3D9m2n3wq%3Bfrom-tag%3D763231>"}});
});

function receiveInviteAndAnswer(inviteOptions){
  ua.transport.onMessage({data: TestExSIP.Helpers.initialInviteRequest(ua, inviteOptions)});

  answer();

  TestExSIP.Helpers.responseFor(answerMsg, {method: ExSIP.C.ACK});
}

function sendInviteAndReceiveAnswer(){
  TestExSIP.Helpers.connect(ua);
  inviteMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);

  ua.transport.onMessage({data: TestExSIP.Helpers.ringingResponse(ua)});
  ua.transport.onMessage({data: TestExSIP.Helpers.inviteResponse(ua)});

  ackSent();
}

function basicTransfer() {
  ua.transfer(transferTarget, session);

  holdSent();

  responseForHold();

  referSent("<sip:"+transferTarget+">");
}

function attendedTransfer(options) {
  options = options || {};
  ua.attendedTransfer(transferTarget, session);

  holdSent();

  responseForHold();

  inviteTargetSent();

  responseForInviteTarget(options.inviteTargetResponse);

  holdTargetSent();

  responseForHoldTarget();

  referSent("<sip:"+transferTarget+"?Replaces="
    +holdTargetMsg.call_id+"%3Bto-tag%3D"+holdTargetMsg.to_tag+"%3Bfrom-tag%3D"+holdTargetMsg.from_tag+">");
}

function receiveTransferTargetBye() {
  byeRequestFor(holdTargetMsg);

  okTargetSent();
}

function receiveNotify100(options) {
  options = options || {};
  responseForRefer(options.refer);

  notify100Request();
}

function receiveNotify(options) {
  options = options || {};
  notifyRequest(options);

  byeSent();
}

function notifySent(options) {
  var notifyMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(notifyMsg.method, "NOTIFY");
  strictEqual(notifyMsg.body, options["sdp"] || "SIP/2.0 200 OK");
  strictEqual(notifyMsg.getHeader('Content-Type'), "message/sipfrag");
  strictEqual(notifyMsg.getHeader('Event') || "", "refer");
  return notifyMsg;
}

function notifySentAndReceivedBye(options) {
  options = options || {};
  var notifyMsg = notifySent(options);
  strictEqual(notifyMsg.getHeader('Subscription-State'), "terminated;reason=noresource");

  TestExSIP.Helpers.responseFor(notifyMsg, {method: "NOTIFY"});

  byeRequestFor(notifyMsg);

  okSent();
}

function receiveRefer(options) {
  options = options || {};
  referRequest(inviteMsg, options.referRequest);

  okSent({penultimate: true, statusCode: 202});

  var notifyMsg = notifySent({sdp: "SIP/2.0 100 Trying"});
  strictEqual(notifyMsg.getHeader('Subscription-State'), "active;expires=60");

  TestExSIP.Helpers.responseFor(notifyMsg, {method: "NOTIFY"});
}

function receiveHold() {
  holdRequest(inviteMsg);

  okSent();

  receiveAck(inviteMsg);
}

function receiveNotifyFailure(options) {
  notifyRequest(options);

  TestExSIP.Helpers.triggerOnIceCandidate(session.sessionToTransfer);
  unholdSent();

  responseForUnhold();
}

function answer() {
  var options = TestExSIP.Helpers.getMediaOptions();
  var allow = "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY";
  options["extraHeaders"] = ["Allow: "+allow];
  session.answer(options);
  TestExSIP.Helpers.triggerOnIceCandidate(session);
  answerMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(answerMsg.status_code, 200);
  strictEqual(answerMsg.getHeader("Allow"), allow);
}

function responseForHoldTarget() {
  TestExSIP.Helpers.responseFor(holdTargetMsg, {videoMode: ExSIP.C.RECVONLY, audioMode: ExSIP.C.RECVONLY});
  ackSent({penultimate: true});
}

function responseForInviteTarget(options) {
  options = options || {};
  options = ExSIP.Utils.merge_options(options, {contact: "<sip:"+targetContact+">"});
  TestExSIP.Helpers.responseFor(inviteTargetMsg, options);
  ackSent({penultimate: true});
}

function responseForRefer(options) {
  options = options || {};
  TestExSIP.Helpers.responseFor(referMsg, {method: "REFER", status_code: options.statusCode || "202 Accepted"});
}

function responseForUnhold() {
  TestExSIP.Helpers.responseFor(unholdMsg);
  ackSent();
}

function responseForHold() {
  TestExSIP.Helpers.responseFor(holdMsg, {videoMode: ExSIP.C.RECVONLY, audioMode: ExSIP.C.RECVONLY});
  ackSent({penultimate: true});
}

function notifyRequest(options) {
  options = options || {};
  notifyRequestFor(referMsg, "SIP/2.0 "+options.status_code+" "+options.status_msg, {subscription_state: "terminated;reason=noresource"});
  var notify200OkMsg = TestExSIP.Helpers.popPenultimateMessageSent(ua);
  strictEqual(notify200OkMsg.status_code, 200);
}

function referRequest(request, options) {
  options = TestExSIP.Helpers.merge({method: ExSIP.C.REFER, supported: "replaces", referTo: "<sip:"+transferTarget+">", noSdp: true}, options || {});
  options = TestExSIP.Helpers.mergeOptions(request, options);
  ua.transport.onMessage({data: TestExSIP.Helpers.inviteRequest(ua, options)});
}

function holdRequest(request) {
  var options = TestExSIP.Helpers.mergeOptions(request, {audioMode: ExSIP.C.INACTIVE, videoMode: ExSIP.C.INACTIVE});
  ua.transport.onMessage({data: TestExSIP.Helpers.inviteRequest(ua, options)});
  TestExSIP.Helpers.triggerOnIceCandidate(session);
}

function notify100Request() {
  notifyRequestFor(referMsg, "SIP/2.0 100 Trying");
  var notify100OkMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(notify100OkMsg.status_code, 200);
}

function ackSent(options) {
  options = options || {};
  var ackMsg = options["penultimate"] ? TestExSIP.Helpers.popPenultimateMessageSent(ua) : TestExSIP.Helpers.popMessageSent(ua);
  strictEqual(ackMsg.method, ExSIP.C.ACK);
}

function byeSent() {
  var byeMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(byeMsg.method, ExSIP.C.BYE);
}

function okSent(options) {
  options = options || {};
  var okMsg = options["penultimate"] ? TestExSIP.Helpers.popPenultimateMessageSent() : TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(okMsg.status_code, options["statusCode"] || 200);
}

function receiveAck(request, options) {
  options = TestExSIP.Helpers.mergeOptions(request, options);
  ua.transport.onMessage({data: TestExSIP.Helpers.ackResponse(ua, options)});
}

function holdTargetSent() {
  TestExSIP.Helpers.triggerOnIceCandidate(session);
  holdTargetMsg = TestExSIP.Helpers.popMessageSent(ua);
  strictEqual(holdTargetMsg.method, ExSIP.C.INVITE);
  isMode(holdTargetMsg.body, ExSIP.C.INACTIVE, "0", ExSIP.C.INACTIVE, "0");
  ok(holdTargetMsg.call_id === inviteTargetMsg.call_id, "Should be same dialog");
  strictEqual(holdTargetMsg.getHeader("Content-Type"), "application/sdp");
}

function inviteTargetSent() {
  inviteTargetMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(inviteTargetMsg.method, ExSIP.C.INVITE);
  strictEqual(inviteTargetMsg.to.toString(), "<sip:"+transferTarget+">");
  strictEqual(inviteTargetMsg.getHeader("Require"), "replaces");
  strictEqual(inviteTargetMsg.getHeader("Content-Type"), "application/sdp");
}

function inviteTargetSentAsTransferee(options) {
  options = options || {};
  TestExSIP.Helpers.triggerOnIceCandidate(session);
  inviteTargetMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(inviteTargetMsg.method, ExSIP.C.INVITE);
  strictEqual(inviteTargetMsg.to.toString(), "<sip:"+transferTarget+">");
  strictEqual(inviteTargetMsg.getHeader("Content-Type"), "application/sdp");

  TestExSIP.Helpers.responseFor(inviteTargetMsg, options.inviteResponse);

  ackSent({penultimate: true});
}

function referSent(referTo) {
  referMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(referMsg.method, ExSIP.C.REFER);
  strictEqual(referMsg.getHeader("Refer-To"), referTo);
  strictEqual(referMsg.getHeader("Content-Type"), undefined);
}

function okTargetSent() {
  var okMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(okMsg.status_code, 200);
  strictEqual(okMsg.method, ExSIP.C.BYE);
}

function unholdSent() {
  TestExSIP.Helpers.triggerOnIceCandidate(session);
  unholdMsg = TestExSIP.Helpers.popMessageSent(ua);
  strictEqual(unholdMsg.method, ExSIP.C.INVITE);
  isMode(unholdMsg.body, ExSIP.C.SENDRECV, "16550", ExSIP.C.SENDRECV, "16930");
  strictEqual(unholdMsg.getHeader("Content-Type"), "application/sdp");
}

function holdSent() {
  TestExSIP.Helpers.triggerOnIceCandidate(session);
  holdMsg = TestExSIP.Helpers.popMessageSentAndClear(ua);
  strictEqual(holdMsg.method, ExSIP.C.INVITE);
  isMode(holdMsg.body, ExSIP.C.INACTIVE, "0", ExSIP.C.INACTIVE, "0");
  strictEqual(holdMsg.getHeader("Content-Type"), "application/sdp");
}

function byeRequestFor(request, options) {
  options = TestExSIP.Helpers.mergeOptions(request, options);
  ua.transport.onMessage({data: TestExSIP.Helpers.byeRequest(ua, options)});
}

function notifyRequestFor(request, body, options) {
  options = TestExSIP.Helpers.mergeOptions(request, options);
  options.cseq = '637827301';
  ua.transport.onMessage({data: TestExSIP.Helpers.notifyRequest(ua, body, options)});
}

function isMode(body, audioMode, audioPort, videoMode, videoPort) {
  var localDescription = new ExSIP.WebRTC.RTCSessionDescription({sdp: body, type: "offer"});
  strictEqual(localDescription.getVideoMode(), videoMode);
  strictEqual(localDescription.getAudioMode(), audioMode);
  strictEqual(localDescription.audioPort(), audioPort);
  strictEqual(localDescription.videoPort(), videoPort);
}