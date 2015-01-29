module.exports = RequestSender;


/**
 * Dependencies.
 */
var ExSIP_C = require('./Constants');
var UA = require('./UA');
var DigestAuthentication = require('./DigestAuthentication');
var Transactions = require('./Transactions');

function RequestSender(applicant, ua) {
  this.logger = ua.getLogger('ExSIP.requestsender');
  this.ua = ua;
  this.applicant = applicant;
  this.method = applicant.request.method;
  this.request = applicant.request;
  this.credentials = null;
  this.challenged = false;
  this.staled = false;

  // If ua is in closing process or even closed just allow sending Bye and ACK
  if (ua.status === UA.C.STATUS_USER_CLOSED && (this.method !== ExSIP_C.BYE || this.method !== ExSIP_C.ACK)) {
    this.onTransportError();
  }
}


/**
 * Create the client transaction and send the message.
 */
RequestSender.prototype = {
  send: function(callbacks) {
    this.callbacks = callbacks || {};
    this.logger.log('callbacks : ' + this.callbacks);

    switch (this.method) {
      case "INVITE":
        this.clientTransaction = new Transactions.InviteClientTransaction(this, this.request, this.ua.transport);
        break;
      case "ACK":
        this.clientTransaction = new Transactions.AckClientTransaction(this, this.request, this.ua.transport);
        break;
      default:
        this.clientTransaction = new Transactions.NonInviteClientTransaction(this, this.request, this.ua.transport);
    }
    this.clientTransaction.send();
  },

  /**
   * Callback fired when receiving a request timeout error from the client transaction.
   * To be re-defined by the applicant.
   */
  onRequestTimeout: function() {
    this.logger.log('******************** onRequestTimeout : '+this.applicant);
    this.applicant.onRequestTimeout();
  },

  /**
   * Callback fired when receiving a transport error from the client transaction.
   * To be re-defined by the applicant.
   */
  onTransportError: function() {
    this.applicant.onTransportError();
  },

  /**
   * Called from client transaction when receiving a correct response to the request.
   * Authenticate request if needed or pass the response back to the applicant.
   */
  receiveResponse: function(response) {
    var cseq, challenge, authorization_header_name,
      status_code = response.status_code;
    this.logger.log('receiveResponse: callbacks : ' + this.callbacks);


    /*
     * Authentication
     * Authenticate once. _challenged_ flag used to avoid infinite authentications.
     */
    if ((status_code === 401 || status_code === 407)) {

      // Get and parse the appropriate WWW-Authenticate or Proxy-Authenticate header.
      if (response.status_code === 401) {
        challenge = response.parseHeader('www-authenticate');
        authorization_header_name = 'authorization';
      } else {
        challenge = response.parseHeader('proxy-authenticate');
        authorization_header_name = 'proxy-authorization';
      }

      // Verify it seems a valid challenge.
      if (!challenge) {
        this.logger.warn(response.status_code + ' with wrong or missing challenge, cannot authenticate');
        this.applicant.receiveResponse(response);
        return;
      }

      if (!this.challenged || (!this.staled && challenge.stale === true)) {
        if (!this.credentials) {
          this.credentials = new DigestAuthentication(this.ua);
        }

        // Verify that the challenge is really valid.
        if (!this.credentials.authenticate(this.request, challenge)) {
          this.applicant.receiveResponse(response);
          return;
        }
        this.challenged = true;

        if (challenge.stale) {
          this.staled = true;
        }

        if (response.method === ExSIP_C.REGISTER) {
          cseq = this.applicant.cseq += 1;
        } else if (this.request.dialog) {
          cseq = this.request.dialog.local_seqnum += 1;
        } else {
          cseq = this.request.cseq + 1;
          this.request.cseq = cseq;
        }
        this.request.setHeader('cseq', cseq + ' ' + this.method);

        this.request.setHeader(authorization_header_name, this.credentials.toString());
        this.send();
      } else {
        this.applicant.receiveResponse(response);
      }
    } else {
      this.applicant.receiveResponse(response);
    }

    switch (true) {
      case /^1[0-9]{2}$/.test(response.status_code):
        break;
      case /^2[0-9]{2}$/.test(response.status_code):
        if (this.callbacks.success) {
          this.callbacks.success();
        }
        break;
      default:
        if (this.callbacks.failure) {
          this.callbacks.failure(response);
        }
        break;
    }

  }
};