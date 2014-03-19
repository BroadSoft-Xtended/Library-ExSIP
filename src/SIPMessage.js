/**
 * @fileoverview SIP Message
 */

(function(ExSIP) {
var
  SIPMessage,
  OutgoingRequest,
  IncomingMessage,
  IncomingRequest,
  IncomingResponse,
  logger = new ExSIP.Logger(ExSIP.name +' | '+ 'SIP MESSAGE');

/**
 * @augments SIPMessage
 * @class Class for SIP messages.
 */
SIPMessage = function() {
  this.headers = {};
};

SIPMessage.prototype = {
  /**
   * Get the value of the given header name at the given position.
   * @param {String} name header name
   * @param {Number} [idx=0] header index
   * @returns {String|undefined} Returns the specified header, null if header doesn't exist.
   */
  getHeader: function(name, idx) {
    var header = this.headers[ExSIP.Utils.headerize(name)];

    idx = idx || 0;

    if(header) {
      if(header[idx]) {
        return header[idx].raw;
      }
    } else {
      return;
    }
  },

  /**
   * Get the header/s of the given name.
   * @param {String} name header name
   * @returns {Array} Array with all the headers of the specified name.
   */
  getHeaderAll: function(name) {
    var idx, length,
      header = this.headers[ExSIP.Utils.headerize(name)],
      result = [];

    if(!header) {
      return [];
    }

    length = header.length;
    for (idx = 0; idx < length; idx++) {
      result.push(header[idx].raw);
    }

    return result;
  },

  /**
   * Verify the existence of the given header.
   * @param {String} name header name
   * @returns {boolean} true if header with given name exists, false otherwise
   */
  hasHeader: function(name) {
    return(this.headers[ExSIP.Utils.headerize(name)]) ? true : false;
  },

  /**
   * Insert a header of the given name and value into the last position of the
   * header array.
   * @param {String} name header name
   * @param {String} value header value
   */
  addHeader: function(name, value) {
    var header = { raw: value };

    name = ExSIP.Utils.headerize(name);

    if(this.headers[name]) {
      this.headers[name].push(header);
    } else {
      this.headers[name] = [header];
    }
  },

  /**
   * Count the number of headers of the given header name.
   * @param {String} name header name
   * @returns {Number} Number of headers with the given name
   */
  countHeader: function(name) {
    var header = this.headers[ExSIP.Utils.headerize(name)];

    if(header) {
      return header.length;
    } else {
      return 0;
    }
  },

  /**
   * Parse the given header on the given index.
   * @param {String} name header name
   * @param {Number} [idx=0] header index
   * @returns {Object|undefined} Parsed header object, undefined if the header is not present or in case of a parsing error.
   */
  parseHeader: function(name, idx) {
    var header, value, parsed;

    name = ExSIP.Utils.headerize(name);

    idx = idx || 0;

    if(!this.headers[name]) {
      logger.log('header "' + name + '" not present', this.ua);
      return;
    } else if(idx >= this.headers[name].length) {
      logger.log('not so many "' + name + '" headers present', this.ua);
      return;
    }

    header = this.headers[name][idx];
    value = header.raw;

    if(header.parsed) {
      return header.parsed;
    }

    //substitute '-' by '_' for grammar rule matching.
    parsed = ExSIP.Grammar.parse(value, name.replace(/-/g, '_'));

    if(parsed === -1) {
      this.headers[name].splice(idx, 1); //delete from headers
      logger.warn('error parsing "' + name + '" header field with value "' + value + '"', this.ua);
      return;
    } else {
      header.parsed = parsed;
      return parsed;
    }
  },

  /**
   * Message Header attribute selector. Alias of parseHeader.
   * @param {String} name header name
   * @param {Number} [idx=0] header index
   * @returns {Object|undefined} Parsed header object, undefined if the header is not present or in case of a parsing error.
   *
   * @example
   * message.s('via',3).port
   */
  s: function(name, idx) {
    return this.parseHeader(name, idx);
  },

  /**
   * Replace the value of the given header by the value.
   * @param {String} name header name
   * @param {String} value header value
   */
  setHeader: function(name, value) {
    var header = { raw: value };
    this.headers[ExSIP.Utils.headerize(name)] = [header];
  }
};

  /**
 * @augments ExSIP
 * @class Class for outgoing SIP request.
 * @param {String} method request method
 * @param {String} ruri request uri
 * @param {ExSIP.UA} ua
 * @param {Object} params parameters that will have priority over ua.configuration parameters:
 * <br>
 *  - cseq, call_id, from_tag, from_uri, from_display_name, to_uri, to_tag, route_set
 * @param {Object} [headers] extra headers
 * @param {String} [body]
 */
OutgoingRequest = function(method, ruri, ua, params, extraHeaders, body) {
  SIPMessage.call(this);
  var
    to,
    from, fromName, fromTag,
    call_id,
    cseq;

  params = params || {};

  // Mandatory parameters check
  if(!method || !ruri || !ua) {
    return null;
  }

  this.ua = ua;
  this.method = method;
  this.ruri = ruri;
  this.body = body;
  this.extraHeaders = extraHeaders || [];

  // Fill the Common SIP Request Headers

  // Route
  if (params.route_set && params.route_set.toString() !== "") {
    this.setHeader('route', params.route_set);
  } else if (ua.configuration.use_preloaded_route){
    this.setHeader('route', ua.transport.server.sip_uri);
  }

  // Via
  // Empty Via header. Will be filled by the client transaction.
  this.setHeader('via', '');

  // Max-Forwards
  this.setHeader('max-forwards', ExSIP.UA.C.MAX_FORWARDS);

  // To
  to = (params.to_display_name || params.to_display_name === 0) ? '"' + params.to_display_name + '" ' : '';
  var toUri = (params.to_uri || ruri);
  to += '<' + (ua.configuration.enable_ims && toUri.isPhoneNumber() ? toUri +";user=phone" : toUri) + '>';
  to += params.to_tag ? ';tag=' + params.to_tag : '';
  this.to = new ExSIP.NameAddrHeader.parse(to);
  this.setHeader('to', to);

  // From
  if (params.from_display_name || params.from_display_name === 0) {
    fromName = '"' + params.from_display_name + '" ';
  } else if (ua.configuration.display_name) {
    fromName = '"' + ua.configuration.display_name + '" ';
  } else {
    fromName = '';
  }
  var fromUri = (params.from_uri || ua.configuration.uri);
  fromName += '<' + (ua.configuration.enable_ims && fromUri.isPhoneNumber() ? fromUri +";user=phone" : fromUri) + '>';
  fromTag = ';tag=' + (params.from_tag || ExSIP.Utils.newTag());
  from = fromName + fromTag;
  this.from = new ExSIP.NameAddrHeader.parse(from);
  this.setHeader('from', from);

  // Call-ID
  call_id = params.call_id || (ua.configuration.exsip_id + ExSIP.Utils.createRandomToken(15));
  this.call_id = call_id;
  this.setHeader('call-id', call_id);

  // CSeq
  cseq = params.cseq || Math.floor(Math.random() * 10000);
  this.cseq = cseq;
  this.setHeader('cseq', cseq + ' ' + method);

  // P-Preferred-Identity
  if(ua.configuration.enable_ims) {
    this.setHeader('P-Preferred-Identity', fromName);
  }
};

OutgoingRequest.prototype = new SIPMessage();

OutgoingRequest.prototype.toString = function() {
  var msg = '', header, length, idx;

  msg += this.method + ' ' + (this.ua.configuration.enable_ims && this.ruri.isPhoneNumber() ? this.ruri + ";user=phone" : this.ruri) + ' SIP/2.0\r\n';

  for (header in this.headers) {
    length = this.headers[header].length;
    for (idx = 0; idx < length; idx++) {
      msg += header + ': ' + this.headers[header][idx].raw + '\r\n';
    }
  }

  length = this.extraHeaders.length;
  for (idx = 0; idx < length; idx++) {
    msg += this.extraHeaders[idx] +'\r\n';
  }

  msg += 'Supported: ' +  ExSIP.UA.C.SUPPORTED +'\r\n';
  msg += 'User-Agent: ' + ExSIP.C.USER_AGENT +'\r\n';

  if(this.body) {
    length = ExSIP.Utils.str_utf8_length(this.body);
    msg += 'Content-Length: ' + length + '\r\n\r\n';
    msg += this.body;
  } else {
    msg += 'Content-Length: 0\r\n\r\n';
  }

  return msg;
};


  /**
 * @augments ExSIP
 * @class Class for incoming SIP message.
 */
IncomingMessage = function(){
  SIPMessage.call(this);
  this.data = null;
  this.method =  null;
  this.via = null;
  this.via_branch = null;
  this.call_id = null;
  this.cseq = null;
  this.from = null;
  this.from_tag = null;
  this.to = null;
  this.to_tag = null;
  this.body = null;
};

IncomingMessage.prototype.toString = function(){
  return this.data;
};
IncomingMessage.prototype = new SIPMessage();

  /**
 * @augments IncomingMessage
 * @class Class for incoming SIP request.
 */
IncomingRequest = function(ua) {
  IncomingMessage.call(this);
  this.ua = ua;
  this.ruri = null;
  this.transport = null;
  this.server_transaction = null;
};
IncomingRequest.prototype = new IncomingMessage();

/**
* Stateful reply.
* @param {Number} code status code
* @param {String} reason reason phrase
* @param {Object} headers extra headers
* @param {String} body body
* @param {Function} [onSuccess] onSuccess callback
* @param {Function} [onFailure] onFailure callback
*/
IncomingRequest.prototype.reply = function(code, reason, extraHeaders, body, onSuccess, onFailure) {
  var rr, vias, length, idx, response,
    to = this.getHeader('To'),
    r = 0,
    v = 0;

  code = code || null;
  reason = reason || null;

  // Validate code and reason values
  if (!code || (code < 100 || code > 699)) {
    throw new TypeError('Invalid status_code: '+ code);
  } else if (reason && typeof reason !== 'string' && !(reason instanceof String)) {
    throw new TypeError('Invalid reason_phrase: '+ reason);
  }

  reason = reason || ExSIP.C.REASON_PHRASE[code] || '';
  extraHeaders = extraHeaders || [];

  response = 'SIP/2.0 ' + code + ' ' + reason + '\r\n';

  if(this.method === ExSIP.C.INVITE && code > 100 && code <= 200) {
    rr = this.countHeader('record-route');

    for(r; r < rr; r++) {
      response += 'Record-Route: ' + this.getHeader('record-route', r) + '\r\n';
    }
  }

  vias = this.countHeader('via');

  for(v; v < vias; v++) {
    response += 'Via: ' + this.getHeader('via', v) + '\r\n';
  }

  if(!this.to_tag && code > 100) {
    to += ';tag=' + ExSIP.Utils.newTag();
  } else if(this.to_tag && !this.s('to').hasParam('tag')) {
    to += ';tag=' + this.to_tag;
  }

  response += 'To: ' + to + '\r\n';
  response += 'From: ' + this.getHeader('From') + '\r\n';
  response += 'Call-ID: ' + this.call_id + '\r\n';
  response += 'CSeq: ' + this.cseq + ' ' + this.method + '\r\n';

  length = extraHeaders.length;
  for (idx = 0; idx < length; idx++) {
    response += extraHeaders[idx] +'\r\n';
  }

  if(body) {
    length = ExSIP.Utils.str_utf8_length(body);
    response += 'Content-Type: application/sdp\r\n';
    response += 'Content-Length: ' + length + '\r\n\r\n';
    response += body;
  } else {
    response += 'Content-Length: ' + 0 + '\r\n\r\n';
  }

  this.server_transaction.receiveResponse(code, response, onSuccess, onFailure);
};

/**
* Stateless reply.
* @param {Number} code status code
* @param {String} reason reason phrase
*/
IncomingRequest.prototype.reply_sl = function(code, reason) {
  var to, response,
    vias = this.countHeader('via');

  code = code || null;
  reason = reason || null;

  // Validate code and reason values
  if (!code || (code < 100 || code > 699)) {
    throw new TypeError('Invalid status_code: '+ code);
  } else if (reason && typeof reason !== 'string' && !(reason instanceof String)) {
    throw new TypeError('Invalid reason_phrase: '+ reason);
  }

  reason = reason || ExSIP.C.REASON_PHRASE[code] || '';

  response = 'SIP/2.0 ' + code + ' ' + reason + '\r\n';

  for(var v = 0; v < vias; v++) {
    response += 'Via: ' + this.getHeader('via', v) + '\r\n';
  }

  to = this.getHeader('To');

  if(!this.to_tag && code > 100) {
    to += ';tag=' + ExSIP.Utils.newTag();
  } else if(this.to_tag && !this.s('to').hasParam('tag')) {
    to += ';tag=' + this.to_tag;
  }

  response += 'To: ' + to + '\r\n';
  response += 'From: ' + this.getHeader('From') + '\r\n';
  response += 'Call-ID: ' + this.call_id + '\r\n';
  response += 'CSeq: ' + this.cseq + ' ' + this.method + '\r\n';
  response += 'Content-Length: ' + 0 + '\r\n\r\n';

  this.transport.send(response);
};

/**
 * @augments IncomingMessage
 * @class Class for incoming SIP response.
 */
IncomingResponse = function() {
  IncomingMessage.call(this);
  this.status_code = null;
  this.reason_phrase = null;
};
IncomingResponse.prototype = new IncomingMessage();

ExSIP.OutgoingRequest = OutgoingRequest;
ExSIP.IncomingRequest = IncomingRequest;
ExSIP.IncomingResponse = IncomingResponse;
}(ExSIP));
