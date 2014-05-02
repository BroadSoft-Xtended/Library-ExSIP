/**
 * @fileoverview SIP User Agent
 */


/**
 * @augments ExSIP
 * @class Class creating a SIP User Agent.
 */
(function(ExSIP) {
    var UA,
        logger = new ExSIP.Logger(ExSIP.name +' | '+ 'UA'),
        C = {
            // UA status codes
            STATUS_INIT :                0,
            STATUS_READY:                1,
            STATUS_USER_CLOSED:          2,
            STATUS_NOT_READY:            3,

            // UA error codes
            CONFIGURATION_ERROR:  1,
            NETWORK_ERROR:        2,

            /* UA events and corresponding SIP Methods.
             * Dynamically added to 'Allow' header field if the
             * corresponding event handler is set.
             */
            EVENT_METHODS: {
                'newRTCSession': 'INVITE',
                'newMessage': 'MESSAGE'
            },

            ALLOWED_METHODS: [
                'ACK',
                'CANCEL',
                'BYE',
                'OPTIONS'
            ],

            ACCEPTED_BODY_TYPES: [
                'application/sdp',
                'application/dtmf-relay'
            ],

            SUPPORTED: 'path, outbound, gruu',

            MAX_FORWARDS: 69,
            TAG_LENGTH: 10
        };

    UA = function(configuration) {
        var events = [
            'connected',
            'disconnected',
            'registered',
            'unregistered',
            'registrationFailed',
            'newRTCSession',
            'newMessage',
            'onReInvite'
        ];

        // Set Accepted Body Types
        C.ACCEPTED_BODY_TYPES = C.ACCEPTED_BODY_TYPES.toString();

        this.cache = {
            credentials: {}
        };

        this.configuration = {};
        this.dialogs = {};
        this.registrator = null;

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

        this.transportRecoverAttempts = 0;
        this.rtcMediaHandlerOptions = {};
        this.localMedia = null;
        this.usedServers = [];
        /**
         * Load configuration
         *
         * @throws {ExSIP.Exceptions.ConfigurationError}
         * @throws {TypeError}
         */

        if(configuration === undefined) {
            throw new TypeError('Not enough arguments');
        }

        try {
            this.loadConfig(configuration);
            this.initEvents(events);
        } catch(e) {
            this.status = C.STATUS_NOT_READY;
            this.error = C.CONFIGURATION_ERROR;
            throw e;
        }
    };
    UA.prototype = new ExSIP.EventEmitter();

//=================
//  High Level API
//=================
    UA.prototype.isDebug = function() {
      return this.configuration.trace_sip === true;
    };

    /**
     * Register.
     *
     *
     */
    UA.prototype.register = function(options) {
        this.configuration.register = true;
        this.registrator.register(options);
    };

    /**
     * Unregister.
     *
     * @param {Boolean} [all] unregister all user bindings.
     *
     */
    UA.prototype.unregister = function(options) {
        this.configuration.register = false;
        this.registrator.unregister(options);
    };

    /**
     * Registration state.
     * @param {Boolean}
        */
    UA.prototype.isRegistered = function() {
        if(this.registrator && this.registrator.registered) {
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
        if(this.transport) {
            return this.transport.connected;
        } else {
            return false;
        }
    };

    /**
     * Make an outgoing call.
     *
     * @param {String} target
     * @param {Object} views
     * @param {Object} [options]
     *
     * @throws {TypeError}
     *
     */
    UA.prototype.call = function(target, options) {
      var session;

      logger.log('options : '+ExSIP.Utils.toString(options), this);
      session = new ExSIP.RTCSession(this);
      session.connect(target, options);
      return session;
    };

    UA.prototype.transfer = function(transferTarget, sessionToTransfer, options) {
      var self = this;
      logger.log('transfer options : '+ExSIP.Utils.toString(options), this);
      try {
        transferTarget = ExSIP.Utils.normalizeURI(transferTarget, this.configuration.hostport_params);
      } catch(e) {
        sessionToTransfer.failed('local', null, ExSIP.C.causes.INVALID_TARGET);
        logger.warn("invalid transfer target", this);
        return;
      }

      var holdFailed = function(){
        logger.log("transfer : hold failed", self);
      };

      var holdSuccess = function(){
        logger.log("transfer : hold success - sending refer to transferee", self);
        self.sendReferBasic(sessionToTransfer, transferTarget, options);
      };

      logger.log("transfer : holding session to transfer", self);
      sessionToTransfer.hold(holdSuccess, holdFailed);
    };

    UA.prototype.attendedTransfer = function(transferTarget, sessionToTransfer, options) {
      var self = this;
      logger.log('attended transfer options : '+ExSIP.Utils.toString(options), this);
      try {
        transferTarget = ExSIP.Utils.normalizeURI(transferTarget, this.configuration.hostport_params);
      } catch(e) {
        sessionToTransfer.failed('local', null, ExSIP.C.causes.INVALID_TARGET);
        logger.warn("invalid transfer target", this);
        return;
      }


      var targetSession = self.newSession(options);
      targetSession.rtcMediaHandler.copy(sessionToTransfer.rtcMediaHandler);

      var holdTargetSuccess = function(){
        logger.log("transfer : hold target success - sending attended refer", self);
        self.sendReferAttended(sessionToTransfer, targetSession, transferTarget, options);
      };

      var holdTargetFailed = function(){
        logger.log("transfer : hold target failed", self);
      };

      var sendTargetInviteSuccess = function(){
        logger.log("transfer : send invite to target success - putting target on hold", self);
        targetSession.hold(holdTargetSuccess, holdTargetFailed);
      };

      var sendTargetInviteFailed = function(response){
        logger.log("transfer : send invite to target failed - sending basic refer", self);
        if(response.status_code === 420) {
          self.sendReferBasic(sessionToTransfer, transferTarget, options);
        }
      };

      var holdFailed = function(){
        logger.log("transfer : hold failed", self);
      };

      var holdSuccess = function(){
        logger.log("transfer : hold success - sending invite to target", self);
        targetSession.sendInviteRequest(transferTarget, {extraHeaders: ["Require: replaces"]},
          sendTargetInviteSuccess, sendTargetInviteFailed);
      };

      logger.log("transfer : holding session to transfer", self);
      sessionToTransfer.hold(holdSuccess, holdFailed);
    };

    UA.prototype.sendReferAttended = function(sessionToTransfer, targetSession, transferTarget, options) {
      var referSession = this.getReferSession(sessionToTransfer, options);
      options = this.getReferOptions(sessionToTransfer, targetSession, options);
      var referTo = "<"+(transferTarget).toString()+
        "?Replaces="+targetSession.dialog.id.call_id+
        "%3Bto-tag%3D"+targetSession.dialog.id.remote_tag+
        "%3Bfrom-tag%3D"+targetSession.dialog.id.local_tag+">";
      options.extraHeaders.push('Refer-To: '+referTo);
      referSession.sendReferRequest(sessionToTransfer, options);
    };

    UA.prototype.processRefer = function(sessionToTransfer, referRequest) {
      var self = this;
      referRequest.reply(202);
      var inviteSuccess = function() {
        sessionToTransfer.sendNotifyRequest({sdp: "SIP/2.0 200 OK", subscriptionState: "terminated;reason=noresource"});
      };
      var inviteFailure = function(response) {
        var status = response.status_code + " " + response.reason_phrase;
        logger.log("Invite failed : "+status);
        sessionToTransfer.sendNotifyRequest({sdp: "SIP/2.0 "+status, subscriptionState: "terminated;reason=noresource"});
      };
      var notifySuccess = function() {
        var referTo = referRequest.getHeader('Refer-To');
        referTo = ExSIP.Utils.stripSip(referTo);
        var referToParts = referTo.split("?");
        var target = referToParts[0];
        logger.log("Notify successful - sending INVITE to transfer target : "+target);
        var options = {};
        if(referToParts.length > 1) {
          options["extraHeaders"] = ExSIP.Utils.getHeadersFromQuery(referToParts[1]);
        }
        var transferTargetSession = self.newSession({copy: sessionToTransfer.rtcMediaHandler});
        transferTargetSession.sendInviteRequest(target, options, inviteSuccess, inviteFailure);
      };
      var notifyFailure = function() {
        logger.log("Notify failed");
      };
      sessionToTransfer.sendNotifyRequest({sdp: "SIP/2.0 100 Trying"}, notifySuccess, notifyFailure);
    };

    UA.prototype.sendReferBasic = function(sessionToTransfer, transferTarget, options) {
      var referSession = this.getReferSession(sessionToTransfer, options);
      options = this.getReferOptions(sessionToTransfer, sessionToTransfer, options);
      options.extraHeaders.push('Refer-To: <' + transferTarget + '>');
      referSession.sendReferRequest(sessionToTransfer, options);
    };

    UA.prototype.getReferOptions = function(sessionToTransfer, targetDialogSession, options) {
      options = options || {};
      options.extraHeaders = options.extraHeaders || [];
      if(sessionToTransfer.supports("tdialog")) {
        options.extraHeaders.push('Require: tdialog');
        var localTag = targetDialogSession.dialog.isUAS() ? targetDialogSession.dialog.id.remote_tag : targetDialogSession.dialog.id.local_tag;
        var remoteTag = targetDialogSession.dialog.isUAS() ? targetDialogSession.dialog.id.local_tag : targetDialogSession.dialog.id.remote_tag;
        var targetDialog = targetDialogSession.dialog.id.call_id+";local-tag="+localTag+";remote-tag="+remoteTag;
        options.extraHeaders.push('Target-Dialog: '+targetDialog);
      }
      return options;
    };

    UA.prototype.getReferSession = function(sessionToTransfer, options) {
      if(sessionToTransfer.supports("tdialog")) {
        return this.newSession(options);
      } else {
        logger.warn('tdialog not supported - sending refer in same session : '+sessionToTransfer.id, this);
        return sessionToTransfer;
      }
    };

    UA.prototype.newSession = function(options) {
      var session = new ExSIP.RTCSession(this);
      session.initRtcMediaHandler(options);
      return session;
    };

    UA.prototype.getUserMedia = function(options, success, failure, force) {
      if(!force && this.localMedia) {
        return this.localMedia;
      }

      if(this.localMedia) {
        logger.log("stopping existing local media stream", this);
        this.localMedia.stop();
      }

      logger.log('options : '+ExSIP.Utils.toString(options), this);
      var self = this;
      var constraints = options.mediaConstraints || {audio: true, video: true};
      ExSIP.WebRTC.getUserMedia(constraints,
        function(stream) {
          logger.log('got local media stream', self);
          self.localMedia = stream;
          success(stream);
        },
        function(e) {
          logger.error('unable to get user media');
          logger.error(e);
          failure(e);
        }
      );
    };

    /**
     * Send a message.
     *
     * @param {String} target
     * @param {String} body
     * @param {Object} [options]
     *
     * @throws {TypeError}
     *
     */
    UA.prototype.sendMessage = function(target, body, options) {
        var message;

        message = new ExSIP.Message(this);
        message.send(target, body, options);
    };

    /**
     * Gracefully close.
     *
     */
    UA.prototype.stop = function() {
        var session, applicant,
            ua = this;

        logger.log('user requested closure...', this);

        if(this.status === C.STATUS_USER_CLOSED) {
            logger.warn('UA already closed', this);
            return;
        }

        // Close registrator
        if(this.registrator) {
            logger.log('closing registrator', this);
            this.registrator.close();
        }

        // Run  _terminate_ on every Session
        for(session in this.sessions) {
            logger.log('closing session ' + session, this);
            this.sessions[session].terminate();
        }

        // Run  _close_ on every applicant
        for(applicant in this.applicants) {
            this.applicants[applicant].close();
        }

        this.status = C.STATUS_USER_CLOSED;
        var transport = ua.transport;
        this.shutdownGraceTimer = window.setTimeout(
            function() { transport.disconnect(); },
            '5000'
        );
    };

    /**
     * Connect to the WS server if status = STATUS_INIT.
     * Resume UA after being closed.
     *
     */
    UA.prototype.start = function() {
        var server;

        logger.log('user requested startup...', this);

        if (this.status === C.STATUS_INIT) {
            server = this.getNextWsServer({force: true});
            new ExSIP.Transport(this, server);
        } else if(this.status === C.STATUS_USER_CLOSED) {
            logger.log('resuming', this);
            this.status = C.STATUS_READY;
            this.transport.connect();
        } else if (this.status === C.STATUS_READY) {
            logger.log('UA is in READY status, not resuming', this);
        } else {
            logger.error('Connection is down. Auto-Recovery system is trying to connect');
        }
    };

    UA.prototype.setRtcMediaHandlerOptions = function(rtcMediaHandlerOptions) {
        this.rtcMediaHandlerOptions = rtcMediaHandlerOptions;
    };

    UA.prototype.reuseLocalMedia = function() {
        return this.rtcMediaHandlerOptions ? this.rtcMediaHandlerOptions["reuseLocalMedia"] : false;
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


//==========================
// Event Handlers
//==========================

    /**
     * Transport Close event.
     * @private
     * @event
     * @param {ExSIP.Transport} transport.
     */
    UA.prototype.onTransportClosed = function(transport) {
        // Run _onTransportError_ callback on every client transaction using _transport_
        var type, idx, length,
            client_transactions = ['nict', 'ict', 'nist', 'ist'];

        transport.server.status = ExSIP.Transport.C.STATUS_DISCONNECTED;
        logger.log('connection state set to '+ ExSIP.Transport.C.STATUS_DISCONNECTED, this);

        length = client_transactions.length;
        for (type = 0; type < length; type++) {
            for(idx in this.transactions[client_transactions[type]]) {
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
     * @param {ExSIP.Transport} transport.
     */
    UA.prototype.onTransportError = function(transport, options) {
        options = options || {};
        if(this.status === C.STATUS_USER_CLOSED){
          return;
        }

        logger.log('transport ' + transport.server.ws_uri + ' failed | connection state set to '+ ExSIP.Transport.C.STATUS_ERROR, this);

        // Close sessions.
        //Mark this transport as 'down' and try the next one
        transport.server.status = ExSIP.Transport.C.STATUS_ERROR;

        this.closeSessionsOnTransportError();
        if (!this.error || this.error !== C.NETWORK_ERROR) {
          this.status = C.STATUS_NOT_READY;
          this.error = C.NETWORK_ERROR;
        }
        // Transport Recovery process
        this.recoverTransport(options);

        var data = ExSIP.Utils.merge_options({
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
     * @param {ExSIP.Transport} transport.
     */
    UA.prototype.onTransportConnected = function(transport) {
        this.transport = transport;

        // Reset transport recovery counter
        this.transportRecoverAttempts = 0;

        transport.server.status = ExSIP.Transport.C.STATUS_READY;
        logger.log('connection state set to '+ ExSIP.Transport.C.STATUS_READY, this);

        if(this.status === C.STATUS_USER_CLOSED) {
            return;
        }

        this.status = C.STATUS_READY;
        this.error = null;
        this.emit('connected', this, {
            transport: transport
        });

        if(this.configuration.register) {
            if(this.registrator) {
                this.registrator.onTransportConnected();
            } else {
                this.registrator = new ExSIP.Registrator(this, transport);
                this.register();
            }
        } else if (!this.registrator) {
            this.registrator = new ExSIP.Registrator(this, transport);
        }
    };

//=========================
// receiveRequest
//=========================

    /**
     * Request reception
     * @private
     * @param {ExSIP.IncomingRequest} request.
     */
    UA.prototype.receiveRequest = function(request) {
        var dialog, session, message,
            method = request.method;

      // Check that Ruri points to us
        if(request.ruri.user !== this.configuration.uri.user && request.ruri.user !== this.contact.uri.user) {
            logger.warn('Request-URI ('+request.ruri.user+') does not point to us ('+this.configuration.uri.user+')', this);
            if (request.method !== ExSIP.C.ACK) {
                request.reply_sl(404);
            }
            return;
        }

        // Check transaction
        if(ExSIP.Transactions.checkTransaction(this, request)) {
            logger.warn('Check Transaction failed', this);
            return;
        }

        // Create the server transaction
        if(method === ExSIP.C.INVITE) {
            new ExSIP.Transactions.InviteServerTransaction(request, this);
        } else if(method !== ExSIP.C.ACK) {
            new ExSIP.Transactions.NonInviteServerTransaction(request, this);
        }

        /* RFC3261 12.2.2
         * Requests that do not change in any way the state of a dialog may be
         * received within a dialog (for example, an OPTIONS request).
         * They are processed as if they had been received outside the dialog.
         */
        if(method === ExSIP.C.OPTIONS) {
            request.reply(200, null, [
                'Allow: '+ ExSIP.Utils.getAllowedMethods(this),
                'Accept: '+ C.ACCEPTED_BODY_TYPES
            ]);
        } else if (method === ExSIP.C.MESSAGE) {
            if (!this.checkEvent('newMessage') || this.listeners('newMessage').length === 0) {
                request.reply(405, null, ['Allow: '+ ExSIP.Utils.getAllowedMethods(this)]);
                return;
            }
            message = new ExSIP.Message(this);
            message.init_incoming(request);
        }

        // Initial Request
        if(!request.to_tag) {
            /*if(!this.isRegistered()) {
             // High user does not want to be contacted
             request.reply(410);
             return;
             }*/

            switch(method) {
                case ExSIP.C.INVITE:
                    if(ExSIP.WebRTC.isSupported) {
                        logger.debug('INVITE received', this);
                        session = new ExSIP.RTCSession(this);
                        session.init_incoming(request);
                    } else {
                        logger.warn('INVITE received but WebRTC is not supported', this);
                        request.reply(488);
                    }
                    break;
                case ExSIP.C.BYE:
                    // Out of dialog BYE received
                    request.reply(481);
                    break;
                case ExSIP.C.CANCEL:
                    session = this.findSession(request);
                    if(session) {
                        session.receiveRequest(request);
                    } else {
                        logger.warn('received CANCEL request for a non existent session', this);
                    }
                    break;
                case ExSIP.C.ACK:
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

            if(dialog) {
                dialog.receiveRequest(request);
            } else if (method === ExSIP.C.NOTIFY) {
                session = this.findSession(request);
                if(session) {
                  logger.log('received NOTIFY request for session : '+session.id, this);
                  session.receiveRequest(request);
                } else {
                    logger.warn('received NOTIFY request for a non existent session', this);
                    logger.log('request : '+(request.call_id + "-" + request.from_tag + "-" + request.to_tag), this);
                    logger.log('sessions : '+Object.keys(this.sessions), this);
                    request.reply(481, 'Subscription does not exist');
                }
            }
            /* RFC3261 12.2.2
             * Request with to tag, but no matching dialog found.
             * Exception: ACK for an Invite request for which a dialog has not
             * been created.
             */
            else {
                if(method !== ExSIP.C.ACK) {
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
     * @param {ExSIP.IncomingRequest} request.
     * @returns {ExSIP.OutgoingSession|ExSIP.IncomingSession|null}
     */
    UA.prototype.findSession = function(request) {
        var
            sessionIDa = request.call_id + request.from_tag,
            sessionA = this.sessions[sessionIDa],
            sessionIDb = request.call_id + request.to_tag,
            sessionB = this.sessions[sessionIDb];

        if(sessionA) {
            return sessionA;
        } else if(sessionB) {
            return sessionB;
        } else {
            return null;
        }
    };

    /**
     * Get the dialog to which the request belongs to, if any.
     * @private
     * @param {ExSIP.IncomingRequest}
        * @returns {ExSIP.Dialog|null}
     */
    UA.prototype.findDialog = function(request) {
        var
            id = request.call_id + request.from_tag + request.to_tag,
            dialog = this.dialogs[id];

        if(dialog) {
            return dialog;
        } else {
            id = request.call_id + request.to_tag + request.from_tag;
            dialog = this.dialogs[id];
            if(dialog) {
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
      if(options.force && this.usedServers.length >= this.configuration.ws_servers.length) {
        this.usedServers = [];
      }

      var candidates = [];
      var totalWeight = 0;
      // Add only server with status ready and not already used
      for(var i=0; i < this.configuration.ws_servers.length; i++){
        var server = this.configuration.ws_servers[i];
        if(server.status === ExSIP.Transport.C.STATUS_READY && this.usedServers.indexOf(server) === -1) {
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
      var index = Math.min(randomNumber, weightedServers.length-1);
      return weightedServers[index];
    };

    /**
     * Close all sessions on transport error.
     * @private
     */
    UA.prototype.closeSessionsOnTransportError = function() {
        var idx;

        // Run _transportError_ for every Session
        for(idx in this.sessions) {
            this.sessions[idx].onTransportError();
        }
        // Call registrator _onTransportClosed_
        if(this.registrator){
            this.registrator.onTransportClosed();
        }
    };

    UA.prototype.retry = function(nextRetry, server) {
      var self = this;
      var retryCallback = function(){
        new ExSIP.Transport(self, server);
      };

      if(nextRetry === 0) {
        retryCallback();
      } else {
        window.setTimeout(retryCallback, nextRetry * 1000);
      }
    };

    UA.prototype.recoverTransport = function(options) {
        var idx, length, k, nextRetry, count, server;

        options = options || {};
        count = this.transportRecoverAttempts;

        length = this.configuration.ws_servers.length;
        for (idx = 0; idx < length; idx++) {
          this.configuration.ws_servers[idx].status = ExSIP.Transport.C.STATUS_READY;
        }

        server = this.getNextWsServer();
        if(options.code === 503 && !server) {
          delete options.retryAfter;
          logger.log('non-failover on 503 error - skipping recoverTransport', this);
          return;
        }

        var maxTransportRecoveryAttempts = this.configuration.max_transport_recovery_attempts;
        if(typeof(maxTransportRecoveryAttempts) !== "undefined" && count >= parseInt(maxTransportRecoveryAttempts, 10)) {
          delete options.retryAfter;
          logger.log('recover attempts '+count+" exceed max transport recovery attempts "+maxTransportRecoveryAttempts+" - skipping recoverTransport");
          return;
        }

        if(server) {
          logger.log('failover - new connection attempt with '+server.ws_uri);
          this.retry(0, server);
          return;
        }

        if(options.retryAfter){
          nextRetry = options.retryAfter;
        } else {
          k = Math.floor((Math.random() * Math.pow(2,count)) +1);
          nextRetry = k * this.configuration.connection_recovery_min_interval;

          if (nextRetry > this.configuration.connection_recovery_max_interval) {
            logger.log('time for next connection attempt exceeds connection_recovery_max_interval, resetting counter', this);
            nextRetry = this.configuration.connection_recovery_min_interval;
            count = 0;
          }
        }

        server = this.getNextWsServer({force: true});
        logger.log('resetting ws server list - next connection attempt in '+ nextRetry +' seconds to '+server.ws_uri, this);
        this.transportRecoverAttempts = count + 1;
        this.retry(nextRetry, server, count);
    };

    /**
     * Configuration load.
     * @private
     * returns {Boolean}
     */
    UA.prototype.loadConfig = function(configuration) {
        // Settings and default values
        var parameter, value, checked_value, hostport_params, registrar_server,
            settings = {
                /* Host address
                 * Value to be set in Via sent_by and host part of Contact FQDN
                 */
                via_host: ExSIP.Utils.createRandomToken(12) + '.invalid',

                // Password
                password: null,


                // Registration parameters
                register_expires: 600,
                register_min_expires: 120,
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
                enable_ims: false,
                hack_via_tcp: false,
                hack_ip_in_contact: false
            };

        // Pre-Configuration

        // Check Mandatory parameters
        for(parameter in UA.configuration_check.mandatory) {
            if(!configuration.hasOwnProperty(parameter)) {
                throw new ExSIP.Exceptions.ConfigurationError(parameter);
            } else {
                value = configuration[parameter];
                checked_value = UA.configuration_check.mandatory[parameter](value);
                if (checked_value !== undefined) {
                    settings[parameter] = checked_value;
                } else {
                    throw new ExSIP.Exceptions.ConfigurationError(parameter, value);
                }
            }
        }

        // Check Optional parameters
        for(parameter in UA.configuration_check.optional) {
            if(configuration.hasOwnProperty(parameter)) {
                value = configuration[parameter];

                // If the parameter value is null, empty string or undefined then apply its default value.
                if(value === null || value === "" || value === undefined) { continue; }
                // If it's a number with NaN value then also apply its default value.
                // NOTE: JS does not allow "value === NaN", the following does the work:
                else if(typeof(value) === 'number' && window.isNaN(value)) { continue; }

                checked_value = UA.configuration_check.optional[parameter](value);
                if (checked_value !== undefined) {
                    settings[parameter] = checked_value;
                } else {
                    throw new ExSIP.Exceptions.ConfigurationError(parameter, value);
                }
            }
        }

        // Sanity Checks

        // Connection recovery intervals
        if(settings.connection_recovery_max_interval < settings.connection_recovery_min_interval) {
            throw new ExSIP.Exceptions.ConfigurationError('connection_recovery_max_interval', settings.connection_recovery_max_interval);
        }

        // Post Configuration Process

        // Allow passing 0 number as display_name.
        if (settings.display_name === 0) {
            settings.display_name = '0';
        }

        // Instance-id for GRUU
        settings.instance_id = ExSIP.Utils.newUUID();

        // exsip_id instance parameter. Static random tag of length 5
        settings.exsip_id = ExSIP.Utils.createRandomToken(5);

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
            settings.via_host = ExSIP.Utils.getRandomTestNetIP();
        }

        this.contact = {
            pub_gruu: null,
            temp_gruu: null,
            uri: new ExSIP.URI('sip', ExSIP.Utils.createRandomToken(8), settings.via_host, null, {transport: 'ws'}),
            toString: function(options){
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

                if (outbound) {
                    contact += ';ob';
                }

                contact += '>';

                return contact;
            }
        };

        // Fill the value of the configuration_skeleton
        var debug = settings['trace_sip'] === true;
        if(debug) {
          logger.log('configuration parameters after validation:');
        }
        for(parameter in settings) {
            if(debug) {
              switch(parameter) {
                  case 'uri':
                  case 'registrar_server':
                      logger.log('· ' + parameter + ': ' + settings[parameter]);
                      break;
                  case 'password':
                      logger.log('· ' + parameter + ': ' + 'NOT SHOWN');
                      break;
                  default:
                      logger.log('· ' + parameter + ': ' + window.JSON.stringify(settings[parameter]));
              }
            }
            UA.configuration_skeleton[parameter].value = settings[parameter];
        }

        Object.defineProperties(this.configuration, UA.configuration_skeleton);

        // Clean UA.configuration_skeleton
        for(parameter in settings) {
            UA.configuration_skeleton[parameter].value = '';
        }

        return;
    };


    /**
     * Configuration Object skeleton.
     * @private
     */
    UA.configuration_skeleton = (function() {
        var idx,  parameter,
            skeleton = {},
            parameters = [
                // Internal parameters
                "instance_id",
                "exsip_id",
                "register_min_expires",
                "ws_server_max_reconnection",
                "hostport_params",

                // Mandatory user configurable parameters
                "uri",
                "ws_servers",

                // Optional user configurable parameters
                "authorization_user",
                "ws_server_reconnection_timeout",
                "connection_recovery_max_interval",
                "connection_recovery_min_interval",
                "max_transport_recovery_attempts",
                "display_name",
                "hack_via_tcp", // false.
                "enable_ims", // false.
                "hack_ip_in_contact", //false
                "no_answer_timeout", // 30 seconds.
                "password",
                "register_expires", // 600 seconds.
                "registrar_server",
                "stun_servers",
                "trace_sip",
                "turn_servers",
                "use_preloaded_route",

                // Post-configuration generated parameters
                "via_core_value",
                "via_host"
            ];

        for(idx in parameters) {
            parameter = parameters[idx];
            skeleton[parameter] = {
                value: '',
                writable: false,
                configurable: false
            };
        }

        skeleton['register'] = {
            value: '',
            writable: true,
            configurable: false
        };

        return skeleton;
    }());

    /**
     * Configuration checker.
     * @private
     * @return {Boolean}
     */
    UA.configuration_check = {
        mandatory: {

            uri: function(uri) {
                var parsed;

                if (!/^sip:/i.test(uri)) {
                    uri = ExSIP.C.SIP + ':' + uri;
                }
                parsed = ExSIP.URI.parse(uri);

                if(!parsed) {
                    return;
                } else if(!parsed.user) {
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
                    ws_servers = [{ws_uri: ws_servers}];
                } else if (ws_servers instanceof Array) {
                    length = ws_servers.length;
                    for (idx = 0; idx < length; idx++) {
                        if (typeof ws_servers[idx] === 'string'){
                            ws_servers[idx] = {ws_uri: ws_servers[idx]};
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
                        logger.error('missing "ws_uri" attribute in ws_servers parameter');
                        return;
                    }
                    if (ws_servers[idx].weight && !Number(ws_servers[idx].weight)) {
                        logger.error('"weight" attribute in ws_servers parameter must be a Number');
                        return;
                    }

                    url = ExSIP.Grammar.parse(ws_servers[idx].ws_uri, 'absoluteURI');

                    if(url === -1) {
                        logger.error('invalid "ws_uri" attribute in ws_servers parameter: ' + ws_servers[idx].ws_uri);
                        return;
                    } else if(url.scheme !== 'wss' && url.scheme !== 'ws') {
                        logger.error('invalid URI scheme in ws_servers parameter: ' + url.scheme);
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
                if(ExSIP.Grammar.parse('"'+ authorization_user +'"', 'quoted_string') === -1) {
                    return;
                } else {
                    return authorization_user;
                }
            },

            connection_recovery_max_interval: function(connection_recovery_max_interval) {
                var value;
                if(ExSIP.Utils.isDecimal(connection_recovery_max_interval)) {
                    value = window.Number(connection_recovery_max_interval);
                    if(value > 0) {
                        return value;
                    }
                }
            },

            connection_recovery_min_interval: function(connection_recovery_min_interval) {
                var value;
                if(ExSIP.Utils.isDecimal(connection_recovery_min_interval)) {
                    value = window.Number(connection_recovery_min_interval);
                    if(value >= 0) {
                        return value;
                    }
                }
            },

            ws_server_reconnection_timeout: function(ws_server_reconnection_timeout) {
                var value;
                if(ExSIP.Utils.isDecimal(ws_server_reconnection_timeout)) {
                    value = window.Number(ws_server_reconnection_timeout);
                    if(value >= 0) {
                        return value;
                    }
                }
            },

            max_transport_recovery_attempts: function(max_transport_recovery_attempts) {
                var value;
                if(ExSIP.Utils.isDecimal(max_transport_recovery_attempts)) {
                    value = window.Number(max_transport_recovery_attempts);
                    if(value >= 0) {
                        return value;
                    }
                }
            },

            display_name: function(display_name) {
                if(ExSIP.Grammar.parse('"' + display_name + '"', 'display_name') === -1) {
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

            enable_ims: function(enable_ims) {
                if (typeof enable_ims === 'boolean') {
                    return enable_ims;
                }
            },

            hack_ip_in_contact: function(hack_ip_in_contact) {
                if (typeof hack_ip_in_contact === 'boolean') {
                    return hack_ip_in_contact;
                }
            },

            no_answer_timeout: function(no_answer_timeout) {
                var value;
                if (ExSIP.Utils.isDecimal(no_answer_timeout)) {
                    value = window.Number(no_answer_timeout);
                    if (value > 0) {
                        return value;
                    }
                }
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
                if (ExSIP.Utils.isDecimal(register_expires)) {
                    value = window.Number(register_expires);
                    if (value > 0) {
                        return value;
                    }
                }
            },

            registrar_server: function(registrar_server) {
                var parsed;

                if (!/^sip:/i.test(registrar_server)) {
                    registrar_server = ExSIP.C.SIP + ':' + registrar_server;
                }
                parsed = ExSIP.URI.parse(registrar_server);

                if(!parsed) {
                    return;
                } else if(parsed.user) {
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

                    if(ExSIP.Grammar.parse(stun_server, 'stun_URI') === -1) {
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
                var idx, length, turn_server;

                if (turn_servers instanceof Array) {
                    // Do nothing
                } else {
                    turn_servers = [turn_servers];
                }

                length = turn_servers.length;
                for (idx = 0; idx < length; idx++) {
                    turn_server = turn_servers[idx];
                    if (!turn_server.server || !turn_server.username || !turn_server.password) {
                        return;
                    } else if (!(/^turns?:/.test(turn_server.server))) {
                        turn_server.server = 'turn:' + turn_server.server;
                    }

                    if(ExSIP.Grammar.parse(turn_server.server, 'turn_URI') === -1) {
                        return;
                    } else if(ExSIP.Grammar.parse(turn_server.username, 'user') === -1) {
                        return;
                    } else if(ExSIP.Grammar.parse(turn_server.password, 'password') === -1) {
                        return;
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

    UA.C = C;
    ExSIP.UA = UA;
}(ExSIP));
