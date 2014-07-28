/**
 * @fileoverview SIP Transactions
 */

/**
 * SIP Transactions module.
 * @augments ExSIP
 */
(function(ExSIP) {
var Transactions,
  logger =  new ExSIP.Logger(ExSIP.name +' | '+ 'TRANSACTION'),
  C = {
    // Transaction states
    STATUS_TRYING:     1,
    STATUS_PROCEEDING: 2,
    STATUS_CALLING:    3,
    STATUS_ACCEPTED:   4,
    STATUS_COMPLETED:  5,
    STATUS_TERMINATED: 6,
    STATUS_CONFIRMED:  7
  };

Transactions = {};

/**
* @class Client Transaction
* @private
*/
var ClientTransaction = function() {
  this.init = function(request_sender, request, transport) {
    var via;

    this.transport = transport;
    this.id = 'z9hG4bK' + Math.floor(Math.random() * 10000000);
    this.request_sender = request_sender;
    this.request = request;

    via = 'SIP/2.0/' + (request_sender.ua.configuration.hack_via_tcp ? 'TCP' : transport.server.scheme);
    via += ' ' + request_sender.ua.configuration.via_host + ';branch=' + this.id;

    this.request.setHeader('via', via);
  };
};

/**
* @class Non Invite Client Transaction Prototype
* @private
*/
var NonInviteClientTransactionPrototype = function() {
  this.send = function() {
    var tr = this;

    this.state = C.STATUS_TRYING;
    this.F = window.setTimeout(function() {tr.timer_F();}, ExSIP.Timers.TIMER_F);

    if(!this.transport.send(this.request)) {
      this.onTransportError();
    }
  };

  this.onTransportError = function() {
    logger.log('transport error occurred, deleting non-INVITE client transaction ' + this.id, this.request_sender.ua);
    window.clearTimeout(this.F);
    window.clearTimeout(this.K);
    delete this.request_sender.ua.transactions.nict[this.id];
    this.request_sender.onTransportError();
  };

  this.timer_F = function() {
    logger.log('Timer F expired for non-INVITE client transaction ' + this.id, this.request_sender.ua);
    this.state = C.STATUS_TERMINATED;
    this.request_sender.onRequestTimeout();
    delete this.request_sender.ua.transactions.nict[this.id];
  };

  this.timer_K = function() {
    this.state = C.STATUS_TERMINATED;
    delete this.request_sender.ua.transactions.nict[this.id];
  };

  this.receiveResponse = function(response) {
    var
      tr = this,
      status_code = response.status_code;

    if(status_code < 200) {
      switch(this.state) {
        case C.STATUS_TRYING:
        case C.STATUS_PROCEEDING:
          this.state = C.STATUS_PROCEEDING;
          this.request_sender.receiveResponse(response);
          break;
      }
    } else {
      switch(this.state) {
        case C.STATUS_TRYING:
        case C.STATUS_PROCEEDING:
          this.state = C.STATUS_COMPLETED;
          window.clearTimeout(this.F);

          if(status_code === 408) {
            this.request_sender.onRequestTimeout();
          } else {
            this.request_sender.receiveResponse(response);
          }

          this.K = window.setTimeout(function() {tr.timer_K();}, ExSIP.Timers.TIMER_K);
          break;
        case C.STATUS_COMPLETED:
          break;
      }
    }
  };
};
NonInviteClientTransactionPrototype.prototype = new ClientTransaction();


/**
 * @class Invite Client Transaction Prototype
 * @private
 */
var InviteClientTransactionPrototype = function() {

  this.send = function() {
    var tr = this;
    this.state = C.STATUS_CALLING;
    this.B = window.setTimeout(function() {
      tr.timer_B();
    }, ExSIP.Timers.TIMER_B);

    if(!this.transport.send(this.request)) {
      this.onTransportError();
    }
  };

  this.onTransportError = function() {
    logger.log('transport error occurred, deleting INVITE client transaction ' + this.id, this.request_sender.ua);
    window.clearTimeout(this.B);
    window.clearTimeout(this.D);
    window.clearTimeout(this.M);
    delete this.request_sender.ua.transactions.ict[this.id];

    if (this.state !== C.STATUS_ACCEPTED) {
      this.request_sender.onTransportError();
    }
  };

  // RFC 6026 7.2
  this.timer_M = function() {
    logger.log('Timer M expired for INVITE client transaction ' + this.id, this.request_sender.ua);

    if(this.state === C.STATUS_ACCEPTED) {
      this.state = C.STATUS_TERMINATED;
      window.clearTimeout(this.B);
      delete this.request_sender.ua.transactions.ict[this.id];
    }
  };

  // RFC 3261 17.1.1
  this.timer_B = function() {
    logger.log('Timer B expired for INVITE client transaction ' + this.id, this.request_sender.ua);
    if(this.state === C.STATUS_CALLING) {
      this.state = C.STATUS_TERMINATED;
      this.request_sender.onRequestTimeout();
      delete this.request_sender.ua.transactions.ict[this.id];
    }
  };

  this.timer_D = function() {
    logger.log('Timer D expired for INVITE client transaction ' + this.id, this.request_sender.ua);
    this.state = C.STATUS_TERMINATED;
    window.clearTimeout(this.B);
    delete this.request_sender.ua.transactions.ict[this.id];
  };

  this.sendACK = function(response) {
    var tr = this;

    this.ack = 'ACK ' + this.request.ruri + ' SIP/2.0\r\n';
    this.ack += 'Via: ' + this.request.getHeader('Via').toString() + '\r\n';

    if(this.request.getHeader('Route') && this.request.getHeader('Route').toString() !== "") {
      this.ack += 'Route: ' + this.request.getHeader('Route').toString() + '\r\n';
    }

    this.ack += 'To: ' + response.getHeader('to') + '\r\n';
    this.ack += 'From: ' + this.request.getHeader('From').toString() + '\r\n';
    this.ack += 'Call-ID: ' + this.request.getHeader('Call-ID').toString() + '\r\n';
    this.ack += 'CSeq: ' + this.request.getHeader('CSeq').toString().split(' ')[0];
    this.ack += ' ACK\r\n\r\n';

    this.D = window.setTimeout(function() {tr.timer_D();}, ExSIP.Timers.TIMER_D);

    this.transport.send(this.ack);
  };

  this.cancel_request = function(tr, reason) {
    var request = tr.request;

    this.cancel = ExSIP.C.CANCEL + ' ' + request.ruri + ' SIP/2.0\r\n';
    this.cancel += 'Via: ' + request.getHeader('Via').toString() + '\r\n';

    if(this.request.getHeader('Route')) {
      this.cancel += 'Route: ' + request.getHeader('Route').toString() + '\r\n';
    }

    this.cancel += 'To: ' + request.getHeader('To').toString() + '\r\n';
    this.cancel += 'From: ' + request.getHeader('From').toString() + '\r\n';
    this.cancel += 'Call-ID: ' + request.getHeader('Call-ID').toString() + '\r\n';
    this.cancel += 'CSeq: ' + request.getHeader('CSeq').toString().split(' ')[0] +
    ' CANCEL\r\n';

    if(reason) {
      this.cancel += 'Reason: ' + reason + '\r\n';
    }

    this.cancel += 'Content-Length: 0\r\n\r\n';

    // Send only if a provisional response (>100) has been received.
    if(this.state === C.STATUS_PROCEEDING) {
      this.transport.send(this.cancel);
    }
  };

  this.receiveResponse = function(response) {
    var
      tr = this,
      status_code = response.status_code;

    if(status_code >= 100 && status_code <= 199) {
      switch(this.state) {
        case C.STATUS_CALLING:
          this.state = C.STATUS_PROCEEDING;
          this.request_sender.receiveResponse(response);
          if(this.cancel) {
            this.transport.send(this.cancel);
          }
          break;
        case C.STATUS_PROCEEDING:
          this.request_sender.receiveResponse(response);
          break;
      }
    } else if(status_code >= 200 && status_code <= 299) {
      switch(this.state) {
        case C.STATUS_CALLING:
        case C.STATUS_PROCEEDING:
          this.state = C.STATUS_ACCEPTED;
          this.M = window.setTimeout(function() {
            tr.timer_M();
          }, ExSIP.Timers.TIMER_M);
          this.request_sender.receiveResponse(response);
          break;
        case C.STATUS_ACCEPTED:
          this.request_sender.receiveResponse(response);
          break;
      }
    } else if(status_code >= 300 && status_code <= 699) {
      switch(this.state) {
        case C.STATUS_CALLING:
        case C.STATUS_PROCEEDING:
          this.state = C.STATUS_COMPLETED;
          this.sendACK(response);
          if(status_code === 503) {
            var options = {code: 503, reason: 'Service Unavailable', retryCallback: function(transport){
              transport.ua.once("connected", function(e){
                if(transport === e.data.transport) {
                  tr.send();
                }
              });
            }};
            this.request_sender.ua.onTransportError(this.request_sender.ua.transport, options);
          } else {
            this.request_sender.receiveResponse(response);
          }
          break;
        case C.STATUS_COMPLETED:
          this.sendACK(response);
          break;
      }
    }
  };
};
InviteClientTransactionPrototype.prototype = new ClientTransaction();

/**
 * @class Server Transaction
 * @private
 */
var ServerTransaction = function() {
  this.init = function(request, ua) {
    this.id = request.via_branch;
    this.request = request;
    this.transport = request.transport;
    this.ua = ua;
    this.last_response = '';
    request.server_transaction = this;
  };
};

/**
 * @class Non Invite Server Transaction Prototype
 * @private
 */
var NonInviteServerTransactionPrototype = function() {
  this.timer_J = function() {
    logger.log('Timer J expired for non-INVITE server transaction ' + this.id, this.ua);
    this.state = C.STATUS_TERMINATED;
    delete this.ua.transactions.nist[this.id];
  };

  this.onTransportError = function() {
    if (!this.transportError) {
      this.transportError = true;

      logger.log('transport error occurred, deleting non-INVITE server transaction ' + this.id, this.ua);

      window.clearTimeout(this.J);
      delete this.ua.transactions.nist[this.id];
    }
  };

  this.receiveResponse = function(status_code, response, onSuccess, onFailure) {
    var tr = this;

    if(status_code === 100) {
      /* RFC 4320 4.1
       * 'A SIP element MUST NOT
       * send any provisional response with a
       * Status-Code other than 100 to a non-INVITE request.'
       */
      switch(this.state) {
        case C.STATUS_TRYING:
          this.state = C.STATUS_PROCEEDING;
          if(!this.transport.send(response))  {
            this.onTransportError();
          }
          break;
        case C.STATUS_PROCEEDING:
          this.last_response = response;
          if(!this.transport.send(response)) {
            this.onTransportError();
            if (onFailure) {
              onFailure();
            }
          } else if (onSuccess) {
            onSuccess();
          }
          break;
      }
    } else if(status_code >= 200 && status_code <= 699) {
      switch(this.state) {
        case C.STATUS_TRYING:
        case C.STATUS_PROCEEDING:
          this.state = C.STATUS_COMPLETED;
          this.last_response = response;
          if(ExSIP.Timers.TIMER_J === 0) {
              tr.timer_J();
          } else {
            this.J = window.setTimeout(function() {
              tr.timer_J();
            }, ExSIP.Timers.TIMER_J);
          }
          if(!this.transport.send(response)) {
            this.onTransportError();
            if (onFailure) {
              onFailure();
            }
          } else if (onSuccess) {
            onSuccess();
          }
          break;
        case C.STATUS_COMPLETED:
          break;
      }
    }
  };
};
NonInviteServerTransactionPrototype.prototype = new ServerTransaction();

/**
 * @class Invite Server Transaction Prototype
 * @private
 */
var InviteServerTransactionPrototype = function() {
  this.timer_H = function() {
    logger.log('Timer H expired for INVITE server transaction ' + this.id, this.ua);

    if(this.state === C.STATUS_COMPLETED) {
      logger.warn('transactions', 'ACK for INVITE server transaction was never received, call will be terminated', this.ua);
      this.state = C.STATUS_TERMINATED;
    }

    delete this.ua.transactions.ist[this.id];
  };

  this.timer_I = function() {
    this.state = C.STATUS_TERMINATED;
    delete this.ua.transactions.ist[this.id];
  };

  // RFC 6026 7.1
  this.timer_L = function() {
    logger.log('Timer L expired for INVITE server transaction ' + this.id, this.ua);

    if(this.state === C.STATUS_ACCEPTED) {
      this.state = C.STATUS_TERMINATED;
      delete this.ua.transactions.ist[this.id];
    }
  };

  this.onTransportError = function() {
    if (!this.transportError) {
      this.transportError = true;

      logger.log('transport error occurred, deleting INVITE server transaction ' + this.id, this.ua);

      if (this.resendProvisionalTimer !== null) {
        window.clearInterval(this.resendProvisionalTimer);
        this.resendProvisionalTimer = null;
      }
      window.clearTimeout(this.L);
      window.clearTimeout(this.H);
      window.clearTimeout(this.I);
      delete this.ua.transactions.ist[this.id];
    }
  };

  this.resend_provisional = function() {
    if(!this.transport.send(this.last_response)) {
      this.onTransportError();
    }
  };

  this.cancel_request = function(tr, reason) {
    var request = tr.request;

    this.cancel = ExSIP.C.CANCEL + ' ' + request.ruri + ' SIP/2.0\r\n';
    this.cancel += 'Via: ' + request.getHeader('Via').toString() + '\r\n';

    if(this.request.getHeader('Route')) {
      this.cancel += 'Route: ' + request.getHeader('Route').toString() + '\r\n';
    }

    this.cancel += 'To: ' + request.getHeader('From').toString() + '\r\n';
    this.cancel += 'From: ' + request.getHeader('To').toString() + '\r\n';
    this.cancel += 'Call-ID: ' + request.getHeader('Call-ID').toString() + '\r\n';
    this.cancel += 'CSeq: ' + request.getHeader('CSeq').toString().split(' ')[0] +
      ' CANCEL\r\n';

    if(reason) {
      this.cancel += 'Reason: ' + reason + '\r\n';
    }

    this.cancel += 'Content-Length: 0\r\n\r\n';

    this.transport.send(this.cancel);
  };

  // INVITE Server Transaction RFC 3261 17.2.1
  this.receiveResponse = function(status_code, response, onSuccess, onFailure) {
    var tr = this;

    if(status_code >= 100 && status_code <= 199) {
      switch(this.state) {
        case C.STATUS_PROCEEDING:
          if(!this.transport.send(response)) {
            this.onTransportError();
          }
          this.last_response = response;
          break;
      }
    }

    if(status_code > 100 && status_code <= 199 && this.state === C.STATUS_PROCEEDING) {
      // Trigger the resendProvisionalTimer only for the first non 100 provisional response.
      if(this.resendProvisionalTimer === null) {
        this.resendProvisionalTimer = window.setInterval(function() {
          tr.resend_provisional();}, ExSIP.Timers.PROVISIONAL_RESPONSE_INTERVAL);
      }
    } else if(status_code >= 200 && status_code <= 299) {
      switch(this.state) {
        case C.STATUS_PROCEEDING:
          this.state = C.STATUS_ACCEPTED;
          this.last_response = response;
          this.L = window.setTimeout(function() {
            tr.timer_L();
          }, ExSIP.Timers.TIMER_L);
          if (this.resendProvisionalTimer !== null) {
            window.clearInterval(this.resendProvisionalTimer);
            this.resendProvisionalTimer = null;
          }
          /* falls through */
        case C.STATUS_ACCEPTED:
          // Note that this point will be reached for proceeding tr.state also.
          if(!this.transport.send(response)) {
            this.onTransportError();
            if (onFailure) {
              onFailure();
            }
          } else if (onSuccess) {
            onSuccess();
          }
          break;
      }
    } else if(status_code >= 300 && status_code <= 699) {
      switch(this.state) {
        case C.STATUS_PROCEEDING:
          if (this.resendProvisionalTimer !== null) {
            window.clearInterval(this.resendProvisionalTimer);
            this.resendProvisionalTimer = null;
          }
          if(!this.transport.send(response)) {
            this.onTransportError();
            if (onFailure) {
              onFailure();
            }
          } else {
            this.state = C.STATUS_COMPLETED;
            this.H = window.setTimeout(function() {
              tr.timer_H();
            }, ExSIP.Timers.TIMER_H);
            if (onSuccess) {
              onSuccess();
            }
          }
          break;
      }
    }
  };
};
InviteServerTransactionPrototype.prototype = new ServerTransaction();

/**
* @augments ExSIP.Transactions
* @class Non Invite Client Transaction
* @param {ExSIP.RequestSender} request_sender
* @param {ExSIP.OutgoingRequest} request
* @param {ExSIP.Transport} transport
*/
Transactions.NonInviteClientTransaction = function(request_sender, request, transport) {
  this.init(request_sender, request, transport);
  this.request_sender.ua.transactions.nict[this.id] = this;
};
Transactions.NonInviteClientTransaction.prototype = new NonInviteClientTransactionPrototype();

/**
* @augments ExSIP.Transactions
* @class Invite Client Transaction
* @param {ExSIP.RequestSender} request_sender
* @param {ExSIP.OutgoingRequest} request
* @param {ExSIP.Transport} transport
*/
Transactions.InviteClientTransaction = function(request_sender, request, transport) {
  var tr = this;

  this.init(request_sender, request, transport);
  this.request_sender.ua.transactions.ict[this.id] = this;

  // Add the cancel property to the request.
  //Will be called from the request instance, not the transaction itself.
  this.request.cancel = function(reason) {
    tr.cancel_request(tr, reason);
  };
};
Transactions.InviteClientTransaction.prototype = new InviteClientTransactionPrototype();

Transactions.AckClientTransaction = function(request_sender, request, transport) {
  this.init(request_sender, request, transport);
  this.send = function() {
    this.transport.send(request);
  };
};
Transactions.AckClientTransaction.prototype = new NonInviteClientTransactionPrototype();


/**
* @augments ExSIP.Transactions
* @class Non Invite Server Transaction
* @param {ExSIP.IncomingRequest} request
* @param {ExSIP.UA} ua
*/
Transactions.NonInviteServerTransaction = function(request, ua) {
  this.init(request, ua);
  this.state = C.STATUS_TRYING;

  ua.transactions.nist[this.id] = this;
};
Transactions.NonInviteServerTransaction.prototype = new NonInviteServerTransactionPrototype();



/**
* @augments ExSIP.Transactions
* @class Invite Server Transaction
* @param {ExSIP.IncomingRequest} request
* @param {ExSIP.UA} ua
*/
Transactions.InviteServerTransaction = function(request, ua) {
  var tr = this;
  this.init(request, ua);
  this.state = C.STATUS_PROCEEDING;

  ua.transactions.ist[this.id] = this;

  this.resendProvisionalTimer = null;

  // Add the cancel property to the request.
  //Will be called from the request instance, not the transaction itself.
  request.cancel = function(reason) {
    tr.cancel_request(tr, reason);
  };

  request.reply(100);
};
Transactions.InviteServerTransaction.prototype = new InviteServerTransactionPrototype();

/**
 * @function
 * @param {ExSIP.UA} ua
 * @param {ExSIP.IncomingRequest} request
 *
 * @return {boolean}
 * INVITE:
 *  _true_ if retransmission
 *  _false_ new request
 *
 * ACK:
 *  _true_  ACK to non2xx response
 *  _false_ ACK must be passed to TU (accepted state)
 *          ACK to 2xx response
 *
 * CANCEL:
 *  _true_  no matching invite transaction
 *  _false_ matching invite transaction and no final response sent
 *
 * OTHER:
 *  _true_  retransmission
 *  _false_ new request
 */
Transactions.checkTransaction = function(ua, request) {
  var tr;

  switch(request.method) {
    case ExSIP.C.INVITE:
      tr = ua.transactions.ist[request.via_branch];
      if(tr) {
        switch(tr.state) {
          case C.STATUS_PROCEEDING:
            tr.transport.send(tr.last_response);
            break;

            // RFC 6026 7.1 Invite retransmission
            //received while in C.STATUS_ACCEPTED state. Absorb it.
          case C.STATUS_ACCEPTED:
            break;
        }
        logger.log("checkTransaction failed for INVITE request and server transaction in state : "+tr.state, ua);
        return true;
      }
      break;
    case ExSIP.C.ACK:
      tr = ua.transactions.ist[request.via_branch];

      // RFC 6026 7.1
      if(tr) {
        if(tr.state === C.STATUS_ACCEPTED) {
          return false;
        } else if(tr.state === C.STATUS_COMPLETED) {
          tr.state = C.STATUS_CONFIRMED;
          tr.I = window.setTimeout(function() {tr.timer_I();}, ExSIP.Timers.TIMER_I);
          logger.log("checkTransaction failed for ACK request and server transaction in state : "+tr.state, ua);
          return true;
        }
      }

      // ACK to 2XX Response.
      else {
        return false;
      }
      break;
    case ExSIP.C.CANCEL:
      tr = ua.transactions.ist[request.via_branch];
      if(tr) {
        request.reply_sl(200);
        if(tr.state === C.STATUS_PROCEEDING) {
          return false;
        } else {
          logger.log("checkTransaction failed for CANCEL request and server transaction in state : "+tr.state, ua);
          return true;
        }
      } else {
        request.reply_sl(481);
        logger.log("checkTransaction failed for CANCEL request and no server transaction", ua);
        return true;
      }
      break;
    default:

      // Non-INVITE Server Transaction RFC 3261 17.2.2
      tr = ua.transactions.nist[request.via_branch];
      if(tr) {
        switch(tr.state) {
          case C.STATUS_TRYING:
            break;
          case C.STATUS_PROCEEDING:
          case C.STATUS_COMPLETED:
            tr.transport.send(tr.last_response);
            break;
        }
        logger.log("checkTransaction failed for non invite server transaction in state : "+tr.state, ua);
        return true;
      }
      break;
  }
};

Transactions.C = C;
ExSIP.Transactions = Transactions;
}(ExSIP));
