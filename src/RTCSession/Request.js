module.exports = Request;

/**
 * Dependencies.
 */
var ExSIP_C = require('../Constants');
var EventEmitter = require('../EventEmitter');
var Exceptions = require('../Exceptions');
var RTCSession = require('../RTCSession');
var Utils = require('../Utils');


function Request(session) {
  var events = [
    'progress',
    'succeeded',
    'failed'
  ];

  this.owner = session;

  this.logger = session.ua.getLogger('ExSIP.rtcsession.request', session.id);
  this.initEvents(events);
}


Request.prototype = new EventEmitter();


Request.prototype.send = function(method, options) {
  options = options || {};

  var event,
    extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [],
    eventHandlers = options.eventHandlers || {},
    body = options.body || null;

  if (method === undefined) {
    throw new TypeError('Not enough arguments');
  }

  // Check RTCSession Status
  if (this.owner.status !== RTCSession.C.STATUS_1XX_RECEIVED &&
    this.owner.status !== RTCSession.C.STATUS_WAITING_FOR_ANSWER &&
    this.owner.status !== RTCSession.C.STATUS_WAITING_FOR_ACK &&
    this.owner.status !== RTCSession.C.STATUS_CONFIRMED &&
    this.owner.status !== RTCSession.C.STATUS_TERMINATED) {
    throw new Exceptions.InvalidStateError(this.owner.status);
  }

  /*
   * Allow sending BYE in TERMINATED status since the RTCSession
   * could had been terminated before the ACK had arrived.
   * RFC3261 Section 15, Paragraph 2
   */
  // else if (this.owner.status === RTCSession.C.STATUS_TERMINATED && method !== ExSIP_C.BYE) {
  //   throw new Exceptions.InvalidStateError(this.owner.status);
  // }

  // Set event handlers
  for (event in eventHandlers) {
    this.on(event, eventHandlers[event]);
  }

  this.owner.dialog.sendRequest(this, method, {
    extraHeaders: extraHeaders,
    body: body
  });
};

Request.prototype.receiveResponse = function(response) {
  var cause;

  switch(true) {
    case /^1[0-9]{2}$/.test(response.status_code):
      this.owner.received_100 = true;
      this.emit('progress', this, {
        originator: 'remote',
        response: response
      });
      break;

    case /^2[0-9]{2}$/.test(response.status_code):
      if(this.callbacks.success) {
        this.callbacks.success();
      }
      this.emit('succeeded', this, {
        originator: 'remote',
        response: response
      });
      break;

    default:
      if(this.callbacks.failure) {
        this.callbacks.failure();
      }
      cause = Utils.sipErrorCause(response.status_code);
      this.emit('failed', this, {
        originator: 'remote',
        response: response,
        cause: cause
      });
      break;
  }
};

Request.prototype.onRequestTimeout = function() {
  this.emit('failed', this, {
    originator: 'system',
    cause: ExSIP_C.causes.REQUEST_TIMEOUT
  });
  this.owner.onRequestTimeout();
};

Request.prototype.onTransportError = function() {
  this.emit('failed', this, {
    originator: 'system',
    cause: ExSIP_C.causes.CONNECTION_ERROR
  });
  this.owner.onTransportError();
};

Request.prototype.onDialogError = function(response) {
  this.emit('failed', this, {
    originator: 'remote',
    response: response,
    cause: ExSIP_C.causes.DIALOG_ERROR
  });
  this.owner.onDialogError(response);
};
