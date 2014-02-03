
/**
 * @fileoverview In-Dialog Request Sender
 */

/**
 * @augments ExSIP
 * @class Class creating an In-dialog request sender.
 * @param {Object} applicant
 */
/**
 * @fileoverview in-Dialog Request Sender
 */

(function(ExSIP) {
var InDialogRequestSender;

InDialogRequestSender = function(applicant) {
  this.applicant = applicant;
  this.request = applicant.request;
};

InDialogRequestSender.prototype = {
  send: function() {
    var request_sender = new ExSIP.RequestSender(this, this.applicant.session.ua);
    request_sender.send();
  },

  onRequestTimeout: function() {
    this.applicant.session.onRequestTimeout();
    this.applicant.onRequestTimeout();
  },

  onTransportError: function() {
    this.applicant.session.onTransportError();
    this.applicant.onTransportError();
  },

  receiveResponse: function(response) {
    // RFC3261 14.1. Terminate the dialog if a 408 or 481 is received from a re-Invite.
    if (response.status_code === 408 || response.status_code === 481) {
      this.applicant.session.ended('remote', response, ExSIP.C.causes.DIALOG_ERROR);
    }
    this.applicant.receiveResponse(response);
  }
};

ExSIP.InDialogRequestSender = InDialogRequestSender;
}(ExSIP));
