module.exports = Registrator;


/**
 * Dependecies
 */
var Utils = require('./Utils');
var ExSIP_C = require('./Constants');
var SIPMessage = require('./SIPMessage');
var RequestSender = require('./RequestSender');

function Registrator(ua, transport) {
  var reg_id=1; //Force reg_id to 1.

  this.logger = ua.getLogger('ExSIP.registrator');

  this.ua = ua;
  this.transport = transport;

  this.registrar = ua.configuration.registrar_server;
  this.expires = ua.configuration.register_expires;

  // Call-ID and CSeq values RFC3261 10.2
  this.call_id = Utils.createRandomToken(22);
  this.cseq = 0;

  // this.to_uri
  this.to_uri = ua.configuration.uri;

  this.registrationTimer = null;

  // Set status
  this.registered = false;

  // Contact header
  this.contact = this.ua.contact.toString();

  // sip.ice media feature tag (RFC 5768)
  this.contact += ';+sip.ice';

  // Custom headers for REGISTER and un-REGISTER.
  this.extraHeaders = [];

  // Custom Contact header params for REGISTER and un-REGISTER.
  this.extraContactParams = "";

  if(reg_id) {
    this.contact += ';reg-id='+ reg_id;
    this.contact += ';+sip.instance="<urn:uuid:'+ this.ua.configuration.instance_id+'>"';
  }
}


Registrator.prototype = {
  setExtraHeaders: function(extraHeaders) {
    if (! extraHeaders instanceof Array) {
      extraHeaders = [];
    }

    this.extraHeaders = extraHeaders.slice();
  },

  setExtraContactParams: function(extraContactParams) {
    if (! extraContactParams instanceof Object) {
      extraContactParams = {};
    }

    // Reset it.
    this.extraContactParams = "";

    for(var param_key in extraContactParams) {
      var param_value = extraContactParams[param_key];
      this.extraContactParams += (";" + param_key);
      if (param_value) {
        this.extraContactParams += ("=" + param_value);
      }
    }
  },

  register: function() {
    var request_sender, cause, extraHeaders,
      self = this;

    extraHeaders = this.extraHeaders.slice();
    extraHeaders.push('Contact: ' + this.contact + ';expires=' + this.expires + this.extraContactParams);
    extraHeaders.push('Expires: '+ this.expires);

    this.request = new SIPMessage.OutgoingRequest(ExSIP_C.REGISTER, this.registrar, this.ua, {
        'to_uri': this.to_uri,
        'call_id': this.call_id,
        'cseq': (this.cseq += 1)
      }, extraHeaders);

    request_sender = new RequestSender(this, this.ua);

    this.receiveResponse = function(response) {
      var contact, expires,
        contacts = response.getHeaders('contact').length;

      // Discard responses to older REGISTER/un-REGISTER requests.
      if(response.cseq !== this.cseq) {
        return;
      }

      // Clear registration timer
      if (this.registrationTimer !== null) {
        clearTimeout(this.registrationTimer);
        this.registrationTimer = null;
      }

      switch(true) {
        case /^1[0-9]{2}$/.test(response.status_code):
          // Ignore provisional responses.
          break;
        case /^2[0-9]{2}$/.test(response.status_code):
          if(response.hasHeader('expires')) {
            expires = response.getHeader('expires');
          }

          // Search the Contact pointing to us and update the expires value accordingly.
          if (!contacts) {
            this.logger.warn('no Contact header in response to REGISTER, response ignored');
            break;
          }

          while(contacts--) {
            contact = response.parseHeader('contact', contacts);
            if(contact.uri.user === this.ua.contact.uri.user) {
              expires = contact.getParam('expires');
              break;
            } else {
              contact = null;
            }
          }

          if (!contact) {
            this.logger.warn('no Contact header pointing to us, response ignored');
            break;
          }

          if(!expires) {
            expires = this.expires;
          }

          // Re-Register before the expiration interval has elapsed.
          // For that, decrease the expires value. ie: 3 seconds
          this.registrationTimer = setTimeout(function() {
            self.registrationTimer = null;
            self.register();
          }, (expires * 1000) - 3000);

          //Save gruu values
          if (contact.hasParam('temp-gruu')) {
            this.ua.contact.temp_gruu = contact.getParam('temp-gruu').replace(/"/g,'');
          }
          if (contact.hasParam('pub-gruu')) {
            this.ua.contact.pub_gruu = contact.getParam('pub-gruu').replace(/"/g,'');
          }

          if (! this.registered) {
            this.registered = true;
            this.ua.emit('registered', this.ua, {
              response: response
            });
          }
          break;
        // Interval too brief RFC3261 10.2.8
        case /^423$/.test(response.status_code):
          if(response.hasHeader('min-expires')) {
            // Increase our registration interval to the suggested minimum
            this.expires = response.getHeader('min-expires');
            // Attempt the registration again immediately
            this.register();
          } else { //This response MUST contain a Min-Expires header field
            this.logger.warn('423 response received for REGISTER without Min-Expires');
            this.registrationFailure(response, ExSIP_C.causes.SIP_FAILURE_CODE);
          }
          break;
        default:
          cause = Utils.sipErrorCause(response.status_code);
          this.registrationFailure(response, cause);
      }
    };

    this.onRequestTimeout = function() {
      this.registrationFailure(null, ExSIP_C.causes.REQUEST_TIMEOUT);
    };

    this.onTransportError = function() {
      this.registrationFailure(null, ExSIP_C.causes.CONNECTION_ERROR);
    };

    request_sender.send();
  },

  unregister: function(options) {
    var extraHeaders;

    if(!this.registered) {
      this.logger.debug('already unregistered');
      return;
    }

    options = options || {};

    this.registered = false;

    // Clear the registration timer.
    if (this.registrationTimer !== null) {
      clearTimeout(this.registrationTimer);
      this.registrationTimer = null;
    }

    extraHeaders = this.extraHeaders.slice();

    if(options.all) {
      extraHeaders.push('Contact: *' + this.extraContactParams);
      extraHeaders.push('Expires: 0');

      this.request = new SIPMessage.OutgoingRequest(ExSIP_C.REGISTER, this.registrar, this.ua, {
          'to_uri': this.to_uri,
          'call_id': this.call_id,
          'cseq': (this.cseq += 1)
        }, extraHeaders);
    } else {
      extraHeaders.push('Contact: '+ this.contact + ';expires=0' + this.extraContactParams);
      extraHeaders.push('Expires: 0');

      this.request = new SIPMessage.OutgoingRequest(ExSIP_C.REGISTER, this.registrar, this.ua, {
          'to_uri': this.to_uri,
          'call_id': this.call_id,
          'cseq': (this.cseq += 1)
        }, extraHeaders);
    }

    var request_sender = new RequestSender(this, this.ua);

    this.receiveResponse = function(response) {
      var cause;

      switch(true) {
        case /^1[0-9]{2}$/.test(response.status_code):
          // Ignore provisional responses.
          break;
        case /^2[0-9]{2}$/.test(response.status_code):
          this.unregistered(response);
          break;
        default:
          cause = Utils.sipErrorCause(response.status_code);
          this.unregistered(response, cause);
      }
    };

    this.onRequestTimeout = function() {
      this.unregistered(null, ExSIP_C.causes.REQUEST_TIMEOUT);
    };

    this.onTransportError = function() {
      this.unregistered(null, ExSIP_C.causes.CONNECTION_ERROR);
    };

    request_sender.send();
  },

  registrationFailure: function(response, cause) {
    this.ua.emit('registrationFailed', this.ua, {
      response: response || null,
      cause: cause
    });

    if (this.registered) {
      this.registered = false;
      this.ua.emit('unregistered', this.ua, {
        response: response || null,
        cause: cause
      });
    }
  },

  unregistered: function(response, cause) {
    this.registered = false;
    this.ua.emit('unregistered', this.ua, {
      response: response || null,
      cause: cause || null
    });
  },

  onTransportClosed: function() {
    if (this.registrationTimer !== null) {
      clearTimeout(this.registrationTimer);
      this.registrationTimer = null;
    }

    if(this.registered) {
      this.registered = false;
      this.ua.emit('unregistered', this.ua);
    }
  },

  close: function() {
    if (this.registered) {
      this.unregister();
    }
  }
};