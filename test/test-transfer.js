require('./include/common');

describe('transfer', function() {

  beforeEach(function() {
    ua = testUA.createFakeUA({
      trace_sip: true,
      use_preloaded_route: false
    });
    ua.on('newRTCSession', function(e) {
      session = e.data.session;

    });
    transferTarget = "transfertarget@chicago.example.com";
    targetContact = "482n4z24kdg@chicago.example.com;gr=8594958";
    testUA.mockWebRTC();
    testUA.start(ua);
  });

  it('attended with tdialog supported', function() {
    receiveInviteAndAnswer({
      allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY",
      supported: "replaces, gruu, tdialog"
    });
    expect(session.supports('tdialog')).toEqual(true, "Should support tdialog");

    attendedTransfer();
    expect(referMsg.call_id !== answerMsg.call_id !== inviteTargetMsg.call_id).toEqual(true,  "Call ID should not be the same")
    expect(referMsg.from_tag !== answerMsg.to_tag !== inviteTargetMsg.to_tag).toEqual(true,  "From Tag should not be the same")
    expect(referMsg.to_tag !== answerMsg.from_tag !== inviteTargetMsg.from_tag).toEqual(true,  "To Tag should not be the same")
    expect(referMsg.getHeader("Require")).toEqual("tdialog", "Should contain 'Require: tdialog' header");
    expect(referMsg.getHeader("Target-Dialog")).toEqual(holdTargetMsg.call_id + ";local-tag=" + holdTargetMsg.from_tag + ";remote-tag=" + holdTargetMsg.to_tag, "Should contain 'Target-Dialog' header");

    receiveTransferTargetBye();

    receiveNotify100();

    receiveNotify({
      status_code: 200,
      status_msg: "OK"
    });

  });
  it('attended with tdialog supported and 420 response from target', function() {
    receiveInviteAndAnswer({
      allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY",
      supported: "replaces, gruu, tdialog"
    });
    expect(session.supports('tdialog')).toEqual(true, "Should support tdialog");

    ua.attendedTransfer(transferTarget, session);

    holdSent();

    responseForHold();

    inviteTargetSent();

    responseForInviteTarget({
      status_code: "420 Bad Extension"
    });

    referSent("<sip:" + transferTarget + ">");

    expect(referMsg.call_id !== answerMsg.call_id).toEqual(true,  "Call ID should not be the same")
    expect(referMsg.getHeader("Require")).toEqual("tdialog", "Should contain 'Require: tdialog' header");
    expect(referMsg.getHeader("Target-Dialog")).toEqual(answerMsg.call_id + ";local-tag=" + answerMsg.from_tag + ";remote-tag=" + answerMsg.to_tag, "Should contain 'Target-Dialog' header");

    receiveNotify100();

    receiveNotify({
      status_code: 200,
      status_msg: "OK"
    });

  });

  it('attended with tdialog supported and 603 Declined response from transferee', function() {
    receiveInviteAndAnswer({
      allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY",
      supported: "replaces, gruu, tdialog"
    });

    attendedTransfer();

    receiveTransferTargetBye();

    receiveNotify100();

    receiveNotifyFailure({
      status_code: 603,
      status_msg: "Declined"
    });

  });

  it('basic with tdialog supported', function() {
    var inviteCSeq = 1;
    var inviteMsg = receiveInviteAndAnswer({
      allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY",
      supported: "replaces, gruu, tdialog",
      cseq: inviteCSeq
    });
    expect(session.supports('tdialog')).toEqual(true, "Should support tdialog");

    basicTransfer();
    expect(referMsg.call_id !== answerMsg.call_id).toEqual(true,  "Call ID should not be the same")
    expect(referMsg.from_tag !== answerMsg.to_tag).toEqual(true,  "From Tag should not be the same")
    expect(referMsg.to_tag !== answerMsg.from_tag).toEqual(true,  "To Tag should not be the same")
    expect(referMsg.getHeader("Require")).toEqual("tdialog", "Should contain 'Require: tdialog' header");
    expect(referMsg.getHeader("Target-Dialog")).toEqual(answerMsg.call_id + ";local-tag=" + answerMsg.from_tag + ";remote-tag=" + answerMsg.to_tag, "Should contain 'Target-Dialog' header");

    receiveNotify100({
      cseq: inviteCSeq + 1
    });

    receiveNotify({
      status_code: 200,
      status_msg: "OK",
      cseq: inviteCSeq + 2
    });

  });

  it('basic and initiating call', function() {
    sendInviteAndReceiveAnswer();

    basicTransfer();

    receiveNotify100();

    receiveNotify({
      status_code: 200,
      status_msg: "OK"
    });

  });

  it('basic with tdialog supported and target busy', function() {
    receiveInviteAndAnswer({
      allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY",
      supported: "replaces, gruu, tdialog"
    });

    basicTransfer();

    receiveNotify100();

    receiveNotifyFailure({
      status_code: 486,
      status_msg: "Busy Here"
    });

  });

  it('basic without tdialog supported', function() {
    receiveInviteAndAnswer({
      allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY",
      supported: "replaces"
    });
    expect(session.supports('tdialog')).toEqual(false, "Should not support tdialog");

    basicTransfer();
    expect(referMsg.call_id === answerMsg.call_id).toEqual(true,  "Call ID should be the same")
    expect(referMsg.from_tag === answerMsg.to_tag).toEqual(true,  "From Tag should be the same")
    expect(referMsg.to_tag === answerMsg.from_tag).toEqual(true,  "To Tag should be the same")
    expect(referMsg.getHeader("Require")).toEqual(undefined, "Should not contain 'Require: tdialog' header");
    expect(referMsg.getHeader("Target-Dialog")).toEqual(undefined, "Should not contain 'Target-Dialog' header");

    receiveNotify100();

    receiveNotify({
      status_code: 200,
      status_msg: "OK"
    });

  });

  it('basic without tdialog supported and 200 refer status code', function() {
    receiveInviteAndAnswer({
      allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY",
      supported: "replaces"
    });
    expect(session.supports('tdialog')).toEqual(false, "Should not support tdialog");

    basicTransfer();

    receiveNotify100({
      refer: {
        statusCode: "200 OK"
      }
    });

    receiveNotify({
      status_code: 200,
      status_msg: "OK"
    });

  });

  it('basic as transferee', function() {
    var inviteMsg = sendInviteAndReceiveAnswer();

    receiveHold(inviteMsg);

    receiveRefer(inviteMsg);

  });

  it('attended as transferee', function() {
    var inviteMsg = sendInviteAndReceiveAnswer();

    receiveHold(inviteMsg);

    receiveRefer(inviteMsg, {
      referRequest: {
        referTo: "<sip:" + transferTarget + "?Replaces=592435881734450904%3Bto-tag%3D9m2n3wq%3Bfrom-tag%3D763231>"
      }
    });

  });
});

function receiveInviteAndAnswer(inviteOptions) {
  var inviteMsg = testUA.initialInviteRequest(ua, inviteOptions);
  ua.transport.onMessage({
    data: inviteMsg
  });

  answer();

  testUA.ackResponseFor(answerMsg);

  return inviteMsg;
}

function sendInviteAndReceiveAnswer() {
  testUA.connect(ua);
  var inviteMsg = testUA.popMessageSentAndClear(ua);

  ua.transport.onMessage({
    data: testUA.ringingResponse(ua)
  });
  ua.transport.onMessage({
    data: testUA.inviteResponse(ua)
  });

  ackSent();

  return inviteMsg;
}

function basicTransfer() {
  ua.transfer(transferTarget, session);

  holdSent();

  responseForHold();

  referSent("<sip:" + transferTarget + ">");
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

  referSent("<sip:" + transferTarget + "?Replaces=" + holdTargetMsg.call_id + "%3Bto-tag%3D" + holdTargetMsg.to_tag + "%3Bfrom-tag%3D" + holdTargetMsg.from_tag + ">");
}

function receiveTransferTargetBye() {
  byeRequestFor(holdTargetMsg);

  okTargetSent();
}

function receiveNotify100(options) {
  options = options || {};
  responseForRefer(options.refer);

  notify100Request(options);
}

function receiveNotify(options) {
  options = options || {};
  notifyRequest(options);

  byeSent();
}

function notifySent(options) {
  var notifyMsg = testUA.popMessageSentAndClear(ua);
  expect(notifyMsg.method).toEqual("NOTIFY");
  expect(notifyMsg.body).toEqual(options["sdp"] || "SIP/2.0 200 OK");
  expect(notifyMsg.getHeader('Content-Type')).toEqual("message/sipfrag");
  expect(notifyMsg.getHeader('Event') || "").toEqual("refer");
  return notifyMsg;
}

function notifySentAndReceivedBye(options) {
  options = options || {};
  var notifyMsg = notifySent(options);
  expect(notifyMsg.getHeader('Subscription-State')).toEqual("terminated;reason=noresource");

  testUA.responseFor(notifyMsg, {
    method: "NOTIFY"
  });

  byeRequestFor(notifyMsg);

  okSent();
}

function receiveRefer(inviteMsg, options) {
  options = options || {};
  referRequest(inviteMsg, options.referRequest);

  okSent({
    penultimate: true,
    statusCode: 202
  });

  var notifyMsg = notifySent({
    sdp: "SIP/2.0 100 Trying"
  });
  expect(notifyMsg.getHeader('Subscription-State')).toEqual("active;expires=60");

  testUA.responseFor(notifyMsg, {
    method: "NOTIFY"
  });
}

function receiveHold(inviteMsg) {
  holdRequest(inviteMsg);

  okSent();

  receiveAck(inviteMsg, inviteMsg);
}

function receiveNotifyFailure(options) {
  notifyRequest(options);

  testUA.triggerOnIceCandidate(session.sessionToTransfer);
  unholdSent();

  responseForUnhold();
}

function answer() {
  var options = testUA.getMediaOptions();
  var allow = "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY";
  options["extraHeaders"] = ["Allow: " + allow];
  session.answer(options);
  testUA.triggerOnIceCandidate(session);
  answerMsg = testUA.popMessageSentAndClear(ua);
  expect(answerMsg.status_code).toEqual(200);
  expect(answerMsg.getHeader("Allow")).toEqual(allow);
}

function responseForHoldTarget() {
  testUA.responseFor(holdTargetMsg, {
    videoMode: ExSIP_C.RECVONLY,
    audioMode: ExSIP_C.RECVONLY
  });
  ackSent({
    penultimate: true
  });
}

function responseForInviteTarget(options) {
  options = options || {};
  options = Utils.merge_options(options, {
    contact: "<sip:" + targetContact + ">"
  });
  testUA.responseFor(inviteTargetMsg, options);
  ackSent({
    penultimate: true
  });
}

function responseForRefer(options) {
  options = options || {};
  testUA.responseFor(referMsg, {
    method: "REFER",
    status_code: options.statusCode || "202 Accepted"
  });
}

function responseForUnhold() {
  testUA.responseFor(unholdMsg);
  ackSent();
}

function responseForHold() {
  testUA.responseFor(holdMsg, {
    videoMode: ExSIP_C.RECVONLY,
    audioMode: ExSIP_C.RECVONLY
  });
  ackSent({
    penultimate: true
  });
}

function notifyRequest(options) {
  options = options || {};
  notifyRequestFor(referMsg, "SIP/2.0 " + options.status_code + " " + options.status_msg, {
    cseq: options.cseq,
    subscription_state: "terminated;reason=noresource"
  });
  var notify200OkMsg = testUA.popPenultimateMessageSent(ua);
  expect(notify200OkMsg.status_code).toEqual(200);
}

function referRequest(request, options) {
  options = testUA.merge({
    method: ExSIP_C.REFER,
    supported: "replaces",
    referTo: "<sip:" + transferTarget + ">",
    noSdp: true
  }, options || {});
  options = testUA.mergeOptions(request, options);
  ua.transport.onMessage({
    data: testUA.inviteRequest(ua, options)
  });
}

function holdRequest(request) {
  var options = testUA.mergeOptions(request, {
    audioMode: ExSIP_C.INACTIVE,
    videoMode: ExSIP_C.INACTIVE
  });
  ua.transport.onMessage({
    data: testUA.inviteRequest(ua, options)
  });
  testUA.triggerOnIceCandidate(session);
}

function notify100Request(options) {
  notifyRequestFor(referMsg, "SIP/2.0 100 Trying", options);
  var notify100OkMsg = testUA.popMessageSentAndClear(ua);
  expect(notify100OkMsg.status_code).toEqual(200);
}

function ackSent(options) {
  options = options || {};
  var ackMsg = options["penultimate"] ? testUA.popPenultimateMessageSent(ua) : testUA.popMessageSent(ua);
  expect(ackMsg.method).toEqual(ExSIP_C.ACK);
}

function byeSent() {
  var byeMsg = testUA.popMessageSentAndClear(ua);
  expect(byeMsg.method).toEqual(ExSIP_C.BYE);
}

function okSent(options) {
  options = options || {};
  var okMsg = options["penultimate"] ? testUA.popPenultimateMessageSent(ua) : testUA.popMessageSentAndClear(ua);
  expect(okMsg.status_code).toEqual(options["statusCode"] || 200);
}

function receiveAck(request, options) {
  options = testUA.mergeOptions(request, options);
  ua.transport.onMessage({
    data: testUA.ackResponse(ua, options)
  });
}

function holdTargetSent() {
  testUA.triggerOnIceCandidate(session);
  holdTargetMsg = testUA.popMessageSent(ua);
  expect(holdTargetMsg.method).toEqual(ExSIP_C.INVITE);
  isMode(holdTargetMsg.body, ExSIP_C.INACTIVE, "0", ExSIP_C.INACTIVE, "0");
  expect(holdTargetMsg.call_id === inviteTargetMsg.call_id).toEqual(true,  "Should be same dialog")
  expect(holdTargetMsg.getHeader("Content-Type")).toEqual("application/sdp");
}

function inviteTargetSent() {
  inviteTargetMsg = testUA.popMessageSentAndClear(ua);
  expect(inviteTargetMsg.method).toEqual(ExSIP_C.INVITE);
  expect(inviteTargetMsg.to.toString()).toEqual("<sip:" + transferTarget + ">");
  expect(inviteTargetMsg.getHeader("Require")).toEqual("replaces");
  expect(inviteTargetMsg.getHeader("Content-Type")).toEqual("application/sdp");
}

function inviteTargetSentAsTransferee(options) {
  options = options || {};
  testUA.triggerOnIceCandidate(session);
  inviteTargetMsg = testUA.popMessageSentAndClear(ua);
  expect(inviteTargetMsg.method).toEqual(ExSIP_C.INVITE);
  expect(inviteTargetMsg.to.toString()).toEqual("<sip:" + transferTarget + ">");
  expect(inviteTargetMsg.getHeader("Content-Type")).toEqual("application/sdp");

  testUA.responseFor(inviteTargetMsg, options.inviteResponse);

  ackSent({
    penultimate: true
  });
}

function referSent(referTo) {
  referMsg = testUA.popMessageSentAndClear(ua);
  expect(referMsg.method).toEqual(ExSIP_C.REFER);
  expect(referMsg.getHeader("Refer-To")).toEqual(referTo);
  expect(referMsg.getHeader("Content-Type")).toEqual(undefined);
}

function okTargetSent() {
  var okMsg = testUA.popMessageSentAndClear(ua);
  expect(okMsg.status_code).toEqual(200);
  expect(okMsg.method).toEqual(ExSIP_C.BYE);
}

function unholdSent() {
  testUA.triggerOnIceCandidate(session);
  unholdMsg = testUA.popMessageSent(ua);
  expect(unholdMsg.method).toEqual(ExSIP_C.INVITE);
  isMode(unholdMsg.body, ExSIP_C.SENDRECV, "16550", ExSIP_C.SENDRECV, "16930");
  expect(unholdMsg.getHeader("Content-Type")).toEqual("application/sdp");
}

function holdSent() {
  testUA.triggerOnIceCandidate(session);
  holdMsg = testUA.popMessageSentAndClear(ua);
  expect(holdMsg.method).toEqual(ExSIP_C.INVITE);
  isMode(holdMsg.body, ExSIP_C.INACTIVE, "0", ExSIP_C.INACTIVE, "0");
  expect(holdMsg.getHeader("Content-Type")).toEqual("application/sdp");
}

function byeRequestFor(request, options) {
  options = testUA.mergeOptions(request, options);
  ua.transport.onMessage({
    data: testUA.byeRequest(ua, options)
  });
}

function notifyRequestFor(request, body, options) {
  var notifyOptions = testUA.mergeOptions(request, options);
  notifyOptions.cseq = options.cseq || '637827301';
  notifyOptions.branch = 'z9hG4bKnas615';
  ua.transport.onMessage({
    data: testUA.notifyRequest(ua, body, notifyOptions)
  });
}

function isMode(body, audioMode, audioPort, videoMode, videoPort) {
  var localDescription = new WebRTC.RTCSessionDescription({
    sdp: body,
    type: "offer"
  });
  expect(localDescription.getVideoMode()).toEqual(videoMode);
  expect(localDescription.getAudioMode()).toEqual(audioMode);
  expect(localDescription.audioPort()).toEqual(audioPort);
  expect(localDescription.videoPort()).toEqual(videoPort);
}