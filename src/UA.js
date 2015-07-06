module.exports = UA;


var C = {
  // UA status codes
  STATUS_INIT: 0,
  STATUS_READY: 1,
  STATUS_USER_CLOSED: 2,
  STATUS_NOT_READY: 3,

  // UA error codes
  CONFIGURATION_ERROR: 1,
  NETWORK_ERROR: 2
};

/**
 * Expose C object.
 */
UA.C = C;


/**
 * Dependencies.
 */
var ExSIP_C = require('./Constants');
var LoggerFactory = require('./LoggerFactory');
var EventEmitter = require('./EventEmitter');
var Registrator = require('./Registrator');
var RTCSession = require('./RTCSession');
var Message = require('./Message');
var Transport = require('./Transport');
var Transactions = require('./Transactions');
var Transactions = require('./Transactions');
var Utils = require('./Utils');
var WebRTC = require('./WebRTC');
var Exceptions = require('./Exceptions');
var URI = require('./URI');
var Grammar = require('./Grammar');
var Utils = require('./Utils');



/**
 * The User-Agent class.
 * @class UA
 * @param {Object} configuration Configuration parameters.
 * @throws {Exceptions.ConfigurationError} If a configuration parameter is invalid.
 * @throws {TypeError} If no configuration is given.
 */
function UA(configuration) {
  var events = [
    'connecting',
    'connected',
    'disconnected',
    'newTransaction',
    'transactionDestroyed',
    'registered',
    'unregistered',
    'registrationFailed',
    'newRTCSession',
    'newMessage',
    'onReInvite'
  ];

  this.log = new LoggerFactory(configuration);
  this.logger = this.getLogger('ua');
  this.usedServers = [];
  this.rtcMediaHandlerOptions = {};

  this.cache = {
    credentials: {}
  };

  this.configuration = {};
  this.dynConfiguration = {};
  this.dialogs = {};

  //User actions outside any session/dialog (MESSAGE)
  this.applicants = {};

  this.sessions = {};
  this.transport = null;
  this.contact = null;
  this.status = C.STATUS_INIT;
  this.error = null;
  this.transactions = {
    nist: {},
    nict: {},
    ist: {},
    ict: {}
  };

  // Custom UA empty object for high level use
  this.data = {};

  this.transportRecoverAttempts = 0;
  this.transportRecoveryTimer = null;

  Object.defineProperties(this, {
    transactionsCount: {
      get: function() {
        var type,
          transactions = ['nist', 'nict', 'ist', 'ict'],
          count = 0;

        for (type in transactions) {
          count += Object.keys(this.transactions[transactions[type]]).length;
        }

        return count;
      }
    },

    nictTransactionsCount: {
      get: function() {
        return Object.keys(this.transactions.nict).length;
      }
    },

    nistTransactionsCount: {
      get: function() {
        return Object.keys(this.transactions.nist).length;
      }
    },

    ictTransactionsCount: {
      get: function() {
        return Object.keys(this.transactions.ict).length;
      }
    },

    istTransactionsCount: {
      get: function() {
        return Object.keys(this.transactions.ist).length;
      }
    }
  });

  /**
   * Load configuration
   */

  if (configuration === undefined) {
    throw new TypeError('Not enough arguments');
  }

  // Apply log configuration if present
  if (configuration.log) {
    if (configuration.log.hasOwnProperty('builtinEnabled')) {
      this.log.builtinEnabled = configuration.log.builtinEnabled;
    }

    if (configuration.log.hasOwnProperty('level')) {
      this.log.level = configuration.log.level;
    }

    if (configuration.log.hasOwnProperty('connector')) {
      this.log.connector = configuration.log.connector;
    }
  }

  try {
    this.loadConfig(configuration);
    this.initEvents(events);
  } catch (e) {
    this.status = C.STATUS_NOT_READY;
    this.error = C.CONFIGURATION_ERROR;
    throw e;
  }
}


UA.prototype = new EventEmitter();

//=================
//  High Level API
//=================
UA.prototype.isDebug = function() {
  return this.configuration.trace_sip === true;
};

/**
 * Registration state.
 * @param {Boolean}
 */
UA.prototype.isRegistered = function() {
  if (this._registrator && this._registrator.registered) {
    return true;
  } else {
    return false;
  }
};

/**
 * Connection state.
 * @param {Boolean}
 */
UA.prototype.isConnected = function() {
  if (this.transport) {
    return this.transport.connected;
  } else {
    return false;
  }
};

UA.prototype.transfer = function(transferTarget, sessionToTransfer, options) {
  var self = this;
  this.logger.log('transfer : ' + transferTarget + ' : options : ' + Utils.toString(options));
  transferTarget = Utils.normalizeTarget(transferTarget, this.configuration.hostport_params);
  if (!transferTarget) {
    sessionToTransfer.failed('local', null, ExSIP_C.causes.INVALID_TARGET);
    this.logger.warn("invalid transfer target");
    return;
  }

  var holdFailed = function() {
    self.logger.log("transfer : hold failed");
  };

  var holdSuccess = function() {
    self.logger.log("transfer : hold success - sending refer to transferee");
    self.sendReferBasic(sessionToTransfer, transferTarget, options);
  };

  self.logger.log("transfer : holding session to transfer");
  sessionToTransfer.hold(holdSuccess, holdFailed);
};

UA.prototype.attendedTransfer = function(transferTarget, sessionToTransfer, options) {
  var self = this;
  this.logger.log('attended transfer : ' + transferTarget + ' : options : ' + Utils.toString(options));
  transferTarget = Utils.normalizeTarget(transferTarget, this.configuration.hostport_params);
  if (!transferTarget) {
    this.logger.warn('invalid transfer target');
    sessionToTransfer.failed('local', null, ExSIP_C.causes.INVALID_TARGET);
    return;
  }


  var targetSession = self.newSession(options);
  targetSession.rtcMediaHandler.copy(sessionToTransfer.rtcMediaHandler);

  var holdTargetSuccess = function() {
    self.logger.log("transfer : hold target success - sending attended refer");
    self.sendReferAttended(sessionToTransfer, targetSession, transferTarget, options);
  };

  var holdTargetFailed = function() {
    self.logger.log("transfer : hold target failed");
  };

  var sendTargetInviteSuccess = function() {
    self.logger.log("transfer : send invite to target success - putting target on hold");
    targetSession.hold(holdTargetSuccess, holdTargetFailed);
  };

  var sendTargetInviteFailed = function(response) {
    self.logger.log("transfer : send invite to target failed - sending basic refer");
    if (response.status_code === 420) {
      self.sendReferBasic(sessionToTransfer, transferTarget, options);
    }
  };

  var holdFailed = function() {
    self.logger.log("transfer : hold failed");
  };

  var holdSuccess = function() {
    self.logger.log("transfer : hold success - sending invite to target");
    targetSession.sendInviteRequest(transferTarget, {
        extraHeaders: ["Require: replaces"]
      },
      sendTargetInviteSuccess, sendTargetInviteFailed);
  };

  self.logger.log("transfer : holding session to transfer");
  sessionToTransfer.hold(holdSuccess, holdFailed);
};

UA.prototype.sendReferAttended = function(sessionToTransfer, targetSession, transferTarget, options) {
  var referSession = this.getReferSession(sessionToTransfer, options);
  options = this.getReferOptions(sessionToTransfer, targetSession, options);
  var referTo = "<" + (transferTarget).toString() +
    "?Replaces=" + targetSession.dialog.id.call_id +
    "%3Bto-tag%3D" + targetSession.dialog.id.remote_tag +
    "%3Bfrom-tag%3D" + targetSession.dialog.id.local_tag + ">";
  options.extraHeaders.push('Refer-To: ' + referTo);
  referSession.sendReferRequest(sessionToTransfer, options);
};

UA.prototype.processRefer = function(sessionToTransfer, referRequest) {
  var self = this;
  referRequest.reply(202);
  var notifySuccess = function() {
    self.logger.log("Notify successful");
  };
  var notifyFailure = function() {
    self.logger.log("Notify failed");
  };
  sessionToTransfer.sendNotifyRequest({
    sdp: "SIP/2.0 100 Trying"
  }, notifySuccess, notifyFailure);
};

UA.prototype.sendReferBasic = function(sessionToTransfer, transferTarget, options) {
  var referSession = this.getReferSession(sessionToTransfer, options);
  options = this.getReferOptions(sessionToTransfer, sessionToTransfer, options);
  options.extraHeaders.push('Refer-To: <' + transferTarget + '>');
  this.logger.debug('refer options : ' + JSON.stringify(options));
  referSession.sendReferRequest(sessionToTransfer, options);
};

UA.prototype.getReferOptions = function(sessionToTransfer, targetDialogSession, options) {
  options = options || {};
  options.extraHeaders = options.extraHeaders || [];
  if (sessionToTransfer.supports("tdialog")) {
    options.extraHeaders.push('Require: tdialog');
    var localTag = targetDialogSession.dialog.isUAS() ? targetDialogSession.dialog.id.remote_tag : targetDialogSession.dialog.id.local_tag;
    var remoteTag = targetDialogSession.dialog.isUAS() ? targetDialogSession.dialog.id.local_tag : targetDialogSession.dialog.id.remote_tag;
    var targetDialog = targetDialogSession.dialog.id.call_id + ";local-tag=" + localTag + ";remote-tag=" + remoteTag;
    options.extraHeaders.push('Target-Dialog: ' + targetDialog);
  }
  return options;
};

UA.prototype.getReferSession = function(sessionToTransfer, options) {
  if (sessionToTransfer.supports("tdialog")) {
    return this.newSession(options);
  } else {
    this.logger.warn('tdialog not supported - sending refer in same session : ' + sessionToTransfer.id, this);
    return sessionToTransfer;
  }
};

UA.prototype.newSession = function(options) {
  var session = new RTCSession(this);
  session.initRtcMediaHandler(options);
  return session;
};

UA.prototype.getUserMedia = function(options, success, failure, force) {
  if (!force && this.localMedia) {
    return this.localMedia;
  }

  if (this.localMedia) {
    this.logger.log("stopping existing local media stream", this);
    this.localMedia.stop();
  }

  this.logger.log('options : ' + Utils.toString(options), this);
  var self = this;
  var constraints = options.mediaConstraints || {
    audio: true,
    video: true
  };
  WebRTC.getUserMedia(constraints,
    function(stream) {
      self.logger.log('got local media stream', self);
      self.localMedia = stream;
      success(stream);
    },
    function(e) {
      self.logger.error('unable to get user media');
      self.logger.error(e);
      failure(e);
    }
  );
};

/**
 * Gracefully close.
 *
 */
UA.prototype.stop = function() {
  var session, applicant,
    ua = this;

  this.logger.log('user requested closure...');

  // Remove dynamic settings.
  this.dynConfiguration = {};

  if (this.status === C.STATUS_USER_CLOSED) {
    this.logger.warn('UA already closed');
    return;
  }

  // Clear transportRecoveryTimer
  clearTimeout(this.transportRecoveryTimer);

  // Close registrator
  if (this._registrator) {
    this.logger.debug('closing registrator');
    this._registrator.close();
  }

  // If there are session wait a bit so CANCEL/BYE can be sent and their responses received.
  var num_sessions = Object.keys(this.sessions).length;

  // Run  _terminate_ on every Session
  for (session in this.sessions) {
    this.logger.log('closing session ' + session, this);
    this.sessions[session].terminate();
  }

  // Run  _close_ on every applicant
  for (applicant in this.applicants) {
    this.applicants[applicant].close();
  }

  this.status = C.STATUS_USER_CLOSED;
  // If there are no pending non-INVITE client or server transactions and no
  // sessions, then disconnect now. Otherwise wait for 2 seconds.
  if (this.nistTransactionsCount === 0 && this.nictTransactionsCount === 0 && num_sessions === 0) {
    ua.transport.disconnect();
  } else {
    setTimeout(function() {
      ua.transport.disconnect();
    }, 2000);
  }
};

UA.prototype.reconnect = function() {
  this.logger.debug('************** reconnect');
  this.stop();
  this.status = C.STATUS_INIT;
  this.start();
};

/**
 * Connect to the WS server if status = STATUS_INIT.
 * Resume UA after being closed.
 */
UA.prototype.start = function() {
  var server;

  this.logger.debug('user requested startup... : ', this.status);

  if (this.status === C.STATUS_INIT) {
    server = this.getNextWsServer({
      force: true
    });
    this.transport = new Transport(this, server);
    this.transport.connect();
  } else if (this.status === C.STATUS_USER_CLOSED) {
    this.logger.log('resuming');
    this.status = C.STATUS_READY;
    this.transport.connect();
  } else if (this.status === C.STATUS_READY) {
    this.logger.log('UA is in READY status, not resuming');
  } else {
    this.logger.error('Connection is down. Auto-Recovery system is trying to connect');
  }

  // Set dynamic configuration.
  this.dynConfiguration.register = this.configuration.register;
};

/**
 * Register.
 */
UA.prototype.register = function() {
  this.dynConfiguration.register = true;
  this._registrator.register();
};

/**
 * Unregister.
 */
UA.prototype.unregister = function(options) {
  this.dynConfiguration.register = false;
  this._registrator.unregister(options);
};

/**
 * Get the Registrator instance.
 */
UA.prototype.registrator = function() {
  return this._registrator;
};

/**
 * Registration state.
 */
UA.prototype.isRegistered = function() {
  if (this._registrator.registered) {
    return true;
  } else {
    return false;
  }
};

/**
 * Connection state.
 */
UA.prototype.isConnected = function() {
  if (this.transport) {
    return this.transport.connected;
  } else {
    return false;
  }
};

/**
 * Make an outgoing call.
 *
 * -param {String} target
 * -param {Object} views
 * -param {Object} [options]
 *
 * -throws {TypeError}
 *
 */
UA.prototype.call = function(target, options) {
  var session;

  session = new RTCSession(this);
  session.connect(target, options);
  return session;
};

/**
 * Send a message.
 *
 * -param {String} target
 * -param {String} body
 * -param {Object} [options]
 *
 * -throws {TypeError}
 *
 */
UA.prototype.sendMessage = function(target, body, options) {
  var message;

  message = new Message(this);
  message.send(target, body, options);
};

/**
 * Normalice a string into a valid SIP request URI
 * -param {String} target
 * -returns {URI|undefined}
 */
UA.prototype.normalizeTarget = function(target) {
  return Utils.normalizeTarget(target, this.configuration.hostport_params);
};

UA.prototype.setRtcMediaHandlerOptions = function(rtcMediaHandlerOptions) {
  this.rtcMediaHandlerOptions = rtcMediaHandlerOptions;
};

UA.prototype.rtcConstraints = function() {
  return this.rtcMediaHandlerOptions ? this.rtcMediaHandlerOptions.RTCConstraints : false;
};

UA.prototype.reuseLocalMedia = function() {
  return this.rtcMediaHandlerOptions ? this.rtcMediaHandlerOptions.reuseLocalMedia : false;
};

//===============================
//  Private (For internal use)
//===============================

UA.prototype.saveCredentials = function(credentials) {
  this.cache.credentials[credentials.realm] = this.cache.credentials[credentials.realm] || {};
  this.cache.credentials[credentials.realm][credentials.uri] = credentials;
};

UA.prototype.getCredentials = function(request) {
  var realm, credentials;

  realm = request.ruri.host;

  if (this.cache.credentials[realm] && this.cache.credentials[realm][request.ruri]) {
    credentials = this.cache.credentials[realm][request.ruri];
    credentials.method = request.method;
  }

  return credentials;
};

UA.prototype.getLogger = function(category, label) {
  return this.log.getLogger(category, label);
};


//==========================
// Event Handlers
//==========================

/**
 * Transport Close event.
 * @private
 * @event
 * @param {Transport} transport.
 */
UA.prototype.onTransportClosed = function(transport) {
  // Run _onTransportError_ callback on every client transaction using _transport_
  var type, idx, length,
    client_transactions = ['nict', 'ict', 'nist', 'ist'];

  transport.server.status = Transport.C.STATUS_DISCONNECTED;
  this.logger.log('connection state set to ' + Transport.C.STATUS_DISCONNECTED, this);

  length = client_transactions.length;
  for (type = 0; type < length; type++) {
    for (idx in this.transactions[client_transactions[type]]) {
      this.transactions[client_transactions[type]][idx].onTransportError();
    }
  }

  // Close sessions if GRUU is not being used
  if (!this.contact.pub_gruu) {
    this.closeSessionsOnTransportError();
  }
};

/**
 * Unrecoverable transport event.
 * Connection reattempt logic has been done and didn't success.
 * @private
 * @event
 * @param {Transport} transport.
 */
UA.prototype.onTransportError = function(transport, options) {
  options = options || {};
  if (this.status === C.STATUS_USER_CLOSED) {
    return;
  }

  this.logger.log('transport ' + transport.server.ws_uri + ' failed | connection state set to ' + Transport.C.STATUS_ERROR, this);

  // Close sessions.
  //Mark this transport as 'down' and try the next one
  transport.server.status = Transport.C.STATUS_ERROR;

  this.closeSessionsOnTransportError();
  if (!this.error || this.error !== C.NETWORK_ERROR) {
    this.status = C.STATUS_NOT_READY;
    this.error = C.NETWORK_ERROR;
  }
  // Transport Recovery process
  this.recoverTransport(options);

  var data = Utils.merge_options({
    transport: transport,
    code: transport.lastTransportError.code,
    reason: transport.lastTransportError.reason
  }, options);
  this.emit('disconnected', this, data);
};

/**
 * Transport connection event.
 * @private
 * @event
 * @param {Transport} transport.
 */
UA.prototype.onTransportConnected = function(transport) {
  this.transport = transport;

  // Reset transport recovery counter
  this.transportRecoverAttempts = 0;

  transport.server.status = Transport.C.STATUS_READY;
  this.logger.log('connection state set to ' + Transport.C.STATUS_READY, this);

  if (this.status === C.STATUS_USER_CLOSED) {
    return;
  }

  this.status = C.STATUS_READY;
  this.error = null;
  this.emit('connected', this, {
    transport: transport
  });

  if (this.dynConfiguration.register) {
    if (this._registrator) {
      this._registrator.onTransportConnected();
    } else {
      this._registrator = new Registrator(this, transport);
      this.register();
    }
  } else if (!this._registrator) {
    this._registrator = new Registrator(this, transport);
  }
};

/**
 * Transport connecting event
 */
UA.prototype.onTransportConnecting = function(transport, attempts) {
  this.emit('connecting', this, {
    transport: transport,
    attempts: attempts
  });
};


/**
 * new Transaction
 */
UA.prototype.newTransaction = function(transaction) {
  this.transactions[transaction.type][transaction.id] = transaction;
  this.emit('newTransaction', this, {
    transaction: transaction
  });
};


/**
 * Transaction destroyed.
 */
UA.prototype.destroyTransaction = function(transaction) {
  delete this.transactions[transaction.type][transaction.id];
  this.emit('transactionDestroyed', this, {
    transaction: transaction
  });
};


//=========================
// receiveRequest
//=========================

/**
 * Request reception
 * @private
 * @param {IncomingRequest} request.
 */
UA.prototype.receiveRequest = function(request) {
  var dialog, session, message,
    method = request.method;

  // Check that Ruri points to us
  if (request.ruri.user !== this.configuration.uri.user && request.ruri.user !== this.contact.uri.user) {
    this.logger.warn('Request-URI (' + request.ruri.user + ') does not point to us (' + this.configuration.uri.user + ')', this);
    if (request.method !== ExSIP_C.ACK) {
      request.reply_sl(404);
    }
    return;
  }

  // Check request URI scheme
  if (request.ruri.scheme === ExSIP_C.SIPS) {
    request.reply_sl(416);
    return;
  }

  // Check transaction
  if (Transactions.checkTransaction(this, request)) {
    this.logger.warn('Check Transaction failed', this);
    return;
  }

  // Create the server transaction
  if (method === ExSIP_C.INVITE) {
    new Transactions.InviteServerTransaction(request, this);
  } else if (method !== ExSIP_C.ACK && method !== ExSIP_C.CANCEL) {
    new Transactions.NonInviteServerTransaction(request, this);
  }

  /* RFC3261 12.2.2
   * Requests that do not change in any way the state of a dialog may be
   * received within a dialog (for example, an OPTIONS request).
   * They are processed as if they had been received outside the dialog.
   */
  if (method === ExSIP_C.OPTIONS) {
    request.reply(200);
  } else if (method === ExSIP_C.MESSAGE) {
    if (!this.checkEvent('newMessage') || this.listeners('newMessage').length === 0) {
      request.reply(405);
      return;
    }
    message = new Message(this);
    message.init_incoming(request);
  } else if (method === ExSIP_C.INVITE) {
    if (!this.checkEvent('newRTCSession') || this.listeners('newRTCSession').length === 0) {
      request.reply(405);
      return;
    }
  }

  // Initial Request
  if (!request.to_tag) {
    switch (method) {
      case ExSIP_C.INVITE:
        if (WebRTC.isSupported) {
          this.logger.debug('INVITE received', this);
          session = new RTCSession(this);
          session.init_incoming(request);
        } else {
          this.logger.warn('INVITE received but WebRTC is not supported', this);
          request.reply(488);
        }
        break;
      case ExSIP_C.BYE:
        // Out of dialog BYE received
        request.reply(481);
        break;
      case ExSIP_C.CANCEL:
        session = this.findSession(request);
        if (session) {
          session.receiveRequest(request);
        } else {
          this.logger.warn('received CANCEL request for a non existent session', this);
        }
        break;
      case ExSIP_C.ACK:
        /* Absorb it.
         * ACK request without a corresponding Invite Transaction
         * and without To tag.
         */
        break;
      default:
        request.reply(405);
        break;
    }
  }
  // In-dialog request
  else {
    dialog = this.findDialog(request);

    if (dialog) {
      dialog.receiveRequest(request);
    } else if (method === ExSIP_C.NOTIFY) {
      session = this.findSession(request);
      if (session) {
        this.logger.log('received NOTIFY request for session : ' + session.id, this);
        session.receiveRequest(request);
      } else {
        this.logger.warn('received NOTIFY request for a non existent session', this);
        this.logger.log('request : ' + (request.call_id + "-" + request.from_tag + "-" + request.to_tag), this);
        this.logger.log('sessions : ' + Object.keys(this.sessions), this);
        request.reply(481, 'Subscription does not exist');
      }
    }
    /* RFC3261 12.2.2
     * Request with to tag, but no matching dialog found.
     * Exception: ACK for an Invite request for which a dialog has not
     * been created.
     */
    else {
      if (method !== ExSIP_C.ACK) {
        request.reply(481);
      }
    }
  }
};

//=================
// Utils
//=================

/**
 * Get the session to which the request belongs to, if any.
 * @private
 * @param {IncomingRequest} request.
 * @returns {OutgoingSession|IncomingSession|null}
 */
UA.prototype.findSession = function(request) {
  var
    sessionIDa = request.call_id + request.from_tag,
    sessionA = this.sessions[sessionIDa],
    sessionIDb = request.call_id + request.to_tag,
    sessionB = this.sessions[sessionIDb];

  if (sessionA) {
    return sessionA;
  } else if (sessionB) {
    return sessionB;
  } else {
    return null;
  }
};

/**
 * Get the dialog to which the request belongs to, if any.
 * @private
 * @param {IncomingRequest}
 * @returns {Dialog|null}
 */
UA.prototype.findDialog = function(request) {
  var
    id = request.call_id + request.from_tag + request.to_tag,
    dialog = this.dialogs[id];

  if (dialog) {
    return dialog;
  } else {
    id = request.call_id + request.to_tag + request.from_tag;
    dialog = this.dialogs[id];
    if (dialog) {
      return dialog;
    } else {
      return null;
    }
  }
};

/**
 * Retrieve the next server to which connect.
 * @private
 * @returns {Object} ws_server
 */
UA.prototype.getNextWsServer = function(options) {
  options = options || {};

  // reset if all servers have been used
  if (options.force && this.usedServers.length >= this.configuration.ws_servers.length) {
    this.usedServers = [];
  }

  var candidates = [];
  var totalWeight = 0;
  // Add only server with status ready and not already used
  for (var i = 0; i < this.configuration.ws_servers.length; i++) {
    var server = this.configuration.ws_servers[i];
    if (server.status === Transport.C.STATUS_READY && this.usedServers.indexOf(server) === -1) {
      candidates.push(server);
      totalWeight += (server.weight || 1);
    }
  }

  var weightedServers = []; //new array to hold "weighted" servers
  for (var j = 0; j < candidates.length; j++) {
    var candidate = candidates[j];
    for (var k = 0; k < (candidate.weight || 1); k++) {
      weightedServers.push(candidate);
    }
  }

  var randomNumber = Math.floor(Math.random() * totalWeight);
  var index = Math.min(randomNumber, weightedServers.length - 1);
  return weightedServers[index];
};

/**
 * Close all sessions on transport error.
 */
UA.prototype.closeSessionsOnTransportError = function() {
  var idx;

  // Run _transportError_ for every Session
  for (idx in this.sessions) {
    this.sessions[idx].onTransportError();
  }
  // Call registrator _onTransportClosed_
  this._registrator.onTransportClosed();
};

UA.prototype.loadConfig = function(configuration) {
  // Settings and default values
  var parameter, value, checked_value, hostport_params, registrar_server,
    settings = {
      /* Host address
       * Value to be set in Via sent_by and host part of Contact FQDN
       */
      via_host: this.configuration.via_host || (Utils.createRandomToken(12) + '.invalid'),

      // Password
      password: null,

      // Registration parameters
      register_expires: 600,
      register: true,
      registrar_server: null,

      // Transport related parameters
      ws_server_max_reconnection: 3,
      ws_server_reconnection_timeout: 4,

      connection_recovery_min_interval: 2,
      connection_recovery_max_interval: 30,

      use_preloaded_route: false,

      // Session parameters
      no_answer_timeout: 60,
      stun_servers: ['stun:stun.l.google.com:19302'],
      turn_servers: [],

      // Logging parameters
      trace_sip: false,

      // Hacks
      hack_via_tcp: false,
      hack_via_ws: false,
      hack_ip_in_contact: false,
      enable_datachannel: false,
      enable_ims: false,
      p_asserted_identity: null,

      // Options for Node.
      node_ws_options: {}
    };

  // Pre-Configuration

  // Check Mandatory parameters
  for (parameter in UA.configuration_check.mandatory) {
    if (!configuration.hasOwnProperty(parameter)) {
      throw new Exceptions.ConfigurationError(parameter);
    } else {
      value = configuration[parameter];
      checked_value = UA.configuration_check.mandatory[parameter].call(this, value);
      if (checked_value !== undefined) {
        settings[parameter] = checked_value;
      } else {
        throw new Exceptions.ConfigurationError(parameter, value);
      }
    }
  }

  // Check Optional parameters
  for (parameter in UA.configuration_check.optional) {
    if (configuration.hasOwnProperty(parameter)) {
      value = configuration[parameter];

      /* If the parameter value is null, empty string, undefined, empty array
       * or it's a number with NaN value, then apply its default value.
       */
      if (Utils.isEmpty(value)) {
        continue;
      }

      checked_value = UA.configuration_check.optional[parameter].call(this, value);
      if (checked_value !== undefined) {
        settings[parameter] = checked_value;
      } else {
        throw new Exceptions.ConfigurationError(parameter, value);
      }
    }
  }

  // Sanity Checks

  // Connection recovery intervals
  if (settings.connection_recovery_max_interval < settings.connection_recovery_min_interval) {
    throw new Exceptions.ConfigurationError('connection_recovery_max_interval', settings.connection_recovery_max_interval);
  }

  // Post Configuration Process

  // Allow passing 0 number as display_name.
  if (settings.display_name === 0) {
    settings.display_name = '0';
  }

  // Instance-id for GRUU
  if (!settings.instance_id) {
    settings.instance_id = this.configuration.instance_id || Utils.newUUID();
  }

  // ExSIP_id instance parameter. Static random tag of length 5
  settings.exsip_id = this.configuration.exsip_id || Utils.createRandomToken(5);

  // String containing settings.uri without scheme and user.
  hostport_params = settings.uri.clone();
  hostport_params.user = null;
  settings.hostport_params = hostport_params.toString().replace(/^sip:/i, '');

  /* Check whether authorization_user is explicitly defined.
   * Take 'settings.uri.user' value if not.
   */
  if (!settings.authorization_user) {
    settings.authorization_user = settings.uri.user;
  }

  /* If no 'registrar_server' is set use the 'uri' value without user portion. */
  if (!settings.registrar_server) {
    registrar_server = settings.uri.clone();
    registrar_server.user = null;
    settings.registrar_server = registrar_server;
  }

  // User no_answer_timeout
  settings.no_answer_timeout = settings.no_answer_timeout * 1000;

  // Via Host
  if (settings.hack_ip_in_contact) {
    settings.via_host = Utils.getRandomTestNetIP();
  }

  // Set empty Stun Server Set if explicitly passed an empty Array
  value = configuration.stun_servers;
  if (value instanceof Array && value.length === 0) {
    settings.stun_servers = [];
  }

  this.contact = this.contact || {
    pub_gruu: null,
    temp_gruu: null,
    uri: new URI('sip', Utils.createRandomToken(8), settings.via_host, null, {
      transport: 'ws'
    }),
    toString: function(options) {
      options = options || {};

      var
        anonymous = options.anonymous || null,
        outbound = options.outbound || null,
        contact = '<';

      if (anonymous) {
        contact += this.temp_gruu || 'sip:anonymous@anonymous.invalid;transport=ws';
      } else {
        contact += this.pub_gruu || this.uri.toString();
      }

      if (outbound && (anonymous ? !this.temp_gruu : !this.pub_gruu)) {
        contact += ';ob';
      }

      contact += '>';

      return contact;
    }
  };

  // Fill the value of the configuration_skeleton
  for (parameter in settings) {
    UA.configuration_skeleton[parameter].value = settings[parameter];
  }

  Object.defineProperties(this.configuration, UA.configuration_skeleton);

  // Clean UA.configuration_skeleton
  for (parameter in settings) {
    UA.configuration_skeleton[parameter].value = '';
  }

  this.logger.debug('configuration parameters after validation:');
  for (parameter in settings) {
    switch (parameter) {
      case 'uri':
      case 'registrar_server':
        this.logger.debug('· ' + parameter + ': ' + settings[parameter]);
        break;
      case 'password':
        this.logger.debug('· ' + parameter + ': ' + 'NOT SHOWN');
        break;
      default:
        this.logger.debug('· ' + parameter + ': ' + JSON.stringify(settings[parameter]));
    }
  }

  // Initialize registrator
  this._registrator = new Registrator(this);

  return;
};

UA.prototype.retry = function(nextRetry, server, callback) {
  var self = this;
  var retryCallback = function() {
    var transport = new Transport(self, server);
    if (callback) {
      callback(transport);
    }
  };

  if (nextRetry === 0) {
    retryCallback();
  } else {
    setTimeout(retryCallback, nextRetry * 1000);
  }
};

UA.prototype.recoverTransport = function(options) {
  var idx, length, k, nextRetry, count, server;

  options = options || {};
  count = this.transportRecoverAttempts;

  length = this.configuration.ws_servers.length;
  for (idx = 0; idx < length; idx++) {
    this.configuration.ws_servers[idx].status = Transport.C.STATUS_READY;
  }

  server = this.getNextWsServer();
  if (options.code === 503 && !server) {
    delete options.retryAfter;
    this.logger.log('non-failover on 503 error - skipping recoverTransport', this);
    return;
  }

  var maxTransportRecoveryAttempts = this.configuration.max_transport_recovery_attempts;
  if (typeof(maxTransportRecoveryAttempts) !== "undefined" && count >= parseInt(maxTransportRecoveryAttempts, 10)) {
    delete options.retryAfter;
    this.logger.log('recover attempts ' + count + " exceed max transport recovery attempts " + maxTransportRecoveryAttempts + " - skipping recoverTransport");
    return;
  }

  if (server) {
    this.logger.log('failover - new connection attempt with ' + server.ws_uri);
    this.retry(0, server, options.retryCallback);
    return;
  }

  if (options.retryAfter) {
    nextRetry = options.retryAfter;
  } else {
    k = Math.floor((Math.random() * Math.pow(2, count)) + 1);
    nextRetry = k * this.configuration.connection_recovery_min_interval;

    if (nextRetry > this.configuration.connection_recovery_max_interval) {
      this.logger.log('time for next connection attempt exceeds connection_recovery_max_interval, resetting counter', this);
      nextRetry = this.configuration.connection_recovery_min_interval;
      count = 0;
    }
  }

  server = this.getNextWsServer({
    force: true
  });
  this.transportRecoverAttempts = count + 1;
  this.logger.log('resetting ws server list - next connection attempt in ' + nextRetry + ' seconds to ' + server.ws_uri + ' : ' + this.transportRecoverAttempts);
  this.retry(nextRetry, server, options.retryCallback);
};

/**
 * Configuration Object skeleton.
 */
/**
 * Configuration Object skeleton.
 */
UA.configuration_skeleton = (function() {
  var idx, parameter,
    skeleton = {},
    parameters = [
      // Internal parameters
      "exsip_id",
      "ws_server_max_reconnection",
      "ws_server_reconnection_timeout",
      "hostport_params",

      // Mandatory user configurable parameters
      "uri",
      "ws_servers",

      // Optional user configurable parameters
      "authorization_user",
      "connection_recovery_max_interval",
      "connection_recovery_min_interval",
      "max_transport_recovery_attempts",
      "display_name",
      "hack_via_tcp", // false
      "hack_via_ws", // false
      "hack_ip_in_contact", //false
      "instance_id",
      "no_answer_timeout", // 30 seconds
      "node_ws_options",
      "password",
      "register_expires", // 600 seconds
      "registrar_server",
      "stun_servers",
      "trace_sip",
      "turn_servers",
      "use_preloaded_route",
      "enable_datachannel",
      "enable_ims",
      "p_asserted_identity",

      // Post-configuration generated parameters
      "via_core_value",
      "via_host"
    ];

  for (idx in parameters) {
    parameter = parameters[idx];
    skeleton[parameter] = {
      value: '',
      writable: false,
      configurable: true
    };
  }

  skeleton.register = {
    value: '',
    writable: true,
    configurable: true
  };

  return skeleton;
}());

/**
 * Configuration checker.
 */
UA.configuration_check = {
  mandatory: {

    uri: function(uri) {
      var parsed;

      if (!/^sip:/i.test(uri)) {
        uri = ExSIP_C.SIP + ':' + uri;
      }
      parsed = URI.parse(uri);

      if (!parsed) {
        return;
      } else if (!parsed.user) {
        return;
      } else {
        return parsed;
      }
    },

    ws_servers: function(ws_servers) {
      var idx, length, url;

      /* Allow defining ws_servers parameter as:
       *  String: "host"
       *  Array of Strings: ["host1", "host2"]
       *  Array of Objects: [{ws_uri:"host1", weight:1}, {ws_uri:"host2", weight:0}]
       *  Array of Objects and Strings: [{ws_uri:"host1"}, "host2"]
       */
      if (typeof ws_servers === 'string') {
        ws_servers = [{
          ws_uri: ws_servers
        }];
      } else if (ws_servers instanceof Array) {
        length = ws_servers.length;
        for (idx = 0; idx < length; idx++) {
          if (typeof ws_servers[idx] === 'string') {
            ws_servers[idx] = {
              ws_uri: ws_servers[idx]
            };
          }
        }
      } else {
        return;
      }

      if (ws_servers.length === 0) {
        return false;
      }

      length = ws_servers.length;
      for (idx = 0; idx < length; idx++) {
        if (!ws_servers[idx].ws_uri) {
          this.logger.error('missing "ws_uri" attribute in ws_servers parameter');
          return;
        }
        if (ws_servers[idx].weight && !Number(ws_servers[idx].weight)) {
          this.logger.error('"weight" attribute in ws_servers parameter must be a Number');
          return;
        }

        url = Grammar.parse(ws_servers[idx].ws_uri, 'absoluteURI');

        if (url === -1) {
          this.logger.error('invalid "ws_uri" attribute in ws_servers parameter: ' + ws_servers[idx].ws_uri);
          return;
        } else if (url.scheme !== 'wss' && url.scheme !== 'ws') {
          this.logger.error('invalid URI scheme in ws_servers parameter: ' + url.scheme);
          return;
        } else {
          ws_servers[idx].sip_uri = '<sip:' + url.host + (url.port ? ':' + url.port : '') + ';transport=ws;lr>';

          if (!ws_servers[idx].weight) {
            ws_servers[idx].weight = 0;
          }

          ws_servers[idx].status = 0;
          ws_servers[idx].scheme = url.scheme.toUpperCase();
        }
      }
      return ws_servers;
    }
  },

  optional: {

    authorization_user: function(authorization_user) {
      if (Grammar.parse('"' + authorization_user + '"', 'quoted_string') === -1) {
        return;
      } else {
        return authorization_user;
      }
    },

    connection_recovery_max_interval: function(connection_recovery_max_interval) {
      var value;
      if (Utils.isDecimal(connection_recovery_max_interval)) {
        value = Number(connection_recovery_max_interval);
        if (value > 0) {
          return value;
        }
      }
    },

    connection_recovery_min_interval: function(connection_recovery_min_interval) {
      var value;
      if (Utils.isDecimal(connection_recovery_min_interval)) {
        value = Number(connection_recovery_min_interval);
        if (value >= 0) {
          return value;
        }
      }
    },

    display_name: function(display_name) {
      if (Grammar.parse('"' + display_name + '"', 'display_name') === -1) {
        return;
      } else {
        return display_name;
      }
    },

    hack_via_tcp: function(hack_via_tcp) {
      if (typeof hack_via_tcp === 'boolean') {
        return hack_via_tcp;
      }
    },

    hack_via_ws: function(hack_via_ws) {
      if (typeof hack_via_ws === 'boolean') {
        return hack_via_ws;
      }
    },

    hack_ip_in_contact: function(hack_ip_in_contact) {
      if (typeof hack_ip_in_contact === 'boolean') {
        return hack_ip_in_contact;
      }
    },

    enable_ims: function(enable_ims) {
      if (typeof enable_ims === 'boolean') {
        return enable_ims;
      }
    },

    ws_server_reconnection_timeout: function(ws_server_reconnection_timeout) {
      var value;
      if (Utils.isDecimal(ws_server_reconnection_timeout)) {
        value = Number(ws_server_reconnection_timeout);
        if (value >= 0) {
          return value;
        }
      }
    },

    max_transport_recovery_attempts: function(max_transport_recovery_attempts) {
      var value;
      if (Utils.isDecimal(max_transport_recovery_attempts)) {
        value = Number(max_transport_recovery_attempts);
        if (value >= 0) {
          return value;
        }
      }
    },

    p_asserted_identity: function(p_asserted_identity) {
      return String(p_asserted_identity);
    },

    enable_datachannel: function(enable_datachannel) {
      if (typeof enable_datachannel === 'boolean') {
        return enable_datachannel;
      }
    },

    instance_id: function(instance_id) {
      if ((/^uuid:/i.test(instance_id))) {
        instance_id = instance_id.substr(5);
      }

      if (Grammar.parse(instance_id, 'uuid') === -1) {
        return;
      } else {
        return instance_id;
      }
    },

    no_answer_timeout: function(no_answer_timeout) {
      var value;
      if (Utils.isDecimal(no_answer_timeout)) {
        value = Number(no_answer_timeout);
        if (value > 0) {
          return value;
        }
      }
    },

    node_ws_options: function(node_ws_options) {
      return (typeof node_ws_options === 'object') ? node_ws_options : {};
    },

    password: function(password) {
      return String(password);
    },

    register: function(register) {
      if (typeof register === 'boolean') {
        return register;
      }
    },

    register_expires: function(register_expires) {
      var value;
      if (Utils.isDecimal(register_expires)) {
        value = Number(register_expires);
        if (value > 0) {
          return value;
        }
      }
    },

    registrar_server: function(registrar_server) {
      var parsed;

      if (!/^sip:/i.test(registrar_server)) {
        registrar_server = ExSIP_C.SIP + ':' + registrar_server;
      }
      parsed = URI.parse(registrar_server);

      if (!parsed) {
        return;
      } else if (parsed.user) {
        return;
      } else {
        return parsed;
      }
    },

    stun_servers: function(stun_servers) {
      var idx, length, stun_server;

      if (typeof stun_servers === 'string') {
        stun_servers = [stun_servers];
      } else if (!(stun_servers instanceof Array)) {
        return;
      }

      length = stun_servers.length;
      for (idx = 0; idx < length; idx++) {
        stun_server = stun_servers[idx];
        if (!(/^stuns?:/.test(stun_server))) {
          stun_server = 'stun:' + stun_server;
        }

        if (Grammar.parse(stun_server, 'stun_URI') === -1) {
          return;
        } else {
          stun_servers[idx] = stun_server;
        }
      }
      return stun_servers;
    },

    trace_sip: function(trace_sip) {
      if (typeof trace_sip === 'boolean') {
        return trace_sip;
      }
    },

    turn_servers: function(turn_servers) {
      var idx, idx2, length, length2, turn_server, url;

      if (!turn_servers instanceof Array) {
        turn_servers = [turn_servers];
      }

      length = turn_servers.length;
      for (idx = 0; idx < length; idx++) {
        turn_server = turn_servers[idx];

        // Backward compatibility:
        //Allow defining the turn_server 'urls' with the 'server' property.
        if (turn_server.server) {
          turn_server.urls = [turn_server.server];
        }

        // Backward compatibility:
        //Allow defining the turn_server 'credential' with the 'password' property.
        if (turn_server.password) {
          turn_server.credential = [turn_server.password];
        }

        if (!turn_server.urls || !turn_server.username || !turn_server.credential) {
          return;
        }

        if (!(turn_server.urls instanceof Array)) {
          turn_server.urls = [turn_server.urls];
        }

        length2 = turn_server.urls.length;
        for (idx2 = 0; idx2 < length2; idx2++) {
          url = turn_server.urls[idx2];

          if (!(/^turns?:/.test(url))) {
            url = 'turn:' + url;
          }

          if (Grammar.parse(url, 'turn_URI') === -1) {
            return;
          }
        }
      }
      return turn_servers;
    },

    use_preloaded_route: function(use_preloaded_route) {
      if (typeof use_preloaded_route === 'boolean') {
        return use_preloaded_route;
      }
    }
  }
};