module.exports = {
  OutgoingRequest: OutgoingRequest,
  IncomingRequest: IncomingRequest,
  IncomingResponse: IncomingResponse
};


/**
 * Dependencies.
 */
var ExSIP_C = require('./Constants');
var Utils = require('./Utils');
var NameAddrHeader = require('./NameAddrHeader');
var Grammar = require('./Grammar');


/**
 * -param {String} method request method
 * -param {String} ruri request uri
 * -param {UA} ua
 * -param {Object} params parameters that will have priority over ua.configuration parameters:
 * <br>
 *  - cseq, call_id, from_tag, from_uri, from_display_name, to_uri, to_tag, route_set
 * -param {Object} [headers] extra headers
 * -param {String} [body]
 */
function OutgoingRequest(method, ruri, ua, params, extraHeaders, body) {
  var
    to,
    from,
    call_id,
    cseq;

  params = params || {};

  // Mandatory parameters check
  if(!method || !ruri || !ua) {
    return null;
  }

  this.logger = ua.getLogger('ExSIP.sipmessage');
  this.ua = ua;
  this.headers = {};
  this.method = method;
  this.ruri = ruri;
  this.body = body;
  this.extraHeaders = extraHeaders && extraHeaders.slice() || [];

  // Fill the Common SIP Request Headers

  // Route
  if (params.route_set) {
    this.setHeader('route', params.route_set);
  } else if (ua.configuration.use_preloaded_route){
    this.setHeader('route', ua.transport.server.sip_uri);
  }

  // Via
  // Empty Via header. Will be filled by the client transaction.
  this.setHeader('via', '');

  // Max-Forwards
  this.setHeader('max-forwards', ExSIP_C.MAX_FORWARDS);

  // To
  to = (params.to_display_name || params.to_display_name === 0) ? '"' + params.to_display_name + '" ' : '';
  var toUri = (params.to_uri || ruri);
  to += '<' + (ua.configuration.enable_ims && toUri.isPhoneNumber() && toUri.toString().indexOf(';user=phone') === -1 ? toUri +";user=phone" : toUri) + '>';
  to += params.to_tag ? ';tag=' + params.to_tag : '';
  this.to = new NameAddrHeader.parse(to);
  this.setHeader('to', to);


  // From
  var fromName;
  if (params.from_display_name || params.from_display_name === 0) {
    fromName = '"' + params.from_display_name + '" ';
  } else if (ua.configuration.display_name) {
    fromName = '"' + ua.configuration.display_name + '" ';
  } else {
    fromName = '';
  }
  var fromUri = (params.from_uri || ua.configuration.uri);
  fromName += '<' + (ua.configuration.enable_ims && fromUri.isPhoneNumber() && fromUri.toString().indexOf(';user=phone') === -1 ? fromUri +";user=phone" : fromUri) + '>';
  var fromTag = ';tag=' + (params.from_tag || Utils.newTag());
  from = fromName + fromTag;
  this.from = new NameAddrHeader.parse(from);
  this.setHeader('from', from);

  // Call-ID
  call_id = params.call_id || (ua.configuration.exsip_id + Utils.createRandomToken(15));
  this.call_id = call_id;
  this.setHeader('call-id', call_id);

  // CSeq
  cseq = params.cseq || Math.floor(Math.random() * 10000);
  this.cseq = cseq;
  this.setHeader('cseq', cseq + ' ' + method);

  // P-Asserted-Identity
  if(ua.configuration.enable_ims) {
    this.setHeader('P-Asserted-Identity', fromName);
  } else if(ua.configuration.p_asserted_identity) {
    this.setHeader('P-Asserted-Identity', ua.configuration.p_asserted_identity);
  }
}

OutgoingRequest.prototype = {
  /**
   * Replace the the given header by the given value.
   * -param {String} name header name
   * -param {String | Array} value header value
   */
  setHeader: function(name, value) {
    this.headers[Utils.headerize(name)] = (value instanceof Array) ? value : [value];
  },

  /**
   * Get the value of the given header name at the given position.
   * -param {String} name header name
   * -returns {String|undefined} Returns the specified header, null if header doesn't exist.
   */
  getHeader: function(name) {
    var regexp, idx,
      length = this.extraHeaders.length,
      header = this.headers[Utils.headerize(name)];

    if(header) {
      if(header[0]) {
        return header[0];
      }
    } else {
      regexp = new RegExp('^\\s*'+ name +'\\s*:','i');
      for (idx=0; idx<length; idx++) {
        header = this.extraHeaders[idx];
        if (regexp.test(header)) {
          return header.substring(header.indexOf(':')+1).trim();
        }
      }
    }

    return;
  },

  /**
   * Get the header/s of the given name.
   * -param {String} name header name
   * -returns {Array} Array with all the headers of the specified name.
   */
  getHeaders: function(name) {
    var idx, length, regexp,
      header = this.headers[Utils.headerize(name)],
      result = [];

    if (header) {
      length = header.length;
      for (idx = 0; idx < length; idx++) {
        result.push(header[idx]);
      }
      return result;
    } else {
      length = this.extraHeaders.length;
      regexp = new RegExp('^\\s*'+ name +'\\s*:','i');
      for (idx=0; idx<length; idx++) {
        header = this.extraHeaders[idx];
        if (regexp.test(header)) {
          result.push(header.substring(header.indexOf(':')+1).trim());
        }
      }
      return result;
    }
  },

  /**
   * Verify the existence of the given header.
   * -param {String} name header name
   * -returns {boolean} true if header with given name exists, false otherwise
   */
  hasHeader: function(name) {
    var regexp, idx,
      length = this.extraHeaders.length;

    if (this.headers[Utils.headerize(name)]) {
      return true;
    } else {
      regexp = new RegExp('^\\s*'+ name +'\\s*:','i');
      for (idx=0; idx<length; idx++) {
        if (regexp.test(this.extraHeaders[idx])) {
          return true;
        }
      }
    }

    return false;
  },

  toString: function() {
    var msg = '', header, length, idx,
      supported = [];

    msg += this.method + ' ' + this.ruri + ' SIP/2.0\r\n';

    for (header in this.headers) {
      length = this.headers[header].length;
      for (idx = 0; idx < length; idx++) {
        msg += header + ': ' + this.headers[header][idx] + '\r\n';
      }
    }

    length = this.extraHeaders.length;
    for (idx = 0; idx < length; idx++) {
      msg += this.extraHeaders[idx].trim() +'\r\n';
    }

    // Supported
    switch (this.method) {
      case ExSIP_C.REGISTER:
        supported.push('path', 'gruu');
        break;
      case ExSIP_C.INVITE:
        if (this.ua.contact.pub_gruu || this.ua.contact.temp_gruu) {
          supported.push('gruu');
        }
        break;
    }

    supported.push('outbound');

    // Allow
    msg += 'Allow: '+ ExSIP_C.ALLOWED_METHODS +'\r\n';

    msg += 'Supported: ' +  supported +'\r\n';
    msg += 'User-Agent: ' + ExSIP_C.USER_AGENT +'\r\n';

    if(this.body) {
      length = Utils.str_utf8_length(this.body);
      msg += 'Content-Length: ' + length + '\r\n\r\n';
      msg += this.body;
    } else {
      msg += 'Content-Length: 0\r\n\r\n';
    }

    return msg;
  }
};


function IncomingMessage(){
  this.data = null;
  this.headers = null;
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
}

IncomingMessage.prototype = {
  /**
  * Insert a header of the given name and value into the last position of the
  * header array.
  */
  addHeader: function(name, value) {
    var header = { raw: value };

    name = Utils.headerize(name);

    if(this.headers[name]) {
      this.headers[name].push(header);
    } else {
      this.headers[name] = [header];
    }
  },

  getHeader: function(name) {
    var header = this.headers[Utils.headerize(name)];

    if(header) {
      if(header[0]) {
        return header[0].raw;
      }
    } else {
      return;
    }
  },

  /**
   * Get the header/s of the given name.
   */
  getHeaders: function(name) {
    var idx, length,
      header = this.headers[Utils.headerize(name)],
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
   */
  hasHeader: function(name) {
    return(this.headers[Utils.headerize(name)]) ? true : false;
  },

  /**
  * Parse the given header on the given index.
  * -param {String} name header name
  * -param {Number} [idx=0] header index
  * -returns {Object|undefined} Parsed header object, undefined if the header is not present or in case of a parsing error.
  */
  parseHeader: function(name, idx) {
    var header, value, parsed;

    name = Utils.headerize(name);

    idx = idx || 0;

    if(!this.headers[name]) {
      this.logger.log('header "' + name + '" not present');
      return;
    } else if(idx >= this.headers[name].length) {
      this.logger.log('not so many "' + name + '" headers present');
      return;
    }

    header = this.headers[name][idx];
    value = header.raw;

    if(header.parsed) {
      return header.parsed;
    }

    //substitute '-' by '_' for grammar rule matching.
    parsed = Grammar.parse(value, name.replace(/-/g, '_'));

    if(parsed === -1) {
      this.headers[name].splice(idx, 1); //delete from headers
      this.logger.warn('error parsing "' + name + '" header field with value "' + value + '"');
      return;
    } else {
      header.parsed = parsed;
      return parsed;
    }
  },

  /**
   * Message Header attribute selector. Alias of parseHeader.
   * -param {String} name header name
   * -param {Number} [idx=0] header index
   * -returns {Object|undefined} Parsed header object, undefined if the header is not present or in case of a parsing error.
   *
   * -example
   * message.s('via',3).port
   */
  s: function(name, idx) {
    return this.parseHeader(name, idx);
  },

  /**
  * Replace the value of the given header by the value.
  * -param {String} name header name
  * -param {String} value header value
  */
  setHeader: function(name, value) {
    var header = { raw: value };
    this.headers[Utils.headerize(name)] = [header];
  }
};

function IncomingRequest(ua) {
  this.logger = ua.getLogger('ExSIP.sipmessage');
  this.ua = ua;
  this.headers = {};
  this.ruri = null;
  this.transport = null;
  this.server_transaction = null;
}

IncomingRequest.prototype = new IncomingMessage();

/**
* Stateful reply.
* -param {Number} code status code
* -param {String} reason reason phrase
* -param {Object} headers extra headers
* -param {String} body body
* -param {Function} [onSuccess] onSuccess callback
* -param {Function} [onFailure] onFailure callback
*/
IncomingRequest.prototype.reply = function(code, reason, extraHeaders, body, onSuccess, onFailure) {
  var rr, vias, length, idx, response,
    supported = [],
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

  reason = reason || ExSIP_C.REASON_PHRASE[code] || '';
  extraHeaders = extraHeaders && extraHeaders.slice() || [];

  response = 'SIP/2.0 ' + code + ' ' + reason + '\r\n';

  if(this.method === ExSIP_C.INVITE && code > 100 && code <= 200) {
    rr = this.getHeaders('record-route');
    length = rr.length;

    for(r; r < length; r++) {
      response += 'Record-Route: ' + rr[r] + '\r\n';
    }
  }

  vias = this.getHeaders('via');
  length = vias.length;

  for(v; v < length; v++) {
    response += 'Via: ' + vias[v] + '\r\n';
  }

  if(!this.to_tag && code > 100) {
    to += ';tag=' + Utils.newTag();
  } else if(this.to_tag && !this.s('to').hasParam('tag')) {
    to += ';tag=' + this.to_tag;
  }

  response += 'To: ' + to + '\r\n';
  response += 'From: ' + this.getHeader('From') + '\r\n';
  response += 'Call-ID: ' + this.call_id + '\r\n';
  response += 'CSeq: ' + this.cseq + ' ' + this.method + '\r\n';

  length = extraHeaders.length;
  for (idx = 0; idx < length; idx++) {
    response += extraHeaders[idx].trim() +'\r\n';
  }

  // Supported
  switch (this.method) {
    case ExSIP_C.INVITE:
      if (this.ua.contact.pub_gruu || this.ua.contact.temp_gruu) {
        supported.push('gruu');
      }
      break;
  }

  supported.push('outbound');

  // Allow and Accept
  if (this.method === ExSIP_C.OPTIONS) {
    response += 'Allow: '+ ExSIP_C.ALLOWED_METHODS +'\r\n';
    response += 'Accept: '+ ExSIP_C.ACCEPTED_BODY_TYPES +'\r\n';
  } else if (code === 405) {
    response += 'Allow: '+ ExSIP_C.ALLOWED_METHODS +'\r\n';
  } else if (code === 415 ) {
    response += 'Accept: '+ ExSIP_C.ACCEPTED_BODY_TYPES +'\r\n';
  }

  response += 'Supported: ' +  supported +'\r\n';

  if(body) {
    length = Utils.str_utf8_length(body);
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
* -param {Number} code status code
* -param {String} reason reason phrase
*/
IncomingRequest.prototype.reply_sl = function(code, reason) {
  var to, response,
    v = 0,
    vias = this.getHeaders('via'),
    length = vias.length;

  code = code || null;
  reason = reason || null;

  // Validate code and reason values
  if (!code || (code < 100 || code > 699)) {
    throw new TypeError('Invalid status_code: '+ code);
  } else if (reason && typeof reason !== 'string' && !(reason instanceof String)) {
    throw new TypeError('Invalid reason_phrase: '+ reason);
  }

  reason = reason || ExSIP_C.REASON_PHRASE[code] || '';

  response = 'SIP/2.0 ' + code + ' ' + reason + '\r\n';

  for(v; v < length; v++) {
    response += 'Via: ' + vias[v] + '\r\n';
  }

  to = this.getHeader('To');

  if(!this.to_tag && code > 100) {
    to += ';tag=' + Utils.newTag();
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

function IncomingResponse(ua) {
  this.logger = ua.getLogger('ExSIP.sipmessage');
  this.headers = {};
  this.status_code = null;
  this.reason_phrase = null;
}

IncomingResponse.prototype = new IncomingMessage();
