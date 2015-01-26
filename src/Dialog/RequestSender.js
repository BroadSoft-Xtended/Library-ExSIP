module.exports = DialogRequestSender;

/**
 * Dependencies.
 */
var ExSIP_C = require('../Constants');
var Transactions = require('../Transactions');
var RTCSession = require('../RTCSession');
var RequestSender = require('../RequestSender');
var Utils = require('../Utils');


function DialogRequestSender(dialog, applicant, request) {

  this.dialog = dialog;
  this.applicant = applicant;
  this.request = request;

  this.logger = dialog.owner.ua.getLogger('ExSIP.dialog.requestsender', dialog.id);

  // RFC3261 14.1 Modifying an Existing Session. UAC Behavior.
  this.reattempt = false;
  this.reattemptTimer = null;
}


DialogRequestSender.prototype = {
  send: function(callbacks) {
    var
      self = this,
      request_sender = new RequestSender(this, this.dialog.owner.ua);

    request_sender.send(callbacks);

    // RFC3261 14.2 Modifying an Existing Session -UAC BEHAVIOR-
    if (this.request.method === ExSIP_C.INVITE && request_sender.clientTransaction.state !== Transactions.C.STATUS_TERMINATED) {
      this.dialog.uac_pending_reply = true;
      request_sender.clientTransaction.on('stateChanged', function stateChanged(e) {
        if (e.sender.state === Transactions.C.STATUS_ACCEPTED ||
          e.sender.state === Transactions.C.STATUS_COMPLETED ||
          e.sender.state === Transactions.C.STATUS_TERMINATED) {

          request_sender.clientTransaction.removeListener('stateChanged', stateChanged);
          self.dialog.uac_pending_reply = false;

          if (self.dialog.uas_pending_reply === false) {
            self.dialog.owner.onReadyToReinvite();
          }
        }
      });
    }
  },

  onRequestTimeout: function() {
    this.applicant.onRequestTimeout();
  },

  onTransportError: function() {
    this.applicant.onTransportError();
  },

  receiveResponse: function(response) {
    var self = this;

    this.logger.debug('receiveResponse : ' + response);

    // RFC3261 12.2.1.2 408 or 481 is received for a request within a dialog.
    if (response.status_code === 408 || response.status_code === 481) {
      this.applicant.onDialogError(response);
    } else if (response.method === ExSIP_C.INVITE && response.status_code === 491) {
      if (this.reattempt) {
        this.applicant.receiveResponse(response);
      } else {
        this.request.cseq.value = this.dialog.local_seqnum += 1;
        this.reattemptTimer = setTimeout(
          function() {
            if (self.applicant.owner.status !== RTCSession.C.STATUS_TERMINATED) {
              self.reattempt = true;
              self.request_sender.send();
            }
          },
          this.getReattemptTimeout()
        );
      }
    } else {
      this.applicant.receiveResponse(response);
    }
  }
};