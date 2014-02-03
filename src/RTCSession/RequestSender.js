/**
 * @fileoverview RequestSender
 */

/**
 * @class Session RequestSender
 * @param {ExSIP.RTCSession | RTCSession applicant} applicant
 * @param {ExSIP.OutgoingRequest} [request]
 */
(function(ExSIP){

var RequestSender = function(applicant, request, callbacks) {
  this.applicant = applicant;
  this.request = request || applicant.request;
  this.session = (applicant instanceof ExSIP.RTCSession)? applicant : applicant.session;
  this.reattempt = false;
  this.reatemptTimer = null;
  this.callbacks = callbacks || {};
  this.request_sender = new ExSIP.InDialogRequestSender(this);
};

RequestSender.prototype = {
  receiveResponse: function(response) {
    var
      self = this,
      status_code = response.status_code;

    if (response.method === ExSIP.C.INVITE && status_code === 491) {
      if (!this.reattempt) {
        this.request.cseq.value = this.request.dialog.local_seqnum += 1;
        this.reatemptTimer = window.setTimeout(
          function() {
            if (self.session.status !== ExSIP.RTCSession.C.STATUS_TERMINATED) {
              self.reattempt = true;
              self.request_sender.send();
            }
          },
          this.getReattemptTimeout()
        );
      } else {
        this.applicant.receiveResponse(response, this.callbacks);
      }
    } else {
      this.applicant.receiveResponse(response, this.callbacks);
      if(response.status_code >= 200 && response.status_code < 299) {
        if(this.callbacks["success"]) {
          this.callbacks["success"]();
        }
      } else if(response.status_code >= 400) {
        if(this.callbacks["failure"]) {
          this.callbacks["failure"]();
        }
      }
    }
  },

  send: function() {
    this.request_sender.send();
  },

  onRequestTimeout: function() {
    this.applicant.onRequestTimeout();
  },

  onTransportError: function() {
    this.applicant.onTransportError();
  },

  // RFC3261 14.1
  getReattemptTimeout: function() {
    if(this.session.direction === 'outgoing') {
      return (Math.random() * (4 - 2.1) + 2.1).toFixed(2);
    } else {
      return (Math.random() * 2).toFixed(2);
    }
  }
};

return RequestSender;
}(ExSIP));
