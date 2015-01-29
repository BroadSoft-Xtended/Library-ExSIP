require('./include/common');
var testUA = require('./include/testUA');
var ExSIP = require('../');
var WebRTC = require('../src/WebRTC');
var ExSIP_C = require('../src/Constants');
var Utils = require('../src/Utils');

module.exports = {

  setUp: function(callback) {
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
    callback();
  },

  'attended with tdialog supported': function(test) {
    receiveInviteAndAnswer(test, {
      allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY",
      supported: "replaces, gruu, tdialog"
    });
    test.strictEqual(session.supports('tdialog'), true, "Should support tdialog");

    attendedTransfer(test);
    test.ok(referMsg.call_id !== answerMsg.call_id !== inviteTargetMsg.call_id, "Call ID should not be the same");
    test.ok(referMsg.from_tag !== answerMsg.to_tag !== inviteTargetMsg.to_tag, "From Tag should not be the same");
    test.ok(referMsg.to_tag !== answerMsg.from_tag !== inviteTargetMsg.from_tag, "To Tag should not be the same");
    test.strictEqual(referMsg.getHeader("Require"), "tdialog", "Should contain 'Require: tdialog' header");
    test.strictEqual(referMsg.getHeader("Target-Dialog"), holdTargetMsg.call_id + ";local-tag=" + holdTargetMsg.from_tag + ";remote-tag=" + holdTargetMsg.to_tag, "Should contain 'Target-Dialog' header");

    receiveTransferTargetBye(test);

    receiveNotify100(test);

    receiveNotify(test, {
      status_code: 200,
      status_msg: "OK"
    });
    test.done();
  },
  'attended with tdialog supported and 420 response from target': function(test) {
    receiveInviteAndAnswer(test, {
      allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY",
      supported: "replaces, gruu, tdialog"
    });
    test.strictEqual(session.supports('tdialog'), true, "Should support tdialog");

    ua.attendedTransfer(transferTarget, session);

    holdSent(test);

    responseForHold(test);

    inviteTargetSent(test);

    responseForInviteTarget(test, {
      status_code: "420 Bad Extension"
    });

    referSent(test, "<sip:" + transferTarget + ">");

    test.ok(referMsg.call_id !== answerMsg.call_id, "Call ID should not be the same");
    test.strictEqual(referMsg.getHeader("Require"), "tdialog", "Should contain 'Require: tdialog' header");
    test.strictEqual(referMsg.getHeader("Target-Dialog"), answerMsg.call_id + ";local-tag=" + answerMsg.from_tag + ";remote-tag=" + answerMsg.to_tag, "Should contain 'Target-Dialog' header");

    receiveNotify100(test);

    receiveNotify(test, {
      status_code: 200,
      status_msg: "OK"
    });
    test.done();
  },

  'attended with tdialog supported and 603 Declined response from transferee': function(test) {
    receiveInviteAndAnswer(test, {
      allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY",
      supported: "replaces, gruu, tdialog"
    });

    attendedTransfer(test);

    receiveTransferTargetBye(test);

    receiveNotify100(test);

    receiveNotifyFailure(test, {
      status_code: 603,
      status_msg: "Declined"
    });
    test.done();
  },

  'basic with tdialog supported': function(test) {
    var inviteCSeq = 1;
    var inviteMsg = receiveInviteAndAnswer(test, {
      allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY",
      supported: "replaces, gruu, tdialog",
      cseq: inviteCSeq
    });
    test.strictEqual(session.supports('tdialog'), true, "Should support tdialog");

    basicTransfer(test);
    test.ok(referMsg.call_id !== answerMsg.call_id, "Call ID should not be the same");
    test.ok(referMsg.from_tag !== answerMsg.to_tag, "From Tag should not be the same");
    test.ok(referMsg.to_tag !== answerMsg.from_tag, "To Tag should not be the same");
    test.strictEqual(referMsg.getHeader("Require"), "tdialog", "Should contain 'Require: tdialog' header");
    test.strictEqual(referMsg.getHeader("Target-Dialog"), answerMsg.call_id + ";local-tag=" + answerMsg.from_tag + ";remote-tag=" + answerMsg.to_tag, "Should contain 'Target-Dialog' header");

    receiveNotify100(test, {cseq: inviteCSeq+1});

    receiveNotify(test, {
      status_code: 200,
      status_msg: "OK",
      cseq: inviteCSeq+2
    });
    test.done();
  },

  'basic and initiating call': function(test) {
    sendInviteAndReceiveAnswer(test);

    basicTransfer(test);

    receiveNotify100(test);

    receiveNotify(test, {
      status_code: 200,
      status_msg: "OK"
    });
    test.done();
  },

  'basic with tdialog supported and target busy': function(test) {
    receiveInviteAndAnswer(test, {
      allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY",
      supported: "replaces, gruu, tdialog"
    });

    basicTransfer(test);

    receiveNotify100(test);

    receiveNotifyFailure(test, {
      status_code: 486,
      status_msg: "Busy Here"
    });
    test.done();
  },

  'basic without tdialog supported': function(test) {
    receiveInviteAndAnswer(test, {
      allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY",
      supported: "replaces"
    });
    test.strictEqual(session.supports('tdialog'), false, "Should not support tdialog");

    basicTransfer(test);
    test.ok(referMsg.call_id === answerMsg.call_id, "Call ID should be the same");
    test.ok(referMsg.from_tag === answerMsg.to_tag, "From Tag should be the same");
    test.ok(referMsg.to_tag === answerMsg.from_tag, "To Tag should be the same");
    test.strictEqual(referMsg.getHeader("Require"), undefined, "Should not contain 'Require: tdialog' header");
    test.strictEqual(referMsg.getHeader("Target-Dialog"), undefined, "Should not contain 'Target-Dialog' header");

    receiveNotify100(test);

    receiveNotify(test, {
      status_code: 200,
      status_msg: "OK"
    });
    test.done();
  },

  'basic without tdialog supported and 200 refer status code': function(test) {
    receiveInviteAndAnswer(test, {
      allow: "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY",
      supported: "replaces"
    });
    test.strictEqual(session.supports('tdialog'), false, "Should not support tdialog");

    basicTransfer(test);

    receiveNotify100(test, {
      refer: {
        statusCode: "200 OK"
      }
    });

    receiveNotify(test, {
      status_code: 200,
      status_msg: "OK"
    });
    test.done();
  },

  'basic as transferee': function(test) {
    var inviteMsg = sendInviteAndReceiveAnswer(test);

    receiveHold(test, inviteMsg);

    receiveRefer(test, inviteMsg);
    test.done();
  },

  'attended as transferee': function(test) {
    var inviteMsg = sendInviteAndReceiveAnswer(test);

    receiveHold(test, inviteMsg);

    receiveRefer(test, inviteMsg, {
      referRequest: {
        referTo: "<sip:" + transferTarget + "?Replaces=592435881734450904%3Bto-tag%3D9m2n3wq%3Bfrom-tag%3D763231>"
      }
    });
    test.done();
  }
}

  function receiveInviteAndAnswer(test, inviteOptions) {
    var inviteMsg = testUA.initialInviteRequest(ua, inviteOptions);
    ua.transport.onMessage({data: inviteMsg});

    answer(test);

    testUA.ackResponseFor(answerMsg);

    return inviteMsg;
  }

  function sendInviteAndReceiveAnswer(test) {
    testUA.connect(ua);
    var inviteMsg = testUA.popMessageSentAndClear(ua);

    ua.transport.onMessage({
      data: testUA.ringingResponse(ua)
    });
    ua.transport.onMessage({
      data: testUA.inviteResponse(ua)
    });

    ackSent(test);

    return inviteMsg;
  }

  function basicTransfer(test) {
    ua.transfer(transferTarget, session);

    holdSent(test);

    responseForHold(test);

    referSent(test, "<sip:" + transferTarget + ">");
  }

  function attendedTransfer(test, options) {
    options = options || {};
    ua.attendedTransfer(transferTarget, session);

    holdSent(test);

    responseForHold(test);

    inviteTargetSent(test);

    responseForInviteTarget(test, options.inviteTargetResponse);

    holdTargetSent(test);

    responseForHoldTarget(test);

    referSent(test, "<sip:" + transferTarget + "?Replaces=" + holdTargetMsg.call_id + "%3Bto-tag%3D" + holdTargetMsg.to_tag + "%3Bfrom-tag%3D" + holdTargetMsg.from_tag + ">");
  }

  function receiveTransferTargetBye(test) {
    byeRequestFor(holdTargetMsg);

    okTargetSent(test);
  }

  function receiveNotify100(test, options) {
    options = options || {};
    responseForRefer(options.refer);

    notify100Request(test, options);
  }

  function receiveNotify(test, options) {
    options = options || {};
    notifyRequest(test, options);

    byeSent(test);
  }

  function notifySent(test, options) {
    var notifyMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(notifyMsg.method, "NOTIFY");
    test.strictEqual(notifyMsg.body, options["sdp"] || "SIP/2.0 200 OK");
    test.strictEqual(notifyMsg.getHeader('Content-Type'), "message/sipfrag");
    test.strictEqual(notifyMsg.getHeader('Event') || "", "refer");
    return notifyMsg;
  }

  function notifySentAndReceivedBye(test, options) {
    options = options || {};
    var notifyMsg = notifySent(test, options);
    test.strictEqual(notifyMsg.getHeader('Subscription-State'), "terminated;reason=noresource");

    testUA.responseFor(notifyMsg, {
      method: "NOTIFY"
    });

    byeRequestFor(notifyMsg);

    okSent(test);
  }

  function receiveRefer(test, inviteMsg, options) {
    options = options || {};
    referRequest(test, inviteMsg, options.referRequest);

    okSent(test, {
      penultimate: true,
      statusCode: 202
    });

    var notifyMsg = notifySent(test, {
      sdp: "SIP/2.0 100 Trying"
    });
    test.strictEqual(notifyMsg.getHeader('Subscription-State'), "active;expires=60");

    testUA.responseFor(notifyMsg, {
      method: "NOTIFY"
    });
  }

  function receiveHold(test, inviteMsg) {
    holdRequest(test, inviteMsg);

    okSent(test);

    receiveAck(test, inviteMsg, inviteMsg);
  }

  function receiveNotifyFailure(test, options) {
    notifyRequest(test, options);

    testUA.triggerOnIceCandidate(session.sessionToTransfer);
    unholdSent(test);

    responseForUnhold(test);
  }

  function answer(test) {
    var options = testUA.getMediaOptions();
    var allow = "INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, NOTIFY";
    options["extraHeaders"] = ["Allow: " + allow];
    session.answer(options);
    testUA.triggerOnIceCandidate(session);
    answerMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(answerMsg.status_code, 200);
    test.strictEqual(answerMsg.getHeader("Allow"), allow);
  }

  function responseForHoldTarget(test) {
    testUA.responseFor(holdTargetMsg, {
      videoMode: ExSIP_C.RECVONLY,
      audioMode: ExSIP_C.RECVONLY
    });
    ackSent(test, {
      penultimate: true
    });
  }

  function responseForInviteTarget(test, options) {
    options = options || {};
    options = Utils.merge_options(options, {
      contact: "<sip:" + targetContact + ">"
    });
    testUA.responseFor(inviteTargetMsg, options);
    ackSent(test, {
      penultimate: true
    });
  }

  function responseForRefer(test, options) {
    options = options || {};
    testUA.responseFor(referMsg, {
      method: "REFER",
      status_code: options.statusCode || "202 Accepted"
    });
  }

  function responseForUnhold(test) {
    testUA.responseFor(unholdMsg);
    ackSent(test);
  }

  function responseForHold(test) {
    testUA.responseFor(holdMsg, {
      videoMode: ExSIP_C.RECVONLY,
      audioMode: ExSIP_C.RECVONLY
    });
    ackSent(test, {
      penultimate: true
    });
  }

  function notifyRequest(test, options) {
    options = options || {};
    notifyRequestFor(referMsg, "SIP/2.0 " + options.status_code + " " + options.status_msg, {
      cseq: options.cseq,
      subscription_state: "terminated;reason=noresource"
    });
    var notify200OkMsg = testUA.popPenultimateMessageSent(ua);
    test.strictEqual(notify200OkMsg.status_code, 200);
  }

  function referRequest(test, request, options) {
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

  function holdRequest(test, request) {
    var options = testUA.mergeOptions(request, {
      audioMode: ExSIP_C.INACTIVE,
      videoMode: ExSIP_C.INACTIVE
    });
    ua.transport.onMessage({
      data: testUA.inviteRequest(ua, options)
    });
    testUA.triggerOnIceCandidate(session);
  }

  function notify100Request(test, options) {
    notifyRequestFor(referMsg, "SIP/2.0 100 Trying", options);
    var notify100OkMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(notify100OkMsg.status_code, 200);
  }

  function ackSent(test, options) {
    options = options || {};
    var ackMsg = options["penultimate"] ? testUA.popPenultimateMessageSent(ua) : testUA.popMessageSent(ua);
    test.strictEqual(ackMsg.method, ExSIP_C.ACK);
  }

  function byeSent(test) {
    var byeMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(byeMsg.method, ExSIP_C.BYE);
  }

  function okSent(test, options) {
    options = options || {};
    var okMsg = options["penultimate"] ? testUA.popPenultimateMessageSent(ua) : testUA.popMessageSentAndClear(ua);
    test.strictEqual(okMsg.status_code, options["statusCode"] || 200);
  }

  function receiveAck(test, request, options) {
    options = testUA.mergeOptions(request, options);
    ua.transport.onMessage({
      data: testUA.ackResponse(ua, options)
    });
  }

  function holdTargetSent(test) {
    testUA.triggerOnIceCandidate(session);
    holdTargetMsg = testUA.popMessageSent(ua);
    test.strictEqual(holdTargetMsg.method, ExSIP_C.INVITE);
    isMode(test, holdTargetMsg.body, ExSIP_C.INACTIVE, "0", ExSIP_C.INACTIVE, "0");
    test.ok(holdTargetMsg.call_id === inviteTargetMsg.call_id, "Should be same dialog");
    test.strictEqual(holdTargetMsg.getHeader("Content-Type"), "application/sdp");
  }

  function inviteTargetSent(test) {
    inviteTargetMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(inviteTargetMsg.method, ExSIP_C.INVITE);
    test.strictEqual(inviteTargetMsg.to.toString(), "<sip:" + transferTarget + ">");
    test.strictEqual(inviteTargetMsg.getHeader("Require"), "replaces");
    test.strictEqual(inviteTargetMsg.getHeader("Content-Type"), "application/sdp");
  }

  function inviteTargetSentAsTransferee(test, options) {
    options = options || {};
    testUA.triggerOnIceCandidate(session);
    inviteTargetMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(inviteTargetMsg.method, ExSIP_C.INVITE);
    test.strictEqual(inviteTargetMsg.to.toString(), "<sip:" + transferTarget + ">");
    test.strictEqual(inviteTargetMsg.getHeader("Content-Type"), "application/sdp");

    testUA.responseFor(inviteTargetMsg, options.inviteResponse);

    ackSent(test, {
      penultimate: true
    });
  }

  function referSent(test, referTo) {
    referMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(referMsg.method, ExSIP_C.REFER);
    test.strictEqual(referMsg.getHeader("Refer-To"), referTo);
    test.strictEqual(referMsg.getHeader("Content-Type"), undefined);
  }

  function okTargetSent(test) {
    var okMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(okMsg.status_code, 200);
    test.strictEqual(okMsg.method, ExSIP_C.BYE);
  }

  function unholdSent(test) {
    testUA.triggerOnIceCandidate(session);
    unholdMsg = testUA.popMessageSent(ua);
    test.strictEqual(unholdMsg.method, ExSIP_C.INVITE);
    isMode(test, unholdMsg.body, ExSIP_C.SENDRECV, "16550", ExSIP_C.SENDRECV, "16930");
    test.strictEqual(unholdMsg.getHeader("Content-Type"), "application/sdp");
  }

  function holdSent(test) {
    testUA.triggerOnIceCandidate(session);
    holdMsg = testUA.popMessageSentAndClear(ua);
    test.strictEqual(holdMsg.method, ExSIP_C.INVITE);
    isMode(test, holdMsg.body, ExSIP_C.INACTIVE, "0", ExSIP_C.INACTIVE, "0");
    test.strictEqual(holdMsg.getHeader("Content-Type"), "application/sdp");
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

  function isMode(test, body, audioMode, audioPort, videoMode, videoPort) {
    var localDescription = new WebRTC.RTCSessionDescription({
      sdp: body,
      type: "offer"
    });
    test.strictEqual(localDescription.getVideoMode(), videoMode);
    test.strictEqual(localDescription.getAudioMode(), audioMode);
    test.strictEqual(localDescription.audioPort(), audioPort);
    test.strictEqual(localDescription.videoPort(), videoPort);
  }