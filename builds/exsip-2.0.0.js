/*
 * ExSIP 2.0.0
 * Copyright (c) 2012-2015 José Luis Millán - Versatica <http://www.versatica.com>
 * Homepage: http://ExSIP.net
 * License: http://ExSIP.net/license
 */

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.ExSIP=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var grammar = module.exports = {
  v: [{
      name: 'version',
      reg: /^(\d*)$/
  }],
  o: [{ //o=- 20518 0 IN IP4 203.0.113.1
    // NB: sessionId will be a String in most cases because it is huge
    name: 'origin',
    reg: /^(\S*) (\d*) (\d*) (\S*) IP(\d) (\S*)/,
    names: ['username', 'sessionId', 'sessionVersion', 'netType', 'ipVer', 'address'],
    format: "%s %s %d %s IP%d %s"
  }],
  // default parsing of these only (though some of these feel outdated)
  s: [{ name: 'name' }],
  i: [{ name: 'description' }],
  u: [{ name: 'uri' }],
  e: [{ name: 'email' }],
  p: [{ name: 'phone' }],
  z: [{ name: 'timezones' }], // TODO: this one can actually be parsed properly..
  r: [{ name: 'repeats' }],   // TODO: this one can also be parsed properly
  //k: [{}], // outdated thing ignored
  t: [{ //t=0 0
    name: 'timing',
    reg: /^(\d*) (\d*)/,
    names: ['start', 'stop'],
    format: "%d %d"
  }],
  c: [{ //c=IN IP4 10.47.197.26
      name: 'connection',
      reg: /^IN IP(\d) (\S*)/,
      names: ['version', 'ip'],
      format: "IN IP%d %s"
  }],
  b: [{ //b=AS:4000
      push: 'bandwidth',
      reg: /^(TIAS|AS|CT|RR|RS):(\d*)/,
      names: ['type', 'limit'],
      format: "%s:%s"
  }],
  m: [{ //m=video 51744 RTP/AVP 126 97 98 34 31
      // NB: special - pushes to session
      // TODO: rtp/fmtp should be filtered by the payloads found here?
      reg: /^(\w*) (\d*) ([\w\/]*)(?: (.*))?/,
      names: ['type', 'port', 'protocol', 'payloads'],
      format: "%s %d %s %s"
  }],
  a: [
    { //a=rtpmap:110 opus/48000/2
      push: 'rtp',
      reg: /^rtpmap:(\d*) ([\w\-]*)\/(\d*)(?:\s*\/(\S*))?/,
      names: ['payload', 'codec', 'rate', 'encoding'],
      format: function (o) {
        return (o.encoding) ?
          "rtpmap:%d %s/%s/%s":
          "rtpmap:%d %s/%s";
      }
    },
    { //a=fmtp:108 profile-level-id=24;object=23;bitrate=64000
      push: 'fmtp',
      reg: /^fmtp:(\d*) (\S*)/,
      names: ['payload', 'config'],
      format: "fmtp:%d %s"
    },
    { //a=control:streamid=0
        name: 'control',
        reg: /^control:(.*)/,
        format: "control:%s"
    },
    { //a=rtcp:65179 IN IP4 193.84.77.194
      name: 'rtcp',
      reg: /^rtcp:(\d*)(?: (\S*) IP(\d) (\S*))?/,
      names: ['port', 'netType', 'ipVer', 'address'],
      format: function (o) {
        return (o.address != null) ?
          "rtcp:%d %s IP%d %s":
          "rtcp:%d";
      }
    },
    { //a=rtcp-fb:98 trr-int 100
      push: 'rtcpFbTrrInt',
      reg: /^rtcp-fb:(\*|\d*) trr-int (\d*)/,
      names: ['payload', 'value'],
      format: "rtcp-fb:%d trr-int %d"
    },
    { //a=rtcp-fb:98 nack rpsi
      push: 'rtcpFb',
      reg: /^rtcp-fb:(\*|\d*) ([\w-_]*)(?: ([\w-_]*))?/,
      names: ['payload', 'type', 'subtype'],
      format: function (o) {
        return (o.subtype != null) ?
          "rtcp-fb:%s %s %s":
          "rtcp-fb:%s %s";
      }
    },
    { //a=extmap:2 urn:ietf:params:rtp-hdrext:toffset
      //a=extmap:1/recvonly URI-gps-string
      push: 'ext',
      reg: /^extmap:([\w_\/]*) (\S*)(?: (\S*))?/,
      names: ['value', 'uri', 'config'], // value may include "/direction" suffix
      format: function (o) {
        return (o.config != null) ?
          "extmap:%s %s %s":
          "extmap:%s %s"
      }
    },
    {
      //a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:PS1uQCVeeCFCanVmcjkpPywjNWhcYD0mXXtxaVBR|2^20|1:32
      push: 'crypto',
      reg: /^crypto:(\d*) ([\w_]*) (\S*)(?: (\S*))?/,
      names: ['id', 'suite', 'config', 'sessionConfig'],
      format: function (o) {
        return (o.sessionConfig != null) ?
          "crypto:%d %s %s %s":
          "crypto:%d %s %s";
      }
    },
    { //a=setup:actpass
      name: 'setup',
      reg: /^setup:(\w*)/,
      format: "setup:%s"
    },
    { //a=mid:1
      name: 'mid',
      reg: /^mid:(\w*)/,
      format: "mid:%s"
    },
    { //a=ptime:20
      name: 'ptime',
      reg: /^ptime:(\d*)/,
      format: "ptime:%d"
    },
    { //a=maxptime:60
      name: 'maxptime',
      reg: /^maxptime:(\d*)/,
      format: "maxptime:%d"
    },
    { //a=sendrecv
      name: 'direction',
      reg: /^(sendrecv|recvonly|sendonly|inactive)/,
      format: "%s"
    },
    { //a=ice-ufrag:F7gI
      name: 'iceUfrag',
      reg: /^ice-ufrag:(\S*)/,
      format: "ice-ufrag:%s"
    },
    { //a=ice-pwd:x9cml/YzichV2+XlhiMu8g
      name: 'icePwd',
      reg: /^ice-pwd:(\S*)/,
      format: "ice-pwd:%s"
    },
    { //a=fingerprint:SHA-1 00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33
      name: 'fingerprint',
      reg: /^fingerprint:(\S*) (\S*)/,
      names: ['type', 'hash'],
      format: "fingerprint:%s %s"
    },
    {
      //a=candidate:0 1 UDP 2113667327 203.0.113.1 54400 typ host
      //a=candidate:1162875081 1 udp 2113937151 192.168.34.75 60017 typ host generation 0
      //a=candidate:3289912957 2 udp 1845501695 193.84.77.194 60017 typ srflx raddr 192.168.34.75 rport 60017 generation 0
      push:'candidates',
      reg: /^candidate:(\S*) (\d*) (\S*) (\d*) (\S*) (\d*) typ (\S*)(?: raddr (\S*) rport (\d*))?(?: generation (\d*))?/,
      names: ['foundation', 'component', 'transport', 'priority', 'ip', 'port', 'type', 'raddr', 'rport', 'generation'],
      format: function (o) {
        var str = "candidate:%s %d %s %d %s %d typ %s";
        // NB: candidate has two optional chunks, so %void middle one if it's missing
        str += (o.raddr != null) ? " raddr %s rport %d" : "%v%v";
        if (o.generation != null) {
          str += " generation %d";
        }
        return str;
      }
    },
    { //a=remote-candidates:1 203.0.113.1 54400 2 203.0.113.1 54401 ...
      name: 'remoteCandidates',
      reg: /^remote-candidates:(.*)/,
      format: "remote-candidates:%s"
    },
    { //a=ice-options:google-ice
      name: 'iceOptions',
      reg: /^ice-options:(\S*)/,
      format: "ice-options:%s"
    },
    { //a=ssrc:2566107569 cname:t9YU8M1UxTF8Y1A1
      push: "ssrcs",
      reg: /^ssrc:(\d*) ([\w_]*):(.*)/,
      names: ['id', 'attribute', 'value'],
      format: "ssrc:%d %s:%s"
    },
    { //a=msid-semantic: WMS Jvlam5X3SX1OP6pn20zWogvaKJz5Hjf9OnlV
      name: "msidSemantic",
      reg: /^msid-semantic: (\w*) (\S*)/,
      names: ['semantic', 'token'],
      format: "msid-semantic: %s %s" // space after ":" is not accidental
    },
    { //a=group:BUNDLE audio video
      push: 'groups',
      reg: /^group:(\w*) (.*)/,
      names: ['type', 'mids'],
      format: "group:%s %s"
    },
    { //a=rtcp-mux
      name: 'rtcpMux',
      reg: /^(rtcp-mux)/
    },
    { // any a= that we don't understand is kepts verbatim on media.invalid
      push: 'invalid',
      names: ["value"]
    }
  ]
};

// set sensible defaults to avoid polluting the grammar with boring details
Object.keys(grammar).forEach(function (key) {
  var objs = grammar[key];
  objs.forEach(function (obj) {
    if (!obj.reg) {
      obj.reg = /(.*)/;
    }
    if (!obj.format) {
      obj.format = "%s";
    }
  });
}); 

},{}],2:[function(require,module,exports){
var parser = require('./parser');
var writer = require('./writer');

exports.write = writer;
exports.parse = parser.parse;
exports.parseFmtpConfig = parser.parseFmtpConfig;
exports.parsePayloads = parser.parsePayloads;
exports.parseRemoteCandidates = parser.parseRemoteCandidates;

},{"./parser":3,"./writer":4}],3:[function(require,module,exports){
var toIntIfInt = function (v) {
  return String(Number(v)) === v ? Number(v) : v;
};

var attachProperties = function (match, location, names, rawName) {
  if (rawName && !names) {
    location[rawName] = toIntIfInt(match[1]);
  }
  else {
    for (var i = 0; i < names.length; i += 1) {
      if (match[i+1] != null) {
        location[names[i]] = toIntIfInt(match[i+1]);
      }
    }
  }
};

var parseReg = function (obj, location, content) {
  var needsBlank = obj.name && obj.names;
  if (obj.push && !location[obj.push]) {
    location[obj.push] = [];
  }
  else if (needsBlank && !location[obj.name]) {
    location[obj.name] = {};
  }
  var keyLocation = obj.push ?
    {} :  // blank object that will be pushed
    needsBlank ? location[obj.name] : location; // otherwise, named location or root

  attachProperties(content.match(obj.reg), keyLocation, obj.names, obj.name);

  if (obj.push) {
    location[obj.push].push(keyLocation);
  }
};

var grammar = require('./grammar');
var validLine = RegExp.prototype.test.bind(/^([a-z])=(.*)/);

exports.parse = function (sdp) {
  var session = {}
    , media = []
    , location = session; // points at where properties go under (one of the above)

  // parse lines we understand
  sdp.split('\r\n').filter(validLine).forEach(function (l) {
    var type = l[0];
    var content = l.slice(2);
    if (type === 'm') {
      media.push({rtp: [], fmtp: []});
      location = media[media.length-1]; // point at latest media line
    }

    for (var j = 0; j < (grammar[type] || []).length; j += 1) {
      var obj = grammar[type][j];
      if (obj.reg.test(content)) {
        return parseReg(obj, location, content);
      }
    }
  });

  session.media = media; // link it up
  return session;
};

var fmtpReducer = function (acc, expr) {
  var s = expr.split('=');
  if (s.length === 2) {
    acc[s[0]] = toIntIfInt(s[1]);
  }
  return acc;
};

exports.parseFmtpConfig = function (str) {
  return str.split(';').reduce(fmtpReducer, {});
};

exports.parsePayloads = function (str) {
  return str.split(' ').map(Number);
};

exports.parseRemoteCandidates = function (str) {
  var candidates = [];
  var parts = str.split(' ').map(toIntIfInt);
  for (var i = 0; i < parts.length; i += 3) {
    candidates.push({
      component: parts[i],
      ip: parts[i + 1],
      port: parts[i + 2]
    });
  }
  return candidates;
};

},{"./grammar":1}],4:[function(require,module,exports){
var grammar = require('./grammar');

// customized util.format - discards excess arguments and can void middle ones
var formatRegExp = /%[sdv%]/g;
var format = function (formatStr) {
  var i = 1;
  var args = arguments;
  var len = args.length;
  return formatStr.replace(formatRegExp, function (x) {
    if (i >= len) {
      return x; // missing argument
    }
    var arg = args[i];
    i += 1;
    switch (x) {
      case '%%':
        return '%';
      case '%s':
        return String(arg);
      case '%d':
        return Number(arg);
      case '%v':
        return '';
    }
  });
  // NB: we discard excess arguments - they are typically undefined from makeLine
};

var makeLine = function (type, obj, location) {
  var str = obj.format instanceof Function ?
    (obj.format(obj.push ? location : location[obj.name])) :
    obj.format;

  var args = [type + '=' + str];
  if (obj.names) {
    for (var i = 0; i < obj.names.length; i += 1) {
      var n = obj.names[i];
      if (obj.name) {
        args.push(location[obj.name][n]);
      }
      else { // for mLine and push attributes
        args.push(location[obj.names[i]]);
      }
    }
  }
  else {
    args.push(location[obj.name]);
  }
  return format.apply(null, args);
};

// RFC specified order
// TODO: extend this with all the rest
var defaultOuterOrder = [
  'v', 'o', 's', 'i',
  'u', 'e', 'p', 'c',
  'b', 't', 'r', 'z', 'a'
];
var defaultInnerOrder = ['i', 'c', 'b', 'a'];


module.exports = function (session, opts) {
  opts = opts || {};
  // ensure certain properties exist
  if (session.version == null) {
    session.version = 0; // "v=0" must be there (only defined version atm)
  }
  if (session.name == null) {
    session.name = " "; // "s= " must be there if no meaningful name set
  }
  session.media.forEach(function (mLine) {
    if (mLine.payloads == null) {
      mLine.payloads = "";
    }
  });

  var outerOrder = opts.outerOrder || defaultOuterOrder;
  var innerOrder = opts.innerOrder || defaultInnerOrder;
  var sdp = [];

  // loop through outerOrder for matching properties on session
  outerOrder.forEach(function (type) {
    grammar[type].forEach(function (obj) {
      if (obj.name in session) {
        sdp.push(makeLine(type, obj, session));
      }
      else if (obj.push in session) {
        session[obj.push].forEach(function (el) {
          sdp.push(makeLine(type, obj, el));
        });
      }
    });
  });

  // then for each media line, follow the innerOrder
  session.media.forEach(function (mLine) {
    sdp.push(makeLine('m', grammar.m[0], mLine));

    innerOrder.forEach(function (type) {
      grammar[type].forEach(function (obj) {
        if (obj.name in mLine) {
          sdp.push(makeLine(type, obj, mLine));
        }
        else if (obj.push in mLine) {
          mLine[obj.push].forEach(function (el) {
            sdp.push(makeLine(type, obj, el));
          });
        }
      });
    });
  });

  return sdp.join('\r\n') + '\r\n';
};

},{"./grammar":1}],5:[function(require,module,exports){

/**
 * Module dependencies.
 */

var global = (function() { return this; })();

/**
 * WebSocket constructor.
 */

var WebSocket = global.WebSocket || global.MozWebSocket;

/**
 * Module exports.
 */

module.exports = WebSocket ? ws : null;

/**
 * WebSocket constructor.
 *
 * The third `opts` options object gets ignored in web browsers, since it's
 * non-standard, and throws a TypeError if passed to the constructor.
 * See: https://github.com/einaros/ws/issues/227
 *
 * @param {String} uri
 * @param {Array} protocols (optional)
 * @param {Object) opts (optional)
 * @api public
 */

function ws(uri, protocols, opts) {
  var instance;
  if (protocols) {
    instance = new WebSocket(uri, protocols);
  } else {
    instance = new WebSocket(uri);
  }
  return instance;
}

if (WebSocket) ws.prototype = WebSocket.prototype;

},{}],6:[function(require,module,exports){
module.exports={
  "name": "exsip",
  "title": "ExSIP",
  "description": "BroadSoft Javascript SIP library",
  "version": "2.0.0",
  "homepage": "http://www.broadsoft.com",
  "author": "BroadSoft, Inc.",
  "contributors": [
    {
      "url": ""
    }
  ],
  "main": "src/ExSIP.js",
  "repository": {
    "type": "git",
    "url": ""
  },
  "keywords": [
    "sip",
    "websocket",
    "webrtc",
    "library"
  ],
  "dependencies": {
    "sdp-transform": "0.6.1",
    "ws": "0.4.32"
  },
  "devDependencies": {
    "nodeunit": "0.9.0",
    "grunt": "0.4.5",
    "grunt-contrib-jshint": "0.10.0",
    "grunt-contrib-concat": "0.5.0",
    "grunt-contrib-uglify": "0.6.0",
    "grunt-contrib-watch": "0.6.1",
    "grunt-contrib-symlink": "0.3.0",
    "grunt-browserify": "3.0.1",
    "grunt-jsdoc": "0.5.7",
    "grunt-notify": ">=0.2.6",
    "grunt-bumpx": "0.1.5",
    "pegjs": "0.7.0",
    "grunt-mocha-test": "0.12.7",
    "expect": "1.6.0",
    "mocha": "2.1.0"
  },
  "engines": {
    "node": ">=0.8"
  },
  "license": "MIT",
  "scripts": {
    "test": "grunt travis --verbose"
  }
}

},{}],7:[function(require,module,exports){
var pkg = require('../package.json');

var C = {
  USER_AGENT: 'BroadSoft WebRTC Client - ' +  pkg.version,

  // SIP scheme
  SIP:  'sip',
  SIPS: 'sips',

  // End and Failure causes
  causes: {
    // Generic error causes
    CONNECTION_ERROR:         'Connection Error',
    REQUEST_TIMEOUT:          'Request Timeout',
    SIP_FAILURE_CODE:         'SIP Failure Code',
    INTERNAL_ERROR:           'Internal Error',

    // SIP error causes
    BUSY:                     'Busy',
    REJECTED:                 'Rejected',
    REDIRECTED:               'Redirected',
    UNAVAILABLE:              'Unavailable',
    NOT_FOUND:                'Not Found',
    ADDRESS_INCOMPLETE:       'Address Incomplete',
    INCOMPATIBLE_SDP:         'Incompatible SDP',
    MISSING_SDP:              'Missing SDP',
    AUTHENTICATION_ERROR:     'Authentication Error',
    DIALOG_ERROR:             'Dialog Error',

    // Session error causes
    BYE:                      'Terminated',
    WEBRTC_NOT_SUPPORTED:     'WebRTC Not Supported',
    WEBRTC_ERROR:             'WebRTC Error',
    CANCELED:                 'Canceled',
    NO_ANSWER:                'No Answer',
    EXPIRES:                  'Expires',
    NO_ACK:                   'No ACK',
    USER_DENIED_MEDIA_ACCESS: 'User Denied Media Access',
    BAD_MEDIA_DESCRIPTION:    'Bad Media Description',
    RTP_TIMEOUT:              'RTP Timeout',
    NOT_ACCEPTABLE_ERROR:     'Not Acceptable'
  },

  SIP_ERROR_CAUSES: {
    REDIRECTED: [300,301,302,305,380],
    BUSY: [486,600],
    REJECTED: [403,603],
    NOT_FOUND: [404,604],
    UNAVAILABLE: [480,410,408,430],
    ADDRESS_INCOMPLETE: [484],
    INCOMPATIBLE_SDP: [488],
    AUTHENTICATION_ERROR:[401,407],
    NOT_ACCEPTABLE_ERROR:[606]
  },

  // SIP Methods
  ACK:        'ACK',
  BYE:        'BYE',
  CANCEL:     'CANCEL',
  INFO:       'INFO',
  INVITE:     'INVITE',
  REFER:      'REFER',
  MESSAGE:    'MESSAGE',
  NOTIFY:     'NOTIFY',
  OPTIONS:    'OPTIONS',
  REGISTER:   'REGISTER',
  UPDATE:     'UPDATE',
  SUBSCRIBE:  'SUBSCRIBE',

  // MODES
  SENDONLY:  'sendonly',
  RECVONLY:  'recvonly',
  SENDRECV:  'sendrecv',
  INACTIVE:  'inactive',

  /* SIP Response Reasons
   * DOC: http://www.iana.org/assignments/sip-parameters
   * Copied from https://github.com/versatica/OverSIP/blob/master/lib/oversip/sip/constants.rb#L7
   */
  REASON_PHRASE: {
    100: 'Trying',
    180: 'Ringing',
    181: 'Call Is Being Forwarded',
    182: 'Queued',
    183: 'Session Progress',
    199: 'Early Dialog Terminated',  // draft-ietf-sipcore-199
    200: 'OK',
    202: 'Accepted',  // RFC 3265
    204: 'No Notification',  //RFC 5839
    300: 'Multiple Choices',
    301: 'Moved Permanently',
    302: 'Moved Temporarily',
    305: 'Use Proxy',
    380: 'Alternative Service',
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    407: 'Proxy Authentication Required',
    408: 'Request Timeout',
    410: 'Gone',
    412: 'Conditional Request Failed',  // RFC 3903
    413: 'Request Entity Too Large',
    414: 'Request-URI Too Long',
    415: 'Unsupported Media Type',
    416: 'Unsupported URI Scheme',
    417: 'Unknown Resource-Priority',  // RFC 4412
    420: 'Bad Extension',
    421: 'Extension Required',
    422: 'Session Interval Too Small',  // RFC 4028
    423: 'Interval Too Brief',
    428: 'Use Identity Header',  // RFC 4474
    429: 'Provide Referrer Identity',  // RFC 3892
    430: 'Flow Failed',  // RFC 5626
    433: 'Anonymity Disallowed',  // RFC 5079
    436: 'Bad Identity-Info',  // RFC 4474
    437: 'Unsupported Certificate',  // RFC 4744
    438: 'Invalid Identity Header',  // RFC 4744
    439: 'First Hop Lacks Outbound Support',  // RFC 5626
    440: 'Max-Breadth Exceeded',  // RFC 5393
    469: 'Bad Info Package',  // draft-ietf-sipcore-info-events
    470: 'Consent Needed',  // RFC 5360
    478: 'Unresolvable Destination',  // Custom code copied from Kamailio.
    480: 'Temporarily Unavailable',
    481: 'Call/Transaction Does Not Exist',
    482: 'Loop Detected',
    483: 'Too Many Hops',
    484: 'Address Incomplete',
    485: 'Ambiguous',
    486: 'Busy Here',
    487: 'Request Terminated',
    488: 'Not Acceptable Here',
    489: 'Bad Event',  // RFC 3265
    491: 'Request Pending',
    493: 'Undecipherable',
    494: 'Security Agreement Required',  // RFC 3329
    500: 'ExSIP Internal Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Server Time-out',
    505: 'Version Not Supported',
    513: 'Message Too Large',
    580: 'Precondition Failure',  // RFC 3312
    600: 'Busy Everywhere',
    603: 'Decline',
    604: 'Does Not Exist Anywhere',
    606: 'Not Acceptable'
  },

  ALLOWED_METHODS: 'INVITE,ACK,CANCEL,BYE,UPDATE,MESSAGE,OPTIONS',
  ACCEPTED_BODY_TYPES: 'application/sdp, application/dtmf-relay',
  MAX_FORWARDS: 69
};


module.exports = C;

},{"../package.json":6}],8:[function(require,module,exports){
module.exports = Dialog;


var C = {
  // Dialog states
  STATUS_EARLY:       1,
  STATUS_CONFIRMED:   2
};

/**
 * Expose C object.
 */
Dialog.C = C;


/**
 * Dependencies.
 */
var SIPMessage = require('./SIPMessage');
var ExSIP_C = require('./Constants');
var Transactions = require('./Transactions');
var Utils = require('./Utils');
var Dialog_RequestSender = require('./Dialog/RequestSender');


// RFC 3261 12.1
function Dialog(owner, message, type, state) {
  var contact;

  this.uac_pending_reply = false;
  this.uas_pending_reply = false;
  this.is_acknowledged = false;
  this.type = type;

  if(!message.hasHeader('contact')) {
    return {
      error: 'unable to create a Dialog without Contact header field'
    };
  }

  if(message instanceof SIPMessage.IncomingResponse) {
    state = (message.status_code < 200) ? C.STATUS_EARLY : C.STATUS_CONFIRMED;
  } else {
    // Create confirmed dialog if state is not defined
    state = state || C.STATUS_CONFIRMED;
  }

  contact = message.parseHeader('contact');

  // RFC 3261 12.1.1
  if(type === 'UAS') {
    this.id = {
      call_id: message.call_id,
      local_tag: message.to_tag,
      remote_tag: message.from_tag,
      toString: function() {
        return this.call_id + this.local_tag + this.remote_tag;
      }
    };
    this.state = state;
    this.remote_seqnum = message.cseq;
    this.local_uri = message.parseHeader('to').uri;
    this.remote_uri = message.parseHeader('from').uri;
    this.remote_target = contact.uri;
    this.route_set = message.getHeaders('record-route');
  }
  // RFC 3261 12.1.2
  else if(type === 'UAC') {
    this.id = {
      call_id: message.call_id,
      local_tag: message.from_tag,
      remote_tag: message.to_tag,
      toString: function() {
        return this.call_id + this.local_tag + this.remote_tag;
      }
    };
    this.state = state;
    this.local_seqnum = message.cseq;
    this.local_uri = message.parseHeader('from').uri;
    this.remote_uri = message.parseHeader('to').uri;
    this.remote_target = contact.uri;
    this.route_set = message.getHeaders('record-route').reverse();
  }

  this.logger = owner.ua.getLogger('ExSIP.dialog', this.id.toString());
  this.owner = owner;
  owner.ua.dialogs[this.id.toString()] = this;
  this.logger.debug('new ' + type + ' dialog created with status ' + (this.state === C.STATUS_EARLY ? 'EARLY': 'CONFIRMED'));
}


Dialog.prototype = {
  isUAS: function() {
    return this.type === 'UAS';
  },

  isUAC: function() {
    return this.type === 'UAC';
  },

  update: function(message, type) {
    this.state = C.STATUS_CONFIRMED;

    this.logger.debug('dialog '+ this.id.toString() +'  changed to CONFIRMED state');

    if(type === 'UAC') {
      // RFC 3261 13.2.2.4
      this.route_set = message.getHeaders('record-route').reverse();
    }
  },

  terminate: function() {
    this.logger.debug('dialog ' + this.id.toString() + ' deleted');
    delete this.owner.ua.dialogs[this.id.toString()];
  },

  // RFC 3261 12.2.1.1
  createRequest: function(method, extraHeaders, body) {
    var cseq, request;
    extraHeaders = extraHeaders && extraHeaders.slice() || [];

    if(!this.local_seqnum) { this.local_seqnum = Math.floor(Math.random() * 10000); }

    cseq = (method === ExSIP_C.CANCEL || method === ExSIP_C.ACK) ? this.local_seqnum : this.local_seqnum += 1;

    request = new SIPMessage.OutgoingRequest(
      method,
      this.remote_target,
      this.owner.ua, {
        'cseq': cseq,
        'call_id': this.id.call_id,
        'from_uri': this.local_uri,
        'from_tag': this.id.local_tag,
        'to_uri': this.remote_uri,
        'to_tag': this.id.remote_tag,
        'route_set': this.route_set
      }, extraHeaders, body);

  this.logger.debug('createRequest : dialog.request_sender.request.extraHeaders : '+Utils.toString(request.extraHeaders));

    request.dialog = this;

    return request;
  },

  // RFC 3261 12.2.2
  checkInDialogRequest: function(request) {
    var self = this;

    // RFC3261 14.2 Modifying an Existing Session -UAS BEHAVIOR-
    if (request.method === ExSIP_C.INVITE || (request.method === ExSIP_C.UPDATE && request.body)) {
      if (this.uac_pending_reply === true) {
        request.reply(491);
      } else if (this.uas_pending_reply === true || (this.type === 'UAS' && !this.is_acknowledged)) {
        var retryAfter = (Math.random() * 10 | 0) + 1;
        request.reply(500, null, ['Retry-After:'+ retryAfter]);
        return false;
      } else {
        this.uas_pending_reply = true;
        request.server_transaction.on('stateChanged', function stateChanged(e){
          if (e.sender.state === Transactions.C.STATUS_ACCEPTED ||
              e.sender.state === Transactions.C.STATUS_COMPLETED ||
              e.sender.state === Transactions.C.STATUS_TERMINATED) {

            request.server_transaction.removeListener('stateChanged', stateChanged);
            self.uas_pending_reply = false;

            if (self.uac_pending_reply === false) {
              self.owner.onReadyToReinvite();
            }
          }
        });
      }

      // RFC3261 12.2.2 Replace the dialog`s remote target URI if the request is accepted
      if(request.hasHeader('contact')) {
        request.server_transaction.on('stateChanged', function(e){
          if (e.sender.state === Transactions.C.STATUS_ACCEPTED) {
            self.remote_target = request.parseHeader('contact').uri;
          }
        });
      }
    }
    else if (request.method === ExSIP_C.NOTIFY) {
      // RFC6665 3.2 Replace the dialog`s remote target URI if the request is accepted
      if(request.hasHeader('contact')) {
        request.server_transaction.on('stateChanged', function(e){
          if (e.sender.state === Transactions.C.STATUS_COMPLETED) {
            self.remote_target = request.parseHeader('contact').uri;
          }
        });
      }
    }
    else if (request.method === ExSIP_C.ACK) {
      this.is_acknowledged = true;
    }

    if(!this.remote_seqnum) {
      this.remote_seqnum = request.cseq;
    } else if(request.cseq < this.remote_seqnum) {
        //Do not try to reply to an ACK request.
        if (request.method !== ExSIP_C.ACK) {
          request.reply(500);
        }
        return false;
    } else if(request.cseq > this.remote_seqnum) {
      this.remote_seqnum = request.cseq;
    }

    return true;
  },

  createRequestSender: function(applicant, method, options) {
    options = options || {};

    var
      extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [],
      body = options.body || null,
      request = this.createRequest(method, extraHeaders, body),
      request_sender = new Dialog_RequestSender(this, applicant, request);
  this.logger.debug('dialog.request_sender.request.extraHeaders : '+Utils.toString(request.extraHeaders));

    return request_sender;  
  },

  sendRequest: function(applicant, method, options) {
      var request_sender = this.createRequestSender(applicant, method, options);
      request_sender.send();
  },

  receiveRequest: function(request) {
    //Check in-dialog request
    if(!this.checkInDialogRequest(request)) {
      return;
    }

    this.owner.receiveRequest(request);
  }
};

},{"./Constants":7,"./Dialog/RequestSender":9,"./SIPMessage":26,"./Transactions":28,"./Utils":32}],9:[function(require,module,exports){
module.exports = DialogRequestSender;

/**
 * Dependencies.
 */
var ExSIP_C = require('../Constants');
var Transactions = require('../Transactions');
var RTCSession = require('../RTCSession');
var RequestSender = require('../RequestSender');


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
    this.logger.log('********* onRequestTimeout : ', this.applicant);
    this.applicant.onRequestTimeout();
  },

  onTransportError: function() {
    this.applicant.onTransportError();
  },

  // RFC3261 14.1
  getReattemptTimeout: function() {
    if(this.applicant.direction === 'outgoing') {
      return (Math.random() * (4 - 2.1) + 2.1).toFixed(2);
    } else {
      return (Math.random() * 2).toFixed(2);
    }
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
},{"../Constants":7,"../RTCSession":20,"../RequestSender":25,"../Transactions":28}],10:[function(require,module,exports){
module.exports = DigestAuthentication;


function DigestAuthentication(ua) {
  this.logger = ua.getLogger('ExSIP.digestauthentication');
  this.username = ua.configuration.authorization_user;
  this.password = ua.configuration.password;
  this.cnonce = null;
  this.nc = 0;
  this.ncHex = '00000000';
  this.response = null;
}


/**
 * Dependencies.
 */
var Utils = require('./Utils');


/**
* Performs Digest authentication given a SIP request and the challenge
* received in a response to that request.
* Returns true if credentials were successfully generated, false otherwise.
<<<<<<< HEAD
* 
* @param {ExSIP.OutgoingRequest} request
* @param {Object} challenge
=======
>>>>>>> ExSIP050
*/
DigestAuthentication.prototype.authenticate = function(request, challenge) {
  // Inspect and validate the challenge.

  this.algorithm = challenge.algorithm;
  this.realm = challenge.realm;
  this.nonce = challenge.nonce;
  this.opaque = challenge.opaque;
  this.stale = challenge.stale;

  if (this.algorithm) {
    if (this.algorithm !== 'MD5') {
      this.logger.warn('challenge with Digest algorithm different than "MD5", authentication aborted');
      return false;
    }
  } else {
    this.algorithm = 'MD5';
  }

  if (! this.realm) {
    this.logger.warn('challenge without Digest realm, authentication aborted');
    return false;
  }

  if (! this.nonce) {
    this.logger.warn('challenge without Digest nonce, authentication aborted');
    return false;
  }

  // 'qop' can contain a list of values (Array). Let's choose just one.
  if (challenge.qop) {
    if (challenge.qop.indexOf('auth') > -1) {
      this.qop = 'auth';
    } else if (challenge.qop.indexOf('auth-int') > -1) {
      this.qop = 'auth-int';
    } else {
      // Otherwise 'qop' is present but does not contain 'auth' or 'auth-int', so abort here.
      this.logger.warn('challenge without Digest qop different than "auth" or "auth-int", authentication aborted');
      return false;
    }
  } else {
    this.qop = null;
  }

  // Fill other attributes.

  this.method = request.method;
  this.uri = request.ruri;
  this.cnonce = Utils.createRandomToken(12);
  this.nc += 1;
  this.updateNcHex();

  // nc-value = 8LHEX. Max value = 'FFFFFFFF'.
  if (this.nc === 4294967296) {
    this.nc = 1;
    this.ncHex = '00000001';
  }

  // Calculate the Digest "response" value.
  this.calculateResponse();

  return true;
};


/**
* Generate Digest 'response' value.
*/
DigestAuthentication.prototype.calculateResponse = function() {
  var ha1, ha2;

  // HA1 = MD5(A1) = MD5(username:realm:password)
  ha1 = Utils.calculateMD5(this.username + ":" + this.realm + ":" + this.password);

  if (this.qop === 'auth') {
    // HA2 = MD5(A2) = MD5(method:digestURI)
    ha2 = Utils.calculateMD5(this.method + ":" + this.uri);
    // response = MD5(HA1:nonce:nonceCount:credentialsNonce:qop:HA2)
    this.response = Utils.calculateMD5(ha1 + ":" + this.nonce + ":" + this.ncHex + ":" + this.cnonce + ":auth:" + ha2);

  } else if (this.qop === 'auth-int') {
    // HA2 = MD5(A2) = MD5(method:digestURI:MD5(entityBody))
    ha2 = Utils.calculateMD5(this.method + ":" + this.uri + ":" + Utils.calculateMD5(this.body ? this.body : ""));
    // response = MD5(HA1:nonce:nonceCount:credentialsNonce:qop:HA2)
    this.response = Utils.calculateMD5(ha1 + ":" + this.nonce + ":" + this.ncHex + ":" + this.cnonce + ":auth-int:" + ha2);

  } else if (this.qop === null) {
    // HA2 = MD5(A2) = MD5(method:digestURI)
    ha2 = Utils.calculateMD5(this.method + ":" + this.uri);
    // response = MD5(HA1:nonce:HA2)
    this.response = Utils.calculateMD5(ha1 + ":" + this.nonce + ":" + ha2);
  }
};


/**
* Return the Proxy-Authorization or WWW-Authorization header value.
*/
DigestAuthentication.prototype.toString = function() {
  var auth_params = [];

  if (! this.response) {
    throw new Error('response field does not exist, cannot generate Authorization header');
  }

  auth_params.push('algorithm=' + this.algorithm);
  auth_params.push('username="' + this.username + '"');
  auth_params.push('realm="' + this.realm + '"');
  auth_params.push('nonce="' + this.nonce + '"');
  auth_params.push('uri="' + this.uri + '"');
  auth_params.push('response="' + this.response + '"');
  if (this.opaque) {
    auth_params.push('opaque="' + this.opaque + '"');
  }
  if (this.qop) {
    auth_params.push('qop=' + this.qop);
    auth_params.push('cnonce="' + this.cnonce + '"');
    auth_params.push('nc=' + this.ncHex);
  }

  return 'Digest ' + auth_params.join(', ');
};


/**
* Generate the 'nc' value as required by Digest in this.ncHex by reading this.nc.
*/
DigestAuthentication.prototype.updateNcHex = function() {
  var hex = Number(this.nc).toString(16);
  this.ncHex = '00000000'.substr(0, 8-hex.length) + hex;
};
},{"./Utils":32}],11:[function(require,module,exports){
module.exports = EventEmitter;


function EventEmitter() {}


/**
 * Dependencies.
 */
var LoggerFactory = require('./LoggerFactory');


function Event(type, sender, data) {
  this.type = type;
  this.sender= sender;
  this.data = data;
}


var
  logger = new LoggerFactory().getLogger('ExSIP.eventemitter'),
  C = {
    MAX_LISTENERS: 50
  };


EventEmitter.prototype = {
  /**
   * Initialize events dictionaries.
   * -param {Array} events
   */
  initEvents: function(events) {
    var idx, length;

    if (!this.logger) {
      this.logger = logger;
    }

    this.maxListeners = C.MAX_LISTENERS;

    this.events = {};
    this.oneTimeListeners = {};

    length = events.length;
    for (idx = 0; idx < length; idx++) {
      this.events[events[idx]] = [];
      this.oneTimeListeners[events[idx]] = [];
    }
  },

  /**
   * Check whether an event exists or not.
   */
  checkEvent: function(event) {
    return !!this.events[event];
  },

  /**
   * Add a listener to the end of the listeners array for the specified event.
   */
  addListener: function(event, listener) {
    if (listener === undefined) {
      return;
    } else if (typeof listener !== 'function') {
      this.logger.error('listener must be a function');
      return;
    } else if (!this.checkEvent(event)) {
      this.logger.error('unable to add a listener to a nonexistent event ' + event);
      return;
    }

    if (this.events[event].length >= this.maxListeners) {
      this.logger.warn('max listeners exceeded for event ' + event);
    }

    this.events[event].push(listener);
  },

  on: function(event, listener) {
    this.addListener(event, listener);
  },

  /**
   * Add a one time listener for the specified event.
   * The listener is invoked only the next time the event is fired, then it is removed.
   */
  once: function(event, listener) {
    this.on(event, listener);
    this.oneTimeListeners[event].push(listener);
  },

  /**
   * Remove a listener from the listener array for the specified event.
   * Note that the order of the array elements will change after removing the listener
   */
  removeListener: function(event, listener) {
    var events, length,
      idx = 0;

    if (listener === undefined) {
      return;
    } else if (typeof listener !== 'function') {
      this.logger.error('listener must be a function');
      return;
    } else if (!this.checkEvent(event)) {
      this.logger.error('unable to remove a listener from a nonexistent event'+ event);
      return;
    }

    events = this.events[event];
    length = events.length;

    while (idx < length) {
      if (events[idx] === listener) {
        events.splice(idx,1);
      } else {
        idx ++;
      }
    }
  },

  /**
   * Remove all listeners from the listener array for the specified event.
   */
  removeAllListener: function(event) {
    if (!this.checkEvent(event)) {
      this.logger.error('unable to remove listeners from a nonexistent event'+ event);
      return;
    }

    this.events[event] = [];
    this.oneTimeListeners[event] = [];
  },

  /**
   * By default EventEmitter will print a warning
   * if more than C.MAX_LISTENERS listeners are added for a particular event.
   * This function allows that limit to be modified.
   */
  setMaxListeners: function(listeners) {
    if (typeof listeners !== 'number' || listeners < 0) {
      this.logger.error('listeners must be a positive number');
      return;
    }

    this.maxListeners = listeners;
  },

  /**
   * Get the listeners for a specific event.
   */
  listeners: function(event) {
    if (!this.checkEvent(event)) {
      this.logger.error('no event '+ event);
      return;
    }

    return this.events[event];
  },

  /**
   * Execute each of the listeners in order with the supplied arguments.
   */
  emit: function(event, sender, data) {
    var listeners, length, e, idx,
      self = this;

    if (!this.checkEvent(event)) {
      this.logger.error('unable to emit a nonexistent event'+ event);
      return;
    }

    this.logger.debug('emitting event '+ event);

    listeners = this.events[event];
    length = listeners.length;

    e = new Event(event, sender, data);

    listeners.map(function(listener) {
      return function() {
        listener.call(null, e);
      };
    }).forEach(function(callback) {
      try {
        callback();
      } catch(err) {
        self.logger.error(err.stack);
      }
    });

    // Remove one time listeners
    for (idx in this.oneTimeListeners[event]) {
      this.removeListener(event, this.oneTimeListeners[event][idx]);
    }

    this.oneTimeListeners[event] = [];
  }
};
},{"./LoggerFactory":16}],12:[function(require,module,exports){
var ExSIP = {
  C: require('./Constants'),
  Exceptions: require('./Exceptions'),
  Utils: require('./Utils'),
  UA: require('./UA'),
  URI: require('./URI'),
  NameAddrHeader: require('./NameAddrHeader'),
  Grammar: require('./Grammar'),
  WebRTC: require('./WebRTC'),
  RTCSession: require('./RTCSession')
};

module.exports = ExSIP;


var pkg = require('../package.json');


Object.defineProperties(ExSIP, {
  name: {
    get: function(){ return pkg.title; }
  },

  /**
   * Retrieve the version of ExSIP.
   * @memberof ExSIP
   * @method
   * @returns {String} Version in the form "X.Y.Z"
   * @example
   * // prints "1.0.0"
   * console.log(ExSIP.version)
   */
  version: {
    get: function(){ return pkg.version; }
  }
});

},{"../package.json":6,"./Constants":7,"./Exceptions":13,"./Grammar":14,"./NameAddrHeader":18,"./RTCSession":20,"./UA":30,"./URI":31,"./Utils":32,"./WebRTC":33}],13:[function(require,module,exports){
/**
 * @namespace Exceptions
 * @memberOf ExSIP
 */
var Exceptions = {
  /**
   * Exception thrown when a valid parameter is given to the ExSIP.UA constructor.
   * @class ConfigurationError
   * @memberOf ExSIP.Exceptions
   */
  ConfigurationError: (function(){
    var exception = function(parameter, value) {
      console.trace('----------------------ConfigurationError : '+parameter+', '+value);
      this.code = 1;
      this.name = 'CONFIGURATION_ERROR';
      this.parameter = parameter;
      this.value = value;
      this.message = (!this.value)? 'Missing parameter: '+ this.parameter : 'Invalid value '+ JSON.stringify(this.value) +' for parameter "'+ this.parameter +'"';
    };
    exception.prototype = new Error();
    return exception;
  }()),

  InvalidStateError: (function(){
    var exception = function(status) {
      console.trace('----------------------InvalidStateError : '+status);
      this.code = 2;
      this.name = 'INVALID_STATE_ERROR';
      this.status = status;
      this.message = 'Invalid status: '+ status;
    };
    exception.prototype = new Error();
    return exception;
  }()),

  NotSupportedError: (function(){
    var exception = function(message) {
      console.trace('----------------------NotSupportedError : '+message);
      this.code = 3;
      this.name = 'NOT_SUPPORTED_ERROR';
      this.message = message;
    };
    exception.prototype = new Error();
    return exception;
  }()),

  NotReadyError: (function(){
    var exception = function(message) {
      console.trace('----------------------NotReadyError : '+message);
      this.code = 4;
      this.name = 'NOT_READY_ERROR';
      this.message = message;
    };
    exception.prototype = new Error();
    return exception;
  }())
};

module.exports = Exceptions;
},{}],14:[function(require,module,exports){
module.exports = (function(){
  /*
   * Generated by PEG.js 0.7.0.
   *
   * http://pegjs.majda.cz/
   */
  
  function quote(s) {
    /*
     * ECMA-262, 5th ed., 7.8.4: All characters may appear literally in a
     * string literal except for the closing quote character, backslash,
     * carriage return, line separator, paragraph separator, and line feed.
     * Any character may appear in the form of an escape sequence.
     *
     * For portability, we also escape escape all control and non-ASCII
     * characters. Note that "\0" and "\v" escape sequences are not used
     * because JSHint does not like the first and IE the second.
     */
     return '"' + s
      .replace(/\\/g, '\\\\')  // backslash
      .replace(/"/g, '\\"')    // closing quote character
      .replace(/\x08/g, '\\b') // backspace
      .replace(/\t/g, '\\t')   // horizontal tab
      .replace(/\n/g, '\\n')   // line feed
      .replace(/\f/g, '\\f')   // form feed
      .replace(/\r/g, '\\r')   // carriage return
      .replace(/[\x00-\x07\x0B\x0E-\x1F\x80-\uFFFF]/g, escape)
      + '"';
  }
  
  var result = {
    /*
     * Parses the input with a generated parser. If the parsing is successfull,
     * returns a value explicitly or implicitly specified by the grammar from
     * which the parser was generated (see |PEG.buildParser|). If the parsing is
     * unsuccessful, throws |PEG.parser.SyntaxError| describing the error.
     */
    parse: function(input, startRule) {
      var parseFunctions = {
        "CRLF": parse_CRLF,
        "DIGIT": parse_DIGIT,
        "ALPHA": parse_ALPHA,
        "HEXDIG": parse_HEXDIG,
        "WSP": parse_WSP,
        "OCTET": parse_OCTET,
        "DQUOTE": parse_DQUOTE,
        "SP": parse_SP,
        "HTAB": parse_HTAB,
        "alphanum": parse_alphanum,
        "reserved": parse_reserved,
        "unreserved": parse_unreserved,
        "mark": parse_mark,
        "escaped": parse_escaped,
        "LWS": parse_LWS,
        "SWS": parse_SWS,
        "HCOLON": parse_HCOLON,
        "TEXT_UTF8_TRIM": parse_TEXT_UTF8_TRIM,
        "TEXT_UTF8char": parse_TEXT_UTF8char,
        "UTF8_NONASCII": parse_UTF8_NONASCII,
        "UTF8_CONT": parse_UTF8_CONT,
        "LHEX": parse_LHEX,
        "token": parse_token,
        "token_nodot": parse_token_nodot,
        "separators": parse_separators,
        "word": parse_word,
        "STAR": parse_STAR,
        "SLASH": parse_SLASH,
        "EQUAL": parse_EQUAL,
        "LPAREN": parse_LPAREN,
        "RPAREN": parse_RPAREN,
        "RAQUOT": parse_RAQUOT,
        "LAQUOT": parse_LAQUOT,
        "COMMA": parse_COMMA,
        "SEMI": parse_SEMI,
        "COLON": parse_COLON,
        "LDQUOT": parse_LDQUOT,
        "RDQUOT": parse_RDQUOT,
        "comment": parse_comment,
        "ctext": parse_ctext,
        "quoted_string": parse_quoted_string,
        "quoted_string_clean": parse_quoted_string_clean,
        "qdtext": parse_qdtext,
        "quoted_pair": parse_quoted_pair,
        "SIP_URI_noparams": parse_SIP_URI_noparams,
        "SIP_URI": parse_SIP_URI,
        "uri_scheme": parse_uri_scheme,
        "userinfo": parse_userinfo,
        "user": parse_user,
        "user_unreserved": parse_user_unreserved,
        "password": parse_password,
        "hostport": parse_hostport,
        "host": parse_host,
        "hostname": parse_hostname,
        "domainlabel": parse_domainlabel,
        "toplabel": parse_toplabel,
        "IPv6reference": parse_IPv6reference,
        "IPv6address": parse_IPv6address,
        "h16": parse_h16,
        "ls32": parse_ls32,
        "IPv4address": parse_IPv4address,
        "dec_octet": parse_dec_octet,
        "port": parse_port,
        "uri_parameters": parse_uri_parameters,
        "uri_parameter": parse_uri_parameter,
        "transport_param": parse_transport_param,
        "user_param": parse_user_param,
        "method_param": parse_method_param,
        "ttl_param": parse_ttl_param,
        "maddr_param": parse_maddr_param,
        "lr_param": parse_lr_param,
        "other_param": parse_other_param,
        "pname": parse_pname,
        "pvalue": parse_pvalue,
        "paramchar": parse_paramchar,
        "param_unreserved": parse_param_unreserved,
        "headers": parse_headers,
        "header": parse_header,
        "hname": parse_hname,
        "hvalue": parse_hvalue,
        "hnv_unreserved": parse_hnv_unreserved,
        "Request_Response": parse_Request_Response,
        "Request_Line": parse_Request_Line,
        "Request_URI": parse_Request_URI,
        "absoluteURI": parse_absoluteURI,
        "hier_part": parse_hier_part,
        "net_path": parse_net_path,
        "abs_path": parse_abs_path,
        "opaque_part": parse_opaque_part,
        "uric": parse_uric,
        "uric_no_slash": parse_uric_no_slash,
        "path_segments": parse_path_segments,
        "segment": parse_segment,
        "param": parse_param,
        "pchar": parse_pchar,
        "scheme": parse_scheme,
        "authority": parse_authority,
        "srvr": parse_srvr,
        "reg_name": parse_reg_name,
        "query": parse_query,
        "SIP_Version": parse_SIP_Version,
        "INVITEm": parse_INVITEm,
        "ACKm": parse_ACKm,
        "OPTIONSm": parse_OPTIONSm,
        "BYEm": parse_BYEm,
        "CANCELm": parse_CANCELm,
        "REGISTERm": parse_REGISTERm,
        "SUBSCRIBEm": parse_SUBSCRIBEm,
        "NOTIFYm": parse_NOTIFYm,
        "Method": parse_Method,
        "Status_Line": parse_Status_Line,
        "Status_Code": parse_Status_Code,
        "extension_code": parse_extension_code,
        "Reason_Phrase": parse_Reason_Phrase,
        "Allow_Events": parse_Allow_Events,
        "Call_ID": parse_Call_ID,
        "Contact": parse_Contact,
        "contact_param": parse_contact_param,
        "name_addr": parse_name_addr,
        "display_name": parse_display_name,
        "contact_params": parse_contact_params,
        "c_p_q": parse_c_p_q,
        "c_p_expires": parse_c_p_expires,
        "delta_seconds": parse_delta_seconds,
        "qvalue": parse_qvalue,
        "generic_param": parse_generic_param,
        "gen_value": parse_gen_value,
        "Content_Disposition": parse_Content_Disposition,
        "disp_type": parse_disp_type,
        "disp_param": parse_disp_param,
        "handling_param": parse_handling_param,
        "Content_Encoding": parse_Content_Encoding,
        "Content_Length": parse_Content_Length,
        "Content_Type": parse_Content_Type,
        "media_type": parse_media_type,
        "m_type": parse_m_type,
        "discrete_type": parse_discrete_type,
        "composite_type": parse_composite_type,
        "extension_token": parse_extension_token,
        "x_token": parse_x_token,
        "m_subtype": parse_m_subtype,
        "m_parameter": parse_m_parameter,
        "m_value": parse_m_value,
        "CSeq": parse_CSeq,
        "CSeq_value": parse_CSeq_value,
        "Expires": parse_Expires,
        "Event": parse_Event,
        "event_type": parse_event_type,
        "From": parse_From,
        "from_param": parse_from_param,
        "tag_param": parse_tag_param,
        "Max_Forwards": parse_Max_Forwards,
        "Min_Expires": parse_Min_Expires,
        "Name_Addr_Header": parse_Name_Addr_Header,
        "Proxy_Authenticate": parse_Proxy_Authenticate,
        "challenge": parse_challenge,
        "other_challenge": parse_other_challenge,
        "auth_param": parse_auth_param,
        "digest_cln": parse_digest_cln,
        "realm": parse_realm,
        "realm_value": parse_realm_value,
        "domain": parse_domain,
        "URI": parse_URI,
        "nonce": parse_nonce,
        "nonce_value": parse_nonce_value,
        "opaque": parse_opaque,
        "stale": parse_stale,
        "algorithm": parse_algorithm,
        "qop_options": parse_qop_options,
        "qop_value": parse_qop_value,
        "Proxy_Require": parse_Proxy_Require,
        "Record_Route": parse_Record_Route,
        "rec_route": parse_rec_route,
        "Require": parse_Require,
        "Route": parse_Route,
        "route_param": parse_route_param,
        "Subscription_State": parse_Subscription_State,
        "substate_value": parse_substate_value,
        "subexp_params": parse_subexp_params,
        "event_reason_value": parse_event_reason_value,
        "Subject": parse_Subject,
        "Supported": parse_Supported,
        "To": parse_To,
        "to_param": parse_to_param,
        "Via": parse_Via,
        "via_parm": parse_via_parm,
        "via_params": parse_via_params,
        "via_ttl": parse_via_ttl,
        "via_maddr": parse_via_maddr,
        "via_received": parse_via_received,
        "via_branch": parse_via_branch,
        "response_port": parse_response_port,
        "sent_protocol": parse_sent_protocol,
        "protocol_name": parse_protocol_name,
        "transport": parse_transport,
        "sent_by": parse_sent_by,
        "via_host": parse_via_host,
        "via_port": parse_via_port,
        "ttl": parse_ttl,
        "WWW_Authenticate": parse_WWW_Authenticate,
        "extension_header": parse_extension_header,
        "header_value": parse_header_value,
        "message_body": parse_message_body,
        "stun_URI": parse_stun_URI,
        "stun_scheme": parse_stun_scheme,
        "stun_host_port": parse_stun_host_port,
        "stun_host": parse_stun_host,
        "reg_name": parse_reg_name,
        "stun_unreserved": parse_stun_unreserved,
        "sub_delims": parse_sub_delims,
        "turn_URI": parse_turn_URI,
        "turn_scheme": parse_turn_scheme,
        "turn_transport": parse_turn_transport,
        "uuid_URI": parse_uuid_URI,
        "uuid": parse_uuid,
        "hex4": parse_hex4,
        "hex8": parse_hex8,
        "hex12": parse_hex12
      };
      
      if (startRule !== undefined) {
        if (parseFunctions[startRule] === undefined) {
          throw new Error("Invalid rule name: " + quote(startRule) + ".");
        }
      } else {
        startRule = "CRLF";
      }
      
      var pos = 0;
      var reportFailures = 0;
      var rightmostFailuresPos = 0;
      var rightmostFailuresExpected = [];
      
      function padLeft(input, padding, length) {
        var result = input;
        
        var padLength = length - input.length;
        for (var i = 0; i < padLength; i++) {
          result = padding + result;
        }
        
        return result;
      }
      
      function escape(ch) {
        var charCode = ch.charCodeAt(0);
        var escapeChar;
        var length;
        
        if (charCode <= 0xFF) {
          escapeChar = 'x';
          length = 2;
        } else {
          escapeChar = 'u';
          length = 4;
        }
        
        return '\\' + escapeChar + padLeft(charCode.toString(16).toUpperCase(), '0', length);
      }
      
      function matchFailed(failure) {
        if (pos < rightmostFailuresPos) {
          return;
        }
        
        if (pos > rightmostFailuresPos) {
          rightmostFailuresPos = pos;
          rightmostFailuresExpected = [];
        }
        
        rightmostFailuresExpected.push(failure);
      }
      
      function parse_CRLF() {
        var result0;
        
        if (input.substr(pos, 2) === "\r\n") {
          result0 = "\r\n";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"\\r\\n\"");
          }
        }
        return result0;
      }
      
      function parse_DIGIT() {
        var result0;
        
        if (/^[0-9]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[0-9]");
          }
        }
        return result0;
      }
      
      function parse_ALPHA() {
        var result0;
        
        if (/^[a-zA-Z]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[a-zA-Z]");
          }
        }
        return result0;
      }
      
      function parse_HEXDIG() {
        var result0;
        
        if (/^[0-9a-fA-F]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[0-9a-fA-F]");
          }
        }
        return result0;
      }
      
      function parse_WSP() {
        var result0;
        
        result0 = parse_SP();
        if (result0 === null) {
          result0 = parse_HTAB();
        }
        return result0;
      }
      
      function parse_OCTET() {
        var result0;
        
        if (/^[\0-\xFF]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[\\0-\\xFF]");
          }
        }
        return result0;
      }
      
      function parse_DQUOTE() {
        var result0;
        
        if (/^["]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[\"]");
          }
        }
        return result0;
      }
      
      function parse_SP() {
        var result0;
        
        if (input.charCodeAt(pos) === 32) {
          result0 = " ";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\" \"");
          }
        }
        return result0;
      }
      
      function parse_HTAB() {
        var result0;
        
        if (input.charCodeAt(pos) === 9) {
          result0 = "\t";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"\\t\"");
          }
        }
        return result0;
      }
      
      function parse_alphanum() {
        var result0;
        
        if (/^[a-zA-Z0-9]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[a-zA-Z0-9]");
          }
        }
        return result0;
      }
      
      function parse_reserved() {
        var result0;
        
        if (input.charCodeAt(pos) === 59) {
          result0 = ";";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\";\"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos) === 47) {
            result0 = "/";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"/\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos) === 63) {
              result0 = "?";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"?\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 58) {
                result0 = ":";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\":\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 64) {
                  result0 = "@";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"@\"");
                  }
                }
                if (result0 === null) {
                  if (input.charCodeAt(pos) === 38) {
                    result0 = "&";
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"&\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.charCodeAt(pos) === 61) {
                      result0 = "=";
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"=\"");
                      }
                    }
                    if (result0 === null) {
                      if (input.charCodeAt(pos) === 43) {
                        result0 = "+";
                        pos++;
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"+\"");
                        }
                      }
                      if (result0 === null) {
                        if (input.charCodeAt(pos) === 36) {
                          result0 = "$";
                          pos++;
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"$\"");
                          }
                        }
                        if (result0 === null) {
                          if (input.charCodeAt(pos) === 44) {
                            result0 = ",";
                            pos++;
                          } else {
                            result0 = null;
                            if (reportFailures === 0) {
                              matchFailed("\",\"");
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_unreserved() {
        var result0;
        
        result0 = parse_alphanum();
        if (result0 === null) {
          result0 = parse_mark();
        }
        return result0;
      }
      
      function parse_mark() {
        var result0;
        
        if (input.charCodeAt(pos) === 45) {
          result0 = "-";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"-\"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos) === 95) {
            result0 = "_";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"_\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos) === 46) {
              result0 = ".";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\".\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 33) {
                result0 = "!";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"!\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 126) {
                  result0 = "~";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"~\"");
                  }
                }
                if (result0 === null) {
                  if (input.charCodeAt(pos) === 42) {
                    result0 = "*";
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"*\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.charCodeAt(pos) === 39) {
                      result0 = "'";
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"'\"");
                      }
                    }
                    if (result0 === null) {
                      if (input.charCodeAt(pos) === 40) {
                        result0 = "(";
                        pos++;
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"(\"");
                        }
                      }
                      if (result0 === null) {
                        if (input.charCodeAt(pos) === 41) {
                          result0 = ")";
                          pos++;
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("\")\"");
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_escaped() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 37) {
          result0 = "%";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"%\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_HEXDIG();
          if (result1 !== null) {
            result2 = parse_HEXDIG();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, escaped) {return escaped.join(''); })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LWS() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        pos2 = pos;
        result0 = [];
        result1 = parse_WSP();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_WSP();
        }
        if (result0 !== null) {
          result1 = parse_CRLF();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos2;
          }
        } else {
          result0 = null;
          pos = pos2;
        }
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result2 = parse_WSP();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_WSP();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {return " "; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_SWS() {
        var result0;
        
        result0 = parse_LWS();
        result0 = result0 !== null ? result0 : "";
        return result0;
      }
      
      function parse_HCOLON() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = [];
        result1 = parse_SP();
        if (result1 === null) {
          result1 = parse_HTAB();
        }
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_SP();
          if (result1 === null) {
            result1 = parse_HTAB();
          }
        }
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_SWS();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {return ':'; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_TEXT_UTF8_TRIM() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result1 = parse_TEXT_UTF8char();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_TEXT_UTF8char();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = [];
          result3 = parse_LWS();
          while (result3 !== null) {
            result2.push(result3);
            result3 = parse_LWS();
          }
          if (result2 !== null) {
            result3 = parse_TEXT_UTF8char();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = [];
            result3 = parse_LWS();
            while (result3 !== null) {
              result2.push(result3);
              result3 = parse_LWS();
            }
            if (result2 !== null) {
              result3 = parse_TEXT_UTF8char();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                            return input.substring(pos, offset); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_TEXT_UTF8char() {
        var result0;
        
        if (/^[!-~]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[!-~]");
          }
        }
        if (result0 === null) {
          result0 = parse_UTF8_NONASCII();
        }
        return result0;
      }
      
      function parse_UTF8_NONASCII() {
        var result0;
        
        if (/^[\x80-\uFFFF]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[\\x80-\\uFFFF]");
          }
        }
        return result0;
      }
      
      function parse_UTF8_CONT() {
        var result0;
        
        if (/^[\x80-\xBF]/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[\\x80-\\xBF]");
          }
        }
        return result0;
      }
      
      function parse_LHEX() {
        var result0;
        
        result0 = parse_DIGIT();
        if (result0 === null) {
          if (/^[a-f]/.test(input.charAt(pos))) {
            result0 = input.charAt(pos);
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("[a-f]");
            }
          }
        }
        return result0;
      }
      
      function parse_token() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_alphanum();
        if (result1 === null) {
          if (input.charCodeAt(pos) === 45) {
            result1 = "-";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"-\"");
            }
          }
          if (result1 === null) {
            if (input.charCodeAt(pos) === 46) {
              result1 = ".";
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\".\"");
              }
            }
            if (result1 === null) {
              if (input.charCodeAt(pos) === 33) {
                result1 = "!";
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"!\"");
                }
              }
              if (result1 === null) {
                if (input.charCodeAt(pos) === 37) {
                  result1 = "%";
                  pos++;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"%\"");
                  }
                }
                if (result1 === null) {
                  if (input.charCodeAt(pos) === 42) {
                    result1 = "*";
                    pos++;
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"*\"");
                    }
                  }
                  if (result1 === null) {
                    if (input.charCodeAt(pos) === 95) {
                      result1 = "_";
                      pos++;
                    } else {
                      result1 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"_\"");
                      }
                    }
                    if (result1 === null) {
                      if (input.charCodeAt(pos) === 43) {
                        result1 = "+";
                        pos++;
                      } else {
                        result1 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"+\"");
                        }
                      }
                      if (result1 === null) {
                        if (input.charCodeAt(pos) === 96) {
                          result1 = "`";
                          pos++;
                        } else {
                          result1 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"`\"");
                          }
                        }
                        if (result1 === null) {
                          if (input.charCodeAt(pos) === 39) {
                            result1 = "'";
                            pos++;
                          } else {
                            result1 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"'\"");
                            }
                          }
                          if (result1 === null) {
                            if (input.charCodeAt(pos) === 126) {
                              result1 = "~";
                              pos++;
                            } else {
                              result1 = null;
                              if (reportFailures === 0) {
                                matchFailed("\"~\"");
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_alphanum();
            if (result1 === null) {
              if (input.charCodeAt(pos) === 45) {
                result1 = "-";
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"-\"");
                }
              }
              if (result1 === null) {
                if (input.charCodeAt(pos) === 46) {
                  result1 = ".";
                  pos++;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\".\"");
                  }
                }
                if (result1 === null) {
                  if (input.charCodeAt(pos) === 33) {
                    result1 = "!";
                    pos++;
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"!\"");
                    }
                  }
                  if (result1 === null) {
                    if (input.charCodeAt(pos) === 37) {
                      result1 = "%";
                      pos++;
                    } else {
                      result1 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"%\"");
                      }
                    }
                    if (result1 === null) {
                      if (input.charCodeAt(pos) === 42) {
                        result1 = "*";
                        pos++;
                      } else {
                        result1 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"*\"");
                        }
                      }
                      if (result1 === null) {
                        if (input.charCodeAt(pos) === 95) {
                          result1 = "_";
                          pos++;
                        } else {
                          result1 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"_\"");
                          }
                        }
                        if (result1 === null) {
                          if (input.charCodeAt(pos) === 43) {
                            result1 = "+";
                            pos++;
                          } else {
                            result1 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"+\"");
                            }
                          }
                          if (result1 === null) {
                            if (input.charCodeAt(pos) === 96) {
                              result1 = "`";
                              pos++;
                            } else {
                              result1 = null;
                              if (reportFailures === 0) {
                                matchFailed("\"`\"");
                              }
                            }
                            if (result1 === null) {
                              if (input.charCodeAt(pos) === 39) {
                                result1 = "'";
                                pos++;
                              } else {
                                result1 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\"'\"");
                                }
                              }
                              if (result1 === null) {
                                if (input.charCodeAt(pos) === 126) {
                                  result1 = "~";
                                  pos++;
                                } else {
                                  result1 = null;
                                  if (reportFailures === 0) {
                                    matchFailed("\"~\"");
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                          return input.substring(pos, offset); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_token_nodot() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_alphanum();
        if (result1 === null) {
          if (input.charCodeAt(pos) === 45) {
            result1 = "-";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"-\"");
            }
          }
          if (result1 === null) {
            if (input.charCodeAt(pos) === 33) {
              result1 = "!";
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\"!\"");
              }
            }
            if (result1 === null) {
              if (input.charCodeAt(pos) === 37) {
                result1 = "%";
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"%\"");
                }
              }
              if (result1 === null) {
                if (input.charCodeAt(pos) === 42) {
                  result1 = "*";
                  pos++;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"*\"");
                  }
                }
                if (result1 === null) {
                  if (input.charCodeAt(pos) === 95) {
                    result1 = "_";
                    pos++;
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"_\"");
                    }
                  }
                  if (result1 === null) {
                    if (input.charCodeAt(pos) === 43) {
                      result1 = "+";
                      pos++;
                    } else {
                      result1 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"+\"");
                      }
                    }
                    if (result1 === null) {
                      if (input.charCodeAt(pos) === 96) {
                        result1 = "`";
                        pos++;
                      } else {
                        result1 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"`\"");
                        }
                      }
                      if (result1 === null) {
                        if (input.charCodeAt(pos) === 39) {
                          result1 = "'";
                          pos++;
                        } else {
                          result1 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"'\"");
                          }
                        }
                        if (result1 === null) {
                          if (input.charCodeAt(pos) === 126) {
                            result1 = "~";
                            pos++;
                          } else {
                            result1 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"~\"");
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_alphanum();
            if (result1 === null) {
              if (input.charCodeAt(pos) === 45) {
                result1 = "-";
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"-\"");
                }
              }
              if (result1 === null) {
                if (input.charCodeAt(pos) === 33) {
                  result1 = "!";
                  pos++;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"!\"");
                  }
                }
                if (result1 === null) {
                  if (input.charCodeAt(pos) === 37) {
                    result1 = "%";
                    pos++;
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"%\"");
                    }
                  }
                  if (result1 === null) {
                    if (input.charCodeAt(pos) === 42) {
                      result1 = "*";
                      pos++;
                    } else {
                      result1 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"*\"");
                      }
                    }
                    if (result1 === null) {
                      if (input.charCodeAt(pos) === 95) {
                        result1 = "_";
                        pos++;
                      } else {
                        result1 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"_\"");
                        }
                      }
                      if (result1 === null) {
                        if (input.charCodeAt(pos) === 43) {
                          result1 = "+";
                          pos++;
                        } else {
                          result1 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"+\"");
                          }
                        }
                        if (result1 === null) {
                          if (input.charCodeAt(pos) === 96) {
                            result1 = "`";
                            pos++;
                          } else {
                            result1 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"`\"");
                            }
                          }
                          if (result1 === null) {
                            if (input.charCodeAt(pos) === 39) {
                              result1 = "'";
                              pos++;
                            } else {
                              result1 = null;
                              if (reportFailures === 0) {
                                matchFailed("\"'\"");
                              }
                            }
                            if (result1 === null) {
                              if (input.charCodeAt(pos) === 126) {
                                result1 = "~";
                                pos++;
                              } else {
                                result1 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\"~\"");
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                          return input.substring(pos, offset); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_separators() {
        var result0;
        
        if (input.charCodeAt(pos) === 40) {
          result0 = "(";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"(\"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos) === 41) {
            result0 = ")";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\")\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos) === 60) {
              result0 = "<";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"<\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 62) {
                result0 = ">";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\">\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 64) {
                  result0 = "@";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"@\"");
                  }
                }
                if (result0 === null) {
                  if (input.charCodeAt(pos) === 44) {
                    result0 = ",";
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\",\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.charCodeAt(pos) === 59) {
                      result0 = ";";
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\";\"");
                      }
                    }
                    if (result0 === null) {
                      if (input.charCodeAt(pos) === 58) {
                        result0 = ":";
                        pos++;
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\":\"");
                        }
                      }
                      if (result0 === null) {
                        if (input.charCodeAt(pos) === 92) {
                          result0 = "\\";
                          pos++;
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"\\\\\"");
                          }
                        }
                        if (result0 === null) {
                          result0 = parse_DQUOTE();
                          if (result0 === null) {
                            if (input.charCodeAt(pos) === 47) {
                              result0 = "/";
                              pos++;
                            } else {
                              result0 = null;
                              if (reportFailures === 0) {
                                matchFailed("\"/\"");
                              }
                            }
                            if (result0 === null) {
                              if (input.charCodeAt(pos) === 91) {
                                result0 = "[";
                                pos++;
                              } else {
                                result0 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\"[\"");
                                }
                              }
                              if (result0 === null) {
                                if (input.charCodeAt(pos) === 93) {
                                  result0 = "]";
                                  pos++;
                                } else {
                                  result0 = null;
                                  if (reportFailures === 0) {
                                    matchFailed("\"]\"");
                                  }
                                }
                                if (result0 === null) {
                                  if (input.charCodeAt(pos) === 63) {
                                    result0 = "?";
                                    pos++;
                                  } else {
                                    result0 = null;
                                    if (reportFailures === 0) {
                                      matchFailed("\"?\"");
                                    }
                                  }
                                  if (result0 === null) {
                                    if (input.charCodeAt(pos) === 61) {
                                      result0 = "=";
                                      pos++;
                                    } else {
                                      result0 = null;
                                      if (reportFailures === 0) {
                                        matchFailed("\"=\"");
                                      }
                                    }
                                    if (result0 === null) {
                                      if (input.charCodeAt(pos) === 123) {
                                        result0 = "{";
                                        pos++;
                                      } else {
                                        result0 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\"{\"");
                                        }
                                      }
                                      if (result0 === null) {
                                        if (input.charCodeAt(pos) === 125) {
                                          result0 = "}";
                                          pos++;
                                        } else {
                                          result0 = null;
                                          if (reportFailures === 0) {
                                            matchFailed("\"}\"");
                                          }
                                        }
                                        if (result0 === null) {
                                          result0 = parse_SP();
                                          if (result0 === null) {
                                            result0 = parse_HTAB();
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_word() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_alphanum();
        if (result1 === null) {
          if (input.charCodeAt(pos) === 45) {
            result1 = "-";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"-\"");
            }
          }
          if (result1 === null) {
            if (input.charCodeAt(pos) === 46) {
              result1 = ".";
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\".\"");
              }
            }
            if (result1 === null) {
              if (input.charCodeAt(pos) === 33) {
                result1 = "!";
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"!\"");
                }
              }
              if (result1 === null) {
                if (input.charCodeAt(pos) === 37) {
                  result1 = "%";
                  pos++;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"%\"");
                  }
                }
                if (result1 === null) {
                  if (input.charCodeAt(pos) === 42) {
                    result1 = "*";
                    pos++;
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"*\"");
                    }
                  }
                  if (result1 === null) {
                    if (input.charCodeAt(pos) === 95) {
                      result1 = "_";
                      pos++;
                    } else {
                      result1 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"_\"");
                      }
                    }
                    if (result1 === null) {
                      if (input.charCodeAt(pos) === 43) {
                        result1 = "+";
                        pos++;
                      } else {
                        result1 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"+\"");
                        }
                      }
                      if (result1 === null) {
                        if (input.charCodeAt(pos) === 96) {
                          result1 = "`";
                          pos++;
                        } else {
                          result1 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"`\"");
                          }
                        }
                        if (result1 === null) {
                          if (input.charCodeAt(pos) === 39) {
                            result1 = "'";
                            pos++;
                          } else {
                            result1 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"'\"");
                            }
                          }
                          if (result1 === null) {
                            if (input.charCodeAt(pos) === 126) {
                              result1 = "~";
                              pos++;
                            } else {
                              result1 = null;
                              if (reportFailures === 0) {
                                matchFailed("\"~\"");
                              }
                            }
                            if (result1 === null) {
                              if (input.charCodeAt(pos) === 40) {
                                result1 = "(";
                                pos++;
                              } else {
                                result1 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\"(\"");
                                }
                              }
                              if (result1 === null) {
                                if (input.charCodeAt(pos) === 41) {
                                  result1 = ")";
                                  pos++;
                                } else {
                                  result1 = null;
                                  if (reportFailures === 0) {
                                    matchFailed("\")\"");
                                  }
                                }
                                if (result1 === null) {
                                  if (input.charCodeAt(pos) === 60) {
                                    result1 = "<";
                                    pos++;
                                  } else {
                                    result1 = null;
                                    if (reportFailures === 0) {
                                      matchFailed("\"<\"");
                                    }
                                  }
                                  if (result1 === null) {
                                    if (input.charCodeAt(pos) === 62) {
                                      result1 = ">";
                                      pos++;
                                    } else {
                                      result1 = null;
                                      if (reportFailures === 0) {
                                        matchFailed("\">\"");
                                      }
                                    }
                                    if (result1 === null) {
                                      if (input.charCodeAt(pos) === 58) {
                                        result1 = ":";
                                        pos++;
                                      } else {
                                        result1 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\":\"");
                                        }
                                      }
                                      if (result1 === null) {
                                        if (input.charCodeAt(pos) === 92) {
                                          result1 = "\\";
                                          pos++;
                                        } else {
                                          result1 = null;
                                          if (reportFailures === 0) {
                                            matchFailed("\"\\\\\"");
                                          }
                                        }
                                        if (result1 === null) {
                                          result1 = parse_DQUOTE();
                                          if (result1 === null) {
                                            if (input.charCodeAt(pos) === 47) {
                                              result1 = "/";
                                              pos++;
                                            } else {
                                              result1 = null;
                                              if (reportFailures === 0) {
                                                matchFailed("\"/\"");
                                              }
                                            }
                                            if (result1 === null) {
                                              if (input.charCodeAt(pos) === 91) {
                                                result1 = "[";
                                                pos++;
                                              } else {
                                                result1 = null;
                                                if (reportFailures === 0) {
                                                  matchFailed("\"[\"");
                                                }
                                              }
                                              if (result1 === null) {
                                                if (input.charCodeAt(pos) === 93) {
                                                  result1 = "]";
                                                  pos++;
                                                } else {
                                                  result1 = null;
                                                  if (reportFailures === 0) {
                                                    matchFailed("\"]\"");
                                                  }
                                                }
                                                if (result1 === null) {
                                                  if (input.charCodeAt(pos) === 63) {
                                                    result1 = "?";
                                                    pos++;
                                                  } else {
                                                    result1 = null;
                                                    if (reportFailures === 0) {
                                                      matchFailed("\"?\"");
                                                    }
                                                  }
                                                  if (result1 === null) {
                                                    if (input.charCodeAt(pos) === 123) {
                                                      result1 = "{";
                                                      pos++;
                                                    } else {
                                                      result1 = null;
                                                      if (reportFailures === 0) {
                                                        matchFailed("\"{\"");
                                                      }
                                                    }
                                                    if (result1 === null) {
                                                      if (input.charCodeAt(pos) === 125) {
                                                        result1 = "}";
                                                        pos++;
                                                      } else {
                                                        result1 = null;
                                                        if (reportFailures === 0) {
                                                          matchFailed("\"}\"");
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_alphanum();
            if (result1 === null) {
              if (input.charCodeAt(pos) === 45) {
                result1 = "-";
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"-\"");
                }
              }
              if (result1 === null) {
                if (input.charCodeAt(pos) === 46) {
                  result1 = ".";
                  pos++;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\".\"");
                  }
                }
                if (result1 === null) {
                  if (input.charCodeAt(pos) === 33) {
                    result1 = "!";
                    pos++;
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"!\"");
                    }
                  }
                  if (result1 === null) {
                    if (input.charCodeAt(pos) === 37) {
                      result1 = "%";
                      pos++;
                    } else {
                      result1 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"%\"");
                      }
                    }
                    if (result1 === null) {
                      if (input.charCodeAt(pos) === 42) {
                        result1 = "*";
                        pos++;
                      } else {
                        result1 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"*\"");
                        }
                      }
                      if (result1 === null) {
                        if (input.charCodeAt(pos) === 95) {
                          result1 = "_";
                          pos++;
                        } else {
                          result1 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"_\"");
                          }
                        }
                        if (result1 === null) {
                          if (input.charCodeAt(pos) === 43) {
                            result1 = "+";
                            pos++;
                          } else {
                            result1 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"+\"");
                            }
                          }
                          if (result1 === null) {
                            if (input.charCodeAt(pos) === 96) {
                              result1 = "`";
                              pos++;
                            } else {
                              result1 = null;
                              if (reportFailures === 0) {
                                matchFailed("\"`\"");
                              }
                            }
                            if (result1 === null) {
                              if (input.charCodeAt(pos) === 39) {
                                result1 = "'";
                                pos++;
                              } else {
                                result1 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\"'\"");
                                }
                              }
                              if (result1 === null) {
                                if (input.charCodeAt(pos) === 126) {
                                  result1 = "~";
                                  pos++;
                                } else {
                                  result1 = null;
                                  if (reportFailures === 0) {
                                    matchFailed("\"~\"");
                                  }
                                }
                                if (result1 === null) {
                                  if (input.charCodeAt(pos) === 40) {
                                    result1 = "(";
                                    pos++;
                                  } else {
                                    result1 = null;
                                    if (reportFailures === 0) {
                                      matchFailed("\"(\"");
                                    }
                                  }
                                  if (result1 === null) {
                                    if (input.charCodeAt(pos) === 41) {
                                      result1 = ")";
                                      pos++;
                                    } else {
                                      result1 = null;
                                      if (reportFailures === 0) {
                                        matchFailed("\")\"");
                                      }
                                    }
                                    if (result1 === null) {
                                      if (input.charCodeAt(pos) === 60) {
                                        result1 = "<";
                                        pos++;
                                      } else {
                                        result1 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\"<\"");
                                        }
                                      }
                                      if (result1 === null) {
                                        if (input.charCodeAt(pos) === 62) {
                                          result1 = ">";
                                          pos++;
                                        } else {
                                          result1 = null;
                                          if (reportFailures === 0) {
                                            matchFailed("\">\"");
                                          }
                                        }
                                        if (result1 === null) {
                                          if (input.charCodeAt(pos) === 58) {
                                            result1 = ":";
                                            pos++;
                                          } else {
                                            result1 = null;
                                            if (reportFailures === 0) {
                                              matchFailed("\":\"");
                                            }
                                          }
                                          if (result1 === null) {
                                            if (input.charCodeAt(pos) === 92) {
                                              result1 = "\\";
                                              pos++;
                                            } else {
                                              result1 = null;
                                              if (reportFailures === 0) {
                                                matchFailed("\"\\\\\"");
                                              }
                                            }
                                            if (result1 === null) {
                                              result1 = parse_DQUOTE();
                                              if (result1 === null) {
                                                if (input.charCodeAt(pos) === 47) {
                                                  result1 = "/";
                                                  pos++;
                                                } else {
                                                  result1 = null;
                                                  if (reportFailures === 0) {
                                                    matchFailed("\"/\"");
                                                  }
                                                }
                                                if (result1 === null) {
                                                  if (input.charCodeAt(pos) === 91) {
                                                    result1 = "[";
                                                    pos++;
                                                  } else {
                                                    result1 = null;
                                                    if (reportFailures === 0) {
                                                      matchFailed("\"[\"");
                                                    }
                                                  }
                                                  if (result1 === null) {
                                                    if (input.charCodeAt(pos) === 93) {
                                                      result1 = "]";
                                                      pos++;
                                                    } else {
                                                      result1 = null;
                                                      if (reportFailures === 0) {
                                                        matchFailed("\"]\"");
                                                      }
                                                    }
                                                    if (result1 === null) {
                                                      if (input.charCodeAt(pos) === 63) {
                                                        result1 = "?";
                                                        pos++;
                                                      } else {
                                                        result1 = null;
                                                        if (reportFailures === 0) {
                                                          matchFailed("\"?\"");
                                                        }
                                                      }
                                                      if (result1 === null) {
                                                        if (input.charCodeAt(pos) === 123) {
                                                          result1 = "{";
                                                          pos++;
                                                        } else {
                                                          result1 = null;
                                                          if (reportFailures === 0) {
                                                            matchFailed("\"{\"");
                                                          }
                                                        }
                                                        if (result1 === null) {
                                                          if (input.charCodeAt(pos) === 125) {
                                                            result1 = "}";
                                                            pos++;
                                                          } else {
                                                            result1 = null;
                                                            if (reportFailures === 0) {
                                                              matchFailed("\"}\"");
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                          return input.substring(pos, offset); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_STAR() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 42) {
            result1 = "*";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"*\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_SWS();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {return "*"; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_SLASH() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 47) {
            result1 = "/";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"/\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_SWS();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {return "/"; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_EQUAL() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 61) {
            result1 = "=";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"=\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_SWS();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {return "="; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LPAREN() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 40) {
            result1 = "(";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"(\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_SWS();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {return "("; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_RPAREN() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 41) {
            result1 = ")";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\")\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_SWS();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {return ")"; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_RAQUOT() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 62) {
          result0 = ">";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\">\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_SWS();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {return ">"; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LAQUOT() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 60) {
            result1 = "<";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"<\"");
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {return "<"; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_COMMA() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 44) {
            result1 = ",";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\",\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_SWS();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {return ","; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_SEMI() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 59) {
            result1 = ";";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\";\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_SWS();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {return ";"; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_COLON() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_SWS();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {return ":"; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_LDQUOT() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          result1 = parse_DQUOTE();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {return "\""; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_RDQUOT() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_DQUOTE();
        if (result0 !== null) {
          result1 = parse_SWS();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {return "\""; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_comment() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        result0 = parse_LPAREN();
        if (result0 !== null) {
          result1 = [];
          result2 = parse_ctext();
          if (result2 === null) {
            result2 = parse_quoted_pair();
            if (result2 === null) {
              result2 = parse_comment();
            }
          }
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_ctext();
            if (result2 === null) {
              result2 = parse_quoted_pair();
              if (result2 === null) {
                result2 = parse_comment();
              }
            }
          }
          if (result1 !== null) {
            result2 = parse_RPAREN();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_ctext() {
        var result0;
        
        if (/^[!-']/.test(input.charAt(pos))) {
          result0 = input.charAt(pos);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[!-']");
          }
        }
        if (result0 === null) {
          if (/^[*-[]/.test(input.charAt(pos))) {
            result0 = input.charAt(pos);
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("[*-[]");
            }
          }
          if (result0 === null) {
            if (/^[\]-~]/.test(input.charAt(pos))) {
              result0 = input.charAt(pos);
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("[\\]-~]");
              }
            }
            if (result0 === null) {
              result0 = parse_UTF8_NONASCII();
              if (result0 === null) {
                result0 = parse_LWS();
              }
            }
          }
        }
        return result0;
      }
      
      function parse_quoted_string() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          result1 = parse_DQUOTE();
          if (result1 !== null) {
            result2 = [];
            result3 = parse_qdtext();
            if (result3 === null) {
              result3 = parse_quoted_pair();
            }
            while (result3 !== null) {
              result2.push(result3);
              result3 = parse_qdtext();
              if (result3 === null) {
                result3 = parse_quoted_pair();
              }
            }
            if (result2 !== null) {
              result3 = parse_DQUOTE();
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                          return input.substring(pos, offset); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_quoted_string_clean() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SWS();
        if (result0 !== null) {
          result1 = parse_DQUOTE();
          if (result1 !== null) {
            result2 = [];
            result3 = parse_qdtext();
            if (result3 === null) {
              result3 = parse_quoted_pair();
            }
            while (result3 !== null) {
              result2.push(result3);
              result3 = parse_qdtext();
              if (result3 === null) {
                result3 = parse_quoted_pair();
              }
            }
            if (result2 !== null) {
              result3 = parse_DQUOTE();
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                                return input.substring(pos-1, offset+1); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_qdtext() {
        var result0;
        
        result0 = parse_LWS();
        if (result0 === null) {
          if (input.charCodeAt(pos) === 33) {
            result0 = "!";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"!\"");
            }
          }
          if (result0 === null) {
            if (/^[#-[]/.test(input.charAt(pos))) {
              result0 = input.charAt(pos);
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("[#-[]");
              }
            }
            if (result0 === null) {
              if (/^[\]-~]/.test(input.charAt(pos))) {
                result0 = input.charAt(pos);
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("[\\]-~]");
                }
              }
              if (result0 === null) {
                result0 = parse_UTF8_NONASCII();
              }
            }
          }
        }
        return result0;
      }
      
      function parse_quoted_pair() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        if (input.charCodeAt(pos) === 92) {
          result0 = "\\";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"\\\\\"");
          }
        }
        if (result0 !== null) {
          if (/^[\0-\t]/.test(input.charAt(pos))) {
            result1 = input.charAt(pos);
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("[\\0-\\t]");
            }
          }
          if (result1 === null) {
            if (/^[\x0B-\f]/.test(input.charAt(pos))) {
              result1 = input.charAt(pos);
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("[\\x0B-\\f]");
              }
            }
            if (result1 === null) {
              if (/^[\x0E-]/.test(input.charAt(pos))) {
                result1 = input.charAt(pos);
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("[\\x0E-]");
                }
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_SIP_URI_noparams() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_uri_scheme();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_userinfo();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result3 = parse_hostport();
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                            try {
                                data.uri = new URI(data.scheme, data.user, data.host, data.port);
                                delete data.scheme;
                                delete data.user;
                                delete data.host;
                                delete data.host_type;
                                delete data.port;
                              } catch(e) {
                                data = -1;
                              }})(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_SIP_URI() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_uri_scheme();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_userinfo();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result3 = parse_hostport();
              if (result3 !== null) {
                result4 = parse_uri_parameters();
                if (result4 !== null) {
                  result5 = parse_headers();
                  result5 = result5 !== null ? result5 : "";
                  if (result5 !== null) {
                    result0 = [result0, result1, result2, result3, result4, result5];
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                            var header;
                            try {
                                data.uri = new URI(data.scheme, data.user, data.host, data.port, data.uri_params, data.uri_headers);
                                delete data.scheme;
                                delete data.user;
                                delete data.host;
                                delete data.host_type;
                                delete data.port;
                                delete data.uri_params;
        
                                if (startRule === 'SIP_URI') { data = data.uri;}
                              } catch(e) {
                                data = -1;
                              }})(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_uri_scheme() {
        var result0;
        var pos0;
        
        if (input.substr(pos, 3).toLowerCase() === "sip") {
          result0 = input.substr(pos, 3);
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"sip\"");
          }
        }
        if (result0 === null) {
          pos0 = pos;
          if (input.substr(pos, 4).toLowerCase() === "sips") {
            result0 = input.substr(pos, 4);
            pos += 4;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"sips\"");
            }
          }
          if (result0 !== null) {
            result0 = (function(offset) {
                              data.scheme = uri_scheme.toLowerCase(); })(pos0);
          }
          if (result0 === null) {
            pos = pos0;
          }
        }
        return result0;
      }
      
      function parse_userinfo() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_user();
        if (result0 !== null) {
          pos2 = pos;
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_password();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 64) {
              result2 = "@";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"@\"");
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                            data.user = decodeURIComponent(input.substring(pos-1, offset));})(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_user() {
        var result0, result1;
        
        result1 = parse_unreserved();
        if (result1 === null) {
          result1 = parse_escaped();
          if (result1 === null) {
            result1 = parse_user_unreserved();
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_unreserved();
            if (result1 === null) {
              result1 = parse_escaped();
              if (result1 === null) {
                result1 = parse_user_unreserved();
              }
            }
          }
        } else {
          result0 = null;
        }
        return result0;
      }
      
      function parse_user_unreserved() {
        var result0;
        
        if (input.charCodeAt(pos) === 38) {
          result0 = "&";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"&\"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos) === 61) {
            result0 = "=";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"=\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos) === 43) {
              result0 = "+";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"+\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 36) {
                result0 = "$";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"$\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 44) {
                  result0 = ",";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\",\"");
                  }
                }
                if (result0 === null) {
                  if (input.charCodeAt(pos) === 59) {
                    result0 = ";";
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\";\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.charCodeAt(pos) === 63) {
                      result0 = "?";
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"?\"");
                      }
                    }
                    if (result0 === null) {
                      if (input.charCodeAt(pos) === 47) {
                        result0 = "/";
                        pos++;
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"/\"");
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_password() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result0 = [];
        result1 = parse_unreserved();
        if (result1 === null) {
          result1 = parse_escaped();
          if (result1 === null) {
            if (input.charCodeAt(pos) === 38) {
              result1 = "&";
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\"&\"");
              }
            }
            if (result1 === null) {
              if (input.charCodeAt(pos) === 61) {
                result1 = "=";
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"=\"");
                }
              }
              if (result1 === null) {
                if (input.charCodeAt(pos) === 43) {
                  result1 = "+";
                  pos++;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"+\"");
                  }
                }
                if (result1 === null) {
                  if (input.charCodeAt(pos) === 36) {
                    result1 = "$";
                    pos++;
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"$\"");
                    }
                  }
                  if (result1 === null) {
                    if (input.charCodeAt(pos) === 44) {
                      result1 = ",";
                      pos++;
                    } else {
                      result1 = null;
                      if (reportFailures === 0) {
                        matchFailed("\",\"");
                      }
                    }
                  }
                }
              }
            }
          }
        }
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_unreserved();
          if (result1 === null) {
            result1 = parse_escaped();
            if (result1 === null) {
              if (input.charCodeAt(pos) === 38) {
                result1 = "&";
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"&\"");
                }
              }
              if (result1 === null) {
                if (input.charCodeAt(pos) === 61) {
                  result1 = "=";
                  pos++;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"=\"");
                  }
                }
                if (result1 === null) {
                  if (input.charCodeAt(pos) === 43) {
                    result1 = "+";
                    pos++;
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"+\"");
                    }
                  }
                  if (result1 === null) {
                    if (input.charCodeAt(pos) === 36) {
                      result1 = "$";
                      pos++;
                    } else {
                      result1 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"$\"");
                      }
                    }
                    if (result1 === null) {
                      if (input.charCodeAt(pos) === 44) {
                        result1 = ",";
                        pos++;
                      } else {
                        result1 = null;
                        if (reportFailures === 0) {
                          matchFailed("\",\"");
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                            data.password = input.substring(pos, offset); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_hostport() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_host();
        if (result0 !== null) {
          pos1 = pos;
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_port();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos1;
            }
          } else {
            result1 = null;
            pos = pos1;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_host() {
        var result0;
        var pos0;
        
        pos0 = pos;
        result0 = parse_IPv4address();
        if (result0 === null) {
          result0 = parse_IPv6reference();
          if (result0 === null) {
            result0 = parse_hostname();
          }
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                            data.host = input.substring(pos, offset).toLowerCase();
                            return data.host; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_hostname() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = [];
        pos2 = pos;
        result1 = parse_domainlabel();
        if (result1 !== null) {
          if (input.charCodeAt(pos) === 46) {
            result2 = ".";
            pos++;
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("\".\"");
            }
          }
          if (result2 !== null) {
            result1 = [result1, result2];
          } else {
            result1 = null;
            pos = pos2;
          }
        } else {
          result1 = null;
          pos = pos2;
        }
        while (result1 !== null) {
          result0.push(result1);
          pos2 = pos;
          result1 = parse_domainlabel();
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 46) {
              result2 = ".";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\".\"");
              }
            }
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
        }
        if (result0 !== null) {
          result1 = parse_toplabel();
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 46) {
              result2 = ".";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\".\"");
              }
            }
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                          data.host_type = 'domain';
                          return input.substring(pos, offset); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_domainlabel() {
        var result0, result1;
        
        if (/^[a-zA-Z0-9_\-]/.test(input.charAt(pos))) {
          result1 = input.charAt(pos);
          pos++;
        } else {
          result1 = null;
          if (reportFailures === 0) {
            matchFailed("[a-zA-Z0-9_\\-]");
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            if (/^[a-zA-Z0-9_\-]/.test(input.charAt(pos))) {
              result1 = input.charAt(pos);
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("[a-zA-Z0-9_\\-]");
              }
            }
          }
        } else {
          result0 = null;
        }
        return result0;
      }
      
      function parse_toplabel() {
        var result0, result1;
        
        if (/^[a-zA-Z0-9_\-]/.test(input.charAt(pos))) {
          result1 = input.charAt(pos);
          pos++;
        } else {
          result1 = null;
          if (reportFailures === 0) {
            matchFailed("[a-zA-Z0-9_\\-]");
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            if (/^[a-zA-Z0-9_\-]/.test(input.charAt(pos))) {
              result1 = input.charAt(pos);
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("[a-zA-Z0-9_\\-]");
              }
            }
          }
        } else {
          result0 = null;
        }
        return result0;
      }
      
      function parse_IPv6reference() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 91) {
          result0 = "[";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"[\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_IPv6address();
          if (result1 !== null) {
            if (input.charCodeAt(pos) === 93) {
              result2 = "]";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"]\"");
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                            data.host_type = 'IPv6';
                            return input.substring(pos, offset); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_IPv6address() {
        var result0, result1, result2, result3, result4, result5, result6, result7, result8, result9, result10, result11, result12;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_h16();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_h16();
            if (result2 !== null) {
              if (input.charCodeAt(pos) === 58) {
                result3 = ":";
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\":\"");
                }
              }
              if (result3 !== null) {
                result4 = parse_h16();
                if (result4 !== null) {
                  if (input.charCodeAt(pos) === 58) {
                    result5 = ":";
                    pos++;
                  } else {
                    result5 = null;
                    if (reportFailures === 0) {
                      matchFailed("\":\"");
                    }
                  }
                  if (result5 !== null) {
                    result6 = parse_h16();
                    if (result6 !== null) {
                      if (input.charCodeAt(pos) === 58) {
                        result7 = ":";
                        pos++;
                      } else {
                        result7 = null;
                        if (reportFailures === 0) {
                          matchFailed("\":\"");
                        }
                      }
                      if (result7 !== null) {
                        result8 = parse_h16();
                        if (result8 !== null) {
                          if (input.charCodeAt(pos) === 58) {
                            result9 = ":";
                            pos++;
                          } else {
                            result9 = null;
                            if (reportFailures === 0) {
                              matchFailed("\":\"");
                            }
                          }
                          if (result9 !== null) {
                            result10 = parse_h16();
                            if (result10 !== null) {
                              if (input.charCodeAt(pos) === 58) {
                                result11 = ":";
                                pos++;
                              } else {
                                result11 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\":\"");
                                }
                              }
                              if (result11 !== null) {
                                result12 = parse_ls32();
                                if (result12 !== null) {
                                  result0 = [result0, result1, result2, result3, result4, result5, result6, result7, result8, result9, result10, result11, result12];
                                } else {
                                  result0 = null;
                                  pos = pos1;
                                }
                              } else {
                                result0 = null;
                                pos = pos1;
                              }
                            } else {
                              result0 = null;
                              pos = pos1;
                            }
                          } else {
                            result0 = null;
                            pos = pos1;
                          }
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 === null) {
          pos1 = pos;
          if (input.substr(pos, 2) === "::") {
            result0 = "::";
            pos += 2;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"::\"");
            }
          }
          if (result0 !== null) {
            result1 = parse_h16();
            if (result1 !== null) {
              if (input.charCodeAt(pos) === 58) {
                result2 = ":";
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\":\"");
                }
              }
              if (result2 !== null) {
                result3 = parse_h16();
                if (result3 !== null) {
                  if (input.charCodeAt(pos) === 58) {
                    result4 = ":";
                    pos++;
                  } else {
                    result4 = null;
                    if (reportFailures === 0) {
                      matchFailed("\":\"");
                    }
                  }
                  if (result4 !== null) {
                    result5 = parse_h16();
                    if (result5 !== null) {
                      if (input.charCodeAt(pos) === 58) {
                        result6 = ":";
                        pos++;
                      } else {
                        result6 = null;
                        if (reportFailures === 0) {
                          matchFailed("\":\"");
                        }
                      }
                      if (result6 !== null) {
                        result7 = parse_h16();
                        if (result7 !== null) {
                          if (input.charCodeAt(pos) === 58) {
                            result8 = ":";
                            pos++;
                          } else {
                            result8 = null;
                            if (reportFailures === 0) {
                              matchFailed("\":\"");
                            }
                          }
                          if (result8 !== null) {
                            result9 = parse_h16();
                            if (result9 !== null) {
                              if (input.charCodeAt(pos) === 58) {
                                result10 = ":";
                                pos++;
                              } else {
                                result10 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\":\"");
                                }
                              }
                              if (result10 !== null) {
                                result11 = parse_ls32();
                                if (result11 !== null) {
                                  result0 = [result0, result1, result2, result3, result4, result5, result6, result7, result8, result9, result10, result11];
                                } else {
                                  result0 = null;
                                  pos = pos1;
                                }
                              } else {
                                result0 = null;
                                pos = pos1;
                              }
                            } else {
                              result0 = null;
                              pos = pos1;
                            }
                          } else {
                            result0 = null;
                            pos = pos1;
                          }
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 === null) {
            pos1 = pos;
            if (input.substr(pos, 2) === "::") {
              result0 = "::";
              pos += 2;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"::\"");
              }
            }
            if (result0 !== null) {
              result1 = parse_h16();
              if (result1 !== null) {
                if (input.charCodeAt(pos) === 58) {
                  result2 = ":";
                  pos++;
                } else {
                  result2 = null;
                  if (reportFailures === 0) {
                    matchFailed("\":\"");
                  }
                }
                if (result2 !== null) {
                  result3 = parse_h16();
                  if (result3 !== null) {
                    if (input.charCodeAt(pos) === 58) {
                      result4 = ":";
                      pos++;
                    } else {
                      result4 = null;
                      if (reportFailures === 0) {
                        matchFailed("\":\"");
                      }
                    }
                    if (result4 !== null) {
                      result5 = parse_h16();
                      if (result5 !== null) {
                        if (input.charCodeAt(pos) === 58) {
                          result6 = ":";
                          pos++;
                        } else {
                          result6 = null;
                          if (reportFailures === 0) {
                            matchFailed("\":\"");
                          }
                        }
                        if (result6 !== null) {
                          result7 = parse_h16();
                          if (result7 !== null) {
                            if (input.charCodeAt(pos) === 58) {
                              result8 = ":";
                              pos++;
                            } else {
                              result8 = null;
                              if (reportFailures === 0) {
                                matchFailed("\":\"");
                              }
                            }
                            if (result8 !== null) {
                              result9 = parse_ls32();
                              if (result9 !== null) {
                                result0 = [result0, result1, result2, result3, result4, result5, result6, result7, result8, result9];
                              } else {
                                result0 = null;
                                pos = pos1;
                              }
                            } else {
                              result0 = null;
                              pos = pos1;
                            }
                          } else {
                            result0 = null;
                            pos = pos1;
                          }
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
            if (result0 === null) {
              pos1 = pos;
              if (input.substr(pos, 2) === "::") {
                result0 = "::";
                pos += 2;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"::\"");
                }
              }
              if (result0 !== null) {
                result1 = parse_h16();
                if (result1 !== null) {
                  if (input.charCodeAt(pos) === 58) {
                    result2 = ":";
                    pos++;
                  } else {
                    result2 = null;
                    if (reportFailures === 0) {
                      matchFailed("\":\"");
                    }
                  }
                  if (result2 !== null) {
                    result3 = parse_h16();
                    if (result3 !== null) {
                      if (input.charCodeAt(pos) === 58) {
                        result4 = ":";
                        pos++;
                      } else {
                        result4 = null;
                        if (reportFailures === 0) {
                          matchFailed("\":\"");
                        }
                      }
                      if (result4 !== null) {
                        result5 = parse_h16();
                        if (result5 !== null) {
                          if (input.charCodeAt(pos) === 58) {
                            result6 = ":";
                            pos++;
                          } else {
                            result6 = null;
                            if (reportFailures === 0) {
                              matchFailed("\":\"");
                            }
                          }
                          if (result6 !== null) {
                            result7 = parse_ls32();
                            if (result7 !== null) {
                              result0 = [result0, result1, result2, result3, result4, result5, result6, result7];
                            } else {
                              result0 = null;
                              pos = pos1;
                            }
                          } else {
                            result0 = null;
                            pos = pos1;
                          }
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
              if (result0 === null) {
                pos1 = pos;
                if (input.substr(pos, 2) === "::") {
                  result0 = "::";
                  pos += 2;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"::\"");
                  }
                }
                if (result0 !== null) {
                  result1 = parse_h16();
                  if (result1 !== null) {
                    if (input.charCodeAt(pos) === 58) {
                      result2 = ":";
                      pos++;
                    } else {
                      result2 = null;
                      if (reportFailures === 0) {
                        matchFailed("\":\"");
                      }
                    }
                    if (result2 !== null) {
                      result3 = parse_h16();
                      if (result3 !== null) {
                        if (input.charCodeAt(pos) === 58) {
                          result4 = ":";
                          pos++;
                        } else {
                          result4 = null;
                          if (reportFailures === 0) {
                            matchFailed("\":\"");
                          }
                        }
                        if (result4 !== null) {
                          result5 = parse_ls32();
                          if (result5 !== null) {
                            result0 = [result0, result1, result2, result3, result4, result5];
                          } else {
                            result0 = null;
                            pos = pos1;
                          }
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
                if (result0 === null) {
                  pos1 = pos;
                  if (input.substr(pos, 2) === "::") {
                    result0 = "::";
                    pos += 2;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"::\"");
                    }
                  }
                  if (result0 !== null) {
                    result1 = parse_h16();
                    if (result1 !== null) {
                      if (input.charCodeAt(pos) === 58) {
                        result2 = ":";
                        pos++;
                      } else {
                        result2 = null;
                        if (reportFailures === 0) {
                          matchFailed("\":\"");
                        }
                      }
                      if (result2 !== null) {
                        result3 = parse_ls32();
                        if (result3 !== null) {
                          result0 = [result0, result1, result2, result3];
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                  if (result0 === null) {
                    pos1 = pos;
                    if (input.substr(pos, 2) === "::") {
                      result0 = "::";
                      pos += 2;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"::\"");
                      }
                    }
                    if (result0 !== null) {
                      result1 = parse_ls32();
                      if (result1 !== null) {
                        result0 = [result0, result1];
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                    if (result0 === null) {
                      pos1 = pos;
                      if (input.substr(pos, 2) === "::") {
                        result0 = "::";
                        pos += 2;
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"::\"");
                        }
                      }
                      if (result0 !== null) {
                        result1 = parse_h16();
                        if (result1 !== null) {
                          result0 = [result0, result1];
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                      if (result0 === null) {
                        pos1 = pos;
                        result0 = parse_h16();
                        if (result0 !== null) {
                          if (input.substr(pos, 2) === "::") {
                            result1 = "::";
                            pos += 2;
                          } else {
                            result1 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"::\"");
                            }
                          }
                          if (result1 !== null) {
                            result2 = parse_h16();
                            if (result2 !== null) {
                              if (input.charCodeAt(pos) === 58) {
                                result3 = ":";
                                pos++;
                              } else {
                                result3 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\":\"");
                                }
                              }
                              if (result3 !== null) {
                                result4 = parse_h16();
                                if (result4 !== null) {
                                  if (input.charCodeAt(pos) === 58) {
                                    result5 = ":";
                                    pos++;
                                  } else {
                                    result5 = null;
                                    if (reportFailures === 0) {
                                      matchFailed("\":\"");
                                    }
                                  }
                                  if (result5 !== null) {
                                    result6 = parse_h16();
                                    if (result6 !== null) {
                                      if (input.charCodeAt(pos) === 58) {
                                        result7 = ":";
                                        pos++;
                                      } else {
                                        result7 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\":\"");
                                        }
                                      }
                                      if (result7 !== null) {
                                        result8 = parse_h16();
                                        if (result8 !== null) {
                                          if (input.charCodeAt(pos) === 58) {
                                            result9 = ":";
                                            pos++;
                                          } else {
                                            result9 = null;
                                            if (reportFailures === 0) {
                                              matchFailed("\":\"");
                                            }
                                          }
                                          if (result9 !== null) {
                                            result10 = parse_ls32();
                                            if (result10 !== null) {
                                              result0 = [result0, result1, result2, result3, result4, result5, result6, result7, result8, result9, result10];
                                            } else {
                                              result0 = null;
                                              pos = pos1;
                                            }
                                          } else {
                                            result0 = null;
                                            pos = pos1;
                                          }
                                        } else {
                                          result0 = null;
                                          pos = pos1;
                                        }
                                      } else {
                                        result0 = null;
                                        pos = pos1;
                                      }
                                    } else {
                                      result0 = null;
                                      pos = pos1;
                                    }
                                  } else {
                                    result0 = null;
                                    pos = pos1;
                                  }
                                } else {
                                  result0 = null;
                                  pos = pos1;
                                }
                              } else {
                                result0 = null;
                                pos = pos1;
                              }
                            } else {
                              result0 = null;
                              pos = pos1;
                            }
                          } else {
                            result0 = null;
                            pos = pos1;
                          }
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                        if (result0 === null) {
                          pos1 = pos;
                          result0 = parse_h16();
                          if (result0 !== null) {
                            pos2 = pos;
                            if (input.charCodeAt(pos) === 58) {
                              result1 = ":";
                              pos++;
                            } else {
                              result1 = null;
                              if (reportFailures === 0) {
                                matchFailed("\":\"");
                              }
                            }
                            if (result1 !== null) {
                              result2 = parse_h16();
                              if (result2 !== null) {
                                result1 = [result1, result2];
                              } else {
                                result1 = null;
                                pos = pos2;
                              }
                            } else {
                              result1 = null;
                              pos = pos2;
                            }
                            result1 = result1 !== null ? result1 : "";
                            if (result1 !== null) {
                              if (input.substr(pos, 2) === "::") {
                                result2 = "::";
                                pos += 2;
                              } else {
                                result2 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\"::\"");
                                }
                              }
                              if (result2 !== null) {
                                result3 = parse_h16();
                                if (result3 !== null) {
                                  if (input.charCodeAt(pos) === 58) {
                                    result4 = ":";
                                    pos++;
                                  } else {
                                    result4 = null;
                                    if (reportFailures === 0) {
                                      matchFailed("\":\"");
                                    }
                                  }
                                  if (result4 !== null) {
                                    result5 = parse_h16();
                                    if (result5 !== null) {
                                      if (input.charCodeAt(pos) === 58) {
                                        result6 = ":";
                                        pos++;
                                      } else {
                                        result6 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\":\"");
                                        }
                                      }
                                      if (result6 !== null) {
                                        result7 = parse_h16();
                                        if (result7 !== null) {
                                          if (input.charCodeAt(pos) === 58) {
                                            result8 = ":";
                                            pos++;
                                          } else {
                                            result8 = null;
                                            if (reportFailures === 0) {
                                              matchFailed("\":\"");
                                            }
                                          }
                                          if (result8 !== null) {
                                            result9 = parse_ls32();
                                            if (result9 !== null) {
                                              result0 = [result0, result1, result2, result3, result4, result5, result6, result7, result8, result9];
                                            } else {
                                              result0 = null;
                                              pos = pos1;
                                            }
                                          } else {
                                            result0 = null;
                                            pos = pos1;
                                          }
                                        } else {
                                          result0 = null;
                                          pos = pos1;
                                        }
                                      } else {
                                        result0 = null;
                                        pos = pos1;
                                      }
                                    } else {
                                      result0 = null;
                                      pos = pos1;
                                    }
                                  } else {
                                    result0 = null;
                                    pos = pos1;
                                  }
                                } else {
                                  result0 = null;
                                  pos = pos1;
                                }
                              } else {
                                result0 = null;
                                pos = pos1;
                              }
                            } else {
                              result0 = null;
                              pos = pos1;
                            }
                          } else {
                            result0 = null;
                            pos = pos1;
                          }
                          if (result0 === null) {
                            pos1 = pos;
                            result0 = parse_h16();
                            if (result0 !== null) {
                              pos2 = pos;
                              if (input.charCodeAt(pos) === 58) {
                                result1 = ":";
                                pos++;
                              } else {
                                result1 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\":\"");
                                }
                              }
                              if (result1 !== null) {
                                result2 = parse_h16();
                                if (result2 !== null) {
                                  result1 = [result1, result2];
                                } else {
                                  result1 = null;
                                  pos = pos2;
                                }
                              } else {
                                result1 = null;
                                pos = pos2;
                              }
                              result1 = result1 !== null ? result1 : "";
                              if (result1 !== null) {
                                pos2 = pos;
                                if (input.charCodeAt(pos) === 58) {
                                  result2 = ":";
                                  pos++;
                                } else {
                                  result2 = null;
                                  if (reportFailures === 0) {
                                    matchFailed("\":\"");
                                  }
                                }
                                if (result2 !== null) {
                                  result3 = parse_h16();
                                  if (result3 !== null) {
                                    result2 = [result2, result3];
                                  } else {
                                    result2 = null;
                                    pos = pos2;
                                  }
                                } else {
                                  result2 = null;
                                  pos = pos2;
                                }
                                result2 = result2 !== null ? result2 : "";
                                if (result2 !== null) {
                                  if (input.substr(pos, 2) === "::") {
                                    result3 = "::";
                                    pos += 2;
                                  } else {
                                    result3 = null;
                                    if (reportFailures === 0) {
                                      matchFailed("\"::\"");
                                    }
                                  }
                                  if (result3 !== null) {
                                    result4 = parse_h16();
                                    if (result4 !== null) {
                                      if (input.charCodeAt(pos) === 58) {
                                        result5 = ":";
                                        pos++;
                                      } else {
                                        result5 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\":\"");
                                        }
                                      }
                                      if (result5 !== null) {
                                        result6 = parse_h16();
                                        if (result6 !== null) {
                                          if (input.charCodeAt(pos) === 58) {
                                            result7 = ":";
                                            pos++;
                                          } else {
                                            result7 = null;
                                            if (reportFailures === 0) {
                                              matchFailed("\":\"");
                                            }
                                          }
                                          if (result7 !== null) {
                                            result8 = parse_ls32();
                                            if (result8 !== null) {
                                              result0 = [result0, result1, result2, result3, result4, result5, result6, result7, result8];
                                            } else {
                                              result0 = null;
                                              pos = pos1;
                                            }
                                          } else {
                                            result0 = null;
                                            pos = pos1;
                                          }
                                        } else {
                                          result0 = null;
                                          pos = pos1;
                                        }
                                      } else {
                                        result0 = null;
                                        pos = pos1;
                                      }
                                    } else {
                                      result0 = null;
                                      pos = pos1;
                                    }
                                  } else {
                                    result0 = null;
                                    pos = pos1;
                                  }
                                } else {
                                  result0 = null;
                                  pos = pos1;
                                }
                              } else {
                                result0 = null;
                                pos = pos1;
                              }
                            } else {
                              result0 = null;
                              pos = pos1;
                            }
                            if (result0 === null) {
                              pos1 = pos;
                              result0 = parse_h16();
                              if (result0 !== null) {
                                pos2 = pos;
                                if (input.charCodeAt(pos) === 58) {
                                  result1 = ":";
                                  pos++;
                                } else {
                                  result1 = null;
                                  if (reportFailures === 0) {
                                    matchFailed("\":\"");
                                  }
                                }
                                if (result1 !== null) {
                                  result2 = parse_h16();
                                  if (result2 !== null) {
                                    result1 = [result1, result2];
                                  } else {
                                    result1 = null;
                                    pos = pos2;
                                  }
                                } else {
                                  result1 = null;
                                  pos = pos2;
                                }
                                result1 = result1 !== null ? result1 : "";
                                if (result1 !== null) {
                                  pos2 = pos;
                                  if (input.charCodeAt(pos) === 58) {
                                    result2 = ":";
                                    pos++;
                                  } else {
                                    result2 = null;
                                    if (reportFailures === 0) {
                                      matchFailed("\":\"");
                                    }
                                  }
                                  if (result2 !== null) {
                                    result3 = parse_h16();
                                    if (result3 !== null) {
                                      result2 = [result2, result3];
                                    } else {
                                      result2 = null;
                                      pos = pos2;
                                    }
                                  } else {
                                    result2 = null;
                                    pos = pos2;
                                  }
                                  result2 = result2 !== null ? result2 : "";
                                  if (result2 !== null) {
                                    pos2 = pos;
                                    if (input.charCodeAt(pos) === 58) {
                                      result3 = ":";
                                      pos++;
                                    } else {
                                      result3 = null;
                                      if (reportFailures === 0) {
                                        matchFailed("\":\"");
                                      }
                                    }
                                    if (result3 !== null) {
                                      result4 = parse_h16();
                                      if (result4 !== null) {
                                        result3 = [result3, result4];
                                      } else {
                                        result3 = null;
                                        pos = pos2;
                                      }
                                    } else {
                                      result3 = null;
                                      pos = pos2;
                                    }
                                    result3 = result3 !== null ? result3 : "";
                                    if (result3 !== null) {
                                      if (input.substr(pos, 2) === "::") {
                                        result4 = "::";
                                        pos += 2;
                                      } else {
                                        result4 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\"::\"");
                                        }
                                      }
                                      if (result4 !== null) {
                                        result5 = parse_h16();
                                        if (result5 !== null) {
                                          if (input.charCodeAt(pos) === 58) {
                                            result6 = ":";
                                            pos++;
                                          } else {
                                            result6 = null;
                                            if (reportFailures === 0) {
                                              matchFailed("\":\"");
                                            }
                                          }
                                          if (result6 !== null) {
                                            result7 = parse_ls32();
                                            if (result7 !== null) {
                                              result0 = [result0, result1, result2, result3, result4, result5, result6, result7];
                                            } else {
                                              result0 = null;
                                              pos = pos1;
                                            }
                                          } else {
                                            result0 = null;
                                            pos = pos1;
                                          }
                                        } else {
                                          result0 = null;
                                          pos = pos1;
                                        }
                                      } else {
                                        result0 = null;
                                        pos = pos1;
                                      }
                                    } else {
                                      result0 = null;
                                      pos = pos1;
                                    }
                                  } else {
                                    result0 = null;
                                    pos = pos1;
                                  }
                                } else {
                                  result0 = null;
                                  pos = pos1;
                                }
                              } else {
                                result0 = null;
                                pos = pos1;
                              }
                              if (result0 === null) {
                                pos1 = pos;
                                result0 = parse_h16();
                                if (result0 !== null) {
                                  pos2 = pos;
                                  if (input.charCodeAt(pos) === 58) {
                                    result1 = ":";
                                    pos++;
                                  } else {
                                    result1 = null;
                                    if (reportFailures === 0) {
                                      matchFailed("\":\"");
                                    }
                                  }
                                  if (result1 !== null) {
                                    result2 = parse_h16();
                                    if (result2 !== null) {
                                      result1 = [result1, result2];
                                    } else {
                                      result1 = null;
                                      pos = pos2;
                                    }
                                  } else {
                                    result1 = null;
                                    pos = pos2;
                                  }
                                  result1 = result1 !== null ? result1 : "";
                                  if (result1 !== null) {
                                    pos2 = pos;
                                    if (input.charCodeAt(pos) === 58) {
                                      result2 = ":";
                                      pos++;
                                    } else {
                                      result2 = null;
                                      if (reportFailures === 0) {
                                        matchFailed("\":\"");
                                      }
                                    }
                                    if (result2 !== null) {
                                      result3 = parse_h16();
                                      if (result3 !== null) {
                                        result2 = [result2, result3];
                                      } else {
                                        result2 = null;
                                        pos = pos2;
                                      }
                                    } else {
                                      result2 = null;
                                      pos = pos2;
                                    }
                                    result2 = result2 !== null ? result2 : "";
                                    if (result2 !== null) {
                                      pos2 = pos;
                                      if (input.charCodeAt(pos) === 58) {
                                        result3 = ":";
                                        pos++;
                                      } else {
                                        result3 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\":\"");
                                        }
                                      }
                                      if (result3 !== null) {
                                        result4 = parse_h16();
                                        if (result4 !== null) {
                                          result3 = [result3, result4];
                                        } else {
                                          result3 = null;
                                          pos = pos2;
                                        }
                                      } else {
                                        result3 = null;
                                        pos = pos2;
                                      }
                                      result3 = result3 !== null ? result3 : "";
                                      if (result3 !== null) {
                                        pos2 = pos;
                                        if (input.charCodeAt(pos) === 58) {
                                          result4 = ":";
                                          pos++;
                                        } else {
                                          result4 = null;
                                          if (reportFailures === 0) {
                                            matchFailed("\":\"");
                                          }
                                        }
                                        if (result4 !== null) {
                                          result5 = parse_h16();
                                          if (result5 !== null) {
                                            result4 = [result4, result5];
                                          } else {
                                            result4 = null;
                                            pos = pos2;
                                          }
                                        } else {
                                          result4 = null;
                                          pos = pos2;
                                        }
                                        result4 = result4 !== null ? result4 : "";
                                        if (result4 !== null) {
                                          if (input.substr(pos, 2) === "::") {
                                            result5 = "::";
                                            pos += 2;
                                          } else {
                                            result5 = null;
                                            if (reportFailures === 0) {
                                              matchFailed("\"::\"");
                                            }
                                          }
                                          if (result5 !== null) {
                                            result6 = parse_ls32();
                                            if (result6 !== null) {
                                              result0 = [result0, result1, result2, result3, result4, result5, result6];
                                            } else {
                                              result0 = null;
                                              pos = pos1;
                                            }
                                          } else {
                                            result0 = null;
                                            pos = pos1;
                                          }
                                        } else {
                                          result0 = null;
                                          pos = pos1;
                                        }
                                      } else {
                                        result0 = null;
                                        pos = pos1;
                                      }
                                    } else {
                                      result0 = null;
                                      pos = pos1;
                                    }
                                  } else {
                                    result0 = null;
                                    pos = pos1;
                                  }
                                } else {
                                  result0 = null;
                                  pos = pos1;
                                }
                                if (result0 === null) {
                                  pos1 = pos;
                                  result0 = parse_h16();
                                  if (result0 !== null) {
                                    pos2 = pos;
                                    if (input.charCodeAt(pos) === 58) {
                                      result1 = ":";
                                      pos++;
                                    } else {
                                      result1 = null;
                                      if (reportFailures === 0) {
                                        matchFailed("\":\"");
                                      }
                                    }
                                    if (result1 !== null) {
                                      result2 = parse_h16();
                                      if (result2 !== null) {
                                        result1 = [result1, result2];
                                      } else {
                                        result1 = null;
                                        pos = pos2;
                                      }
                                    } else {
                                      result1 = null;
                                      pos = pos2;
                                    }
                                    result1 = result1 !== null ? result1 : "";
                                    if (result1 !== null) {
                                      pos2 = pos;
                                      if (input.charCodeAt(pos) === 58) {
                                        result2 = ":";
                                        pos++;
                                      } else {
                                        result2 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\":\"");
                                        }
                                      }
                                      if (result2 !== null) {
                                        result3 = parse_h16();
                                        if (result3 !== null) {
                                          result2 = [result2, result3];
                                        } else {
                                          result2 = null;
                                          pos = pos2;
                                        }
                                      } else {
                                        result2 = null;
                                        pos = pos2;
                                      }
                                      result2 = result2 !== null ? result2 : "";
                                      if (result2 !== null) {
                                        pos2 = pos;
                                        if (input.charCodeAt(pos) === 58) {
                                          result3 = ":";
                                          pos++;
                                        } else {
                                          result3 = null;
                                          if (reportFailures === 0) {
                                            matchFailed("\":\"");
                                          }
                                        }
                                        if (result3 !== null) {
                                          result4 = parse_h16();
                                          if (result4 !== null) {
                                            result3 = [result3, result4];
                                          } else {
                                            result3 = null;
                                            pos = pos2;
                                          }
                                        } else {
                                          result3 = null;
                                          pos = pos2;
                                        }
                                        result3 = result3 !== null ? result3 : "";
                                        if (result3 !== null) {
                                          pos2 = pos;
                                          if (input.charCodeAt(pos) === 58) {
                                            result4 = ":";
                                            pos++;
                                          } else {
                                            result4 = null;
                                            if (reportFailures === 0) {
                                              matchFailed("\":\"");
                                            }
                                          }
                                          if (result4 !== null) {
                                            result5 = parse_h16();
                                            if (result5 !== null) {
                                              result4 = [result4, result5];
                                            } else {
                                              result4 = null;
                                              pos = pos2;
                                            }
                                          } else {
                                            result4 = null;
                                            pos = pos2;
                                          }
                                          result4 = result4 !== null ? result4 : "";
                                          if (result4 !== null) {
                                            pos2 = pos;
                                            if (input.charCodeAt(pos) === 58) {
                                              result5 = ":";
                                              pos++;
                                            } else {
                                              result5 = null;
                                              if (reportFailures === 0) {
                                                matchFailed("\":\"");
                                              }
                                            }
                                            if (result5 !== null) {
                                              result6 = parse_h16();
                                              if (result6 !== null) {
                                                result5 = [result5, result6];
                                              } else {
                                                result5 = null;
                                                pos = pos2;
                                              }
                                            } else {
                                              result5 = null;
                                              pos = pos2;
                                            }
                                            result5 = result5 !== null ? result5 : "";
                                            if (result5 !== null) {
                                              if (input.substr(pos, 2) === "::") {
                                                result6 = "::";
                                                pos += 2;
                                              } else {
                                                result6 = null;
                                                if (reportFailures === 0) {
                                                  matchFailed("\"::\"");
                                                }
                                              }
                                              if (result6 !== null) {
                                                result7 = parse_h16();
                                                if (result7 !== null) {
                                                  result0 = [result0, result1, result2, result3, result4, result5, result6, result7];
                                                } else {
                                                  result0 = null;
                                                  pos = pos1;
                                                }
                                              } else {
                                                result0 = null;
                                                pos = pos1;
                                              }
                                            } else {
                                              result0 = null;
                                              pos = pos1;
                                            }
                                          } else {
                                            result0 = null;
                                            pos = pos1;
                                          }
                                        } else {
                                          result0 = null;
                                          pos = pos1;
                                        }
                                      } else {
                                        result0 = null;
                                        pos = pos1;
                                      }
                                    } else {
                                      result0 = null;
                                      pos = pos1;
                                    }
                                  } else {
                                    result0 = null;
                                    pos = pos1;
                                  }
                                  if (result0 === null) {
                                    pos1 = pos;
                                    result0 = parse_h16();
                                    if (result0 !== null) {
                                      pos2 = pos;
                                      if (input.charCodeAt(pos) === 58) {
                                        result1 = ":";
                                        pos++;
                                      } else {
                                        result1 = null;
                                        if (reportFailures === 0) {
                                          matchFailed("\":\"");
                                        }
                                      }
                                      if (result1 !== null) {
                                        result2 = parse_h16();
                                        if (result2 !== null) {
                                          result1 = [result1, result2];
                                        } else {
                                          result1 = null;
                                          pos = pos2;
                                        }
                                      } else {
                                        result1 = null;
                                        pos = pos2;
                                      }
                                      result1 = result1 !== null ? result1 : "";
                                      if (result1 !== null) {
                                        pos2 = pos;
                                        if (input.charCodeAt(pos) === 58) {
                                          result2 = ":";
                                          pos++;
                                        } else {
                                          result2 = null;
                                          if (reportFailures === 0) {
                                            matchFailed("\":\"");
                                          }
                                        }
                                        if (result2 !== null) {
                                          result3 = parse_h16();
                                          if (result3 !== null) {
                                            result2 = [result2, result3];
                                          } else {
                                            result2 = null;
                                            pos = pos2;
                                          }
                                        } else {
                                          result2 = null;
                                          pos = pos2;
                                        }
                                        result2 = result2 !== null ? result2 : "";
                                        if (result2 !== null) {
                                          pos2 = pos;
                                          if (input.charCodeAt(pos) === 58) {
                                            result3 = ":";
                                            pos++;
                                          } else {
                                            result3 = null;
                                            if (reportFailures === 0) {
                                              matchFailed("\":\"");
                                            }
                                          }
                                          if (result3 !== null) {
                                            result4 = parse_h16();
                                            if (result4 !== null) {
                                              result3 = [result3, result4];
                                            } else {
                                              result3 = null;
                                              pos = pos2;
                                            }
                                          } else {
                                            result3 = null;
                                            pos = pos2;
                                          }
                                          result3 = result3 !== null ? result3 : "";
                                          if (result3 !== null) {
                                            pos2 = pos;
                                            if (input.charCodeAt(pos) === 58) {
                                              result4 = ":";
                                              pos++;
                                            } else {
                                              result4 = null;
                                              if (reportFailures === 0) {
                                                matchFailed("\":\"");
                                              }
                                            }
                                            if (result4 !== null) {
                                              result5 = parse_h16();
                                              if (result5 !== null) {
                                                result4 = [result4, result5];
                                              } else {
                                                result4 = null;
                                                pos = pos2;
                                              }
                                            } else {
                                              result4 = null;
                                              pos = pos2;
                                            }
                                            result4 = result4 !== null ? result4 : "";
                                            if (result4 !== null) {
                                              pos2 = pos;
                                              if (input.charCodeAt(pos) === 58) {
                                                result5 = ":";
                                                pos++;
                                              } else {
                                                result5 = null;
                                                if (reportFailures === 0) {
                                                  matchFailed("\":\"");
                                                }
                                              }
                                              if (result5 !== null) {
                                                result6 = parse_h16();
                                                if (result6 !== null) {
                                                  result5 = [result5, result6];
                                                } else {
                                                  result5 = null;
                                                  pos = pos2;
                                                }
                                              } else {
                                                result5 = null;
                                                pos = pos2;
                                              }
                                              result5 = result5 !== null ? result5 : "";
                                              if (result5 !== null) {
                                                pos2 = pos;
                                                if (input.charCodeAt(pos) === 58) {
                                                  result6 = ":";
                                                  pos++;
                                                } else {
                                                  result6 = null;
                                                  if (reportFailures === 0) {
                                                    matchFailed("\":\"");
                                                  }
                                                }
                                                if (result6 !== null) {
                                                  result7 = parse_h16();
                                                  if (result7 !== null) {
                                                    result6 = [result6, result7];
                                                  } else {
                                                    result6 = null;
                                                    pos = pos2;
                                                  }
                                                } else {
                                                  result6 = null;
                                                  pos = pos2;
                                                }
                                                result6 = result6 !== null ? result6 : "";
                                                if (result6 !== null) {
                                                  if (input.substr(pos, 2) === "::") {
                                                    result7 = "::";
                                                    pos += 2;
                                                  } else {
                                                    result7 = null;
                                                    if (reportFailures === 0) {
                                                      matchFailed("\"::\"");
                                                    }
                                                  }
                                                  if (result7 !== null) {
                                                    result0 = [result0, result1, result2, result3, result4, result5, result6, result7];
                                                  } else {
                                                    result0 = null;
                                                    pos = pos1;
                                                  }
                                                } else {
                                                  result0 = null;
                                                  pos = pos1;
                                                }
                                              } else {
                                                result0 = null;
                                                pos = pos1;
                                              }
                                            } else {
                                              result0 = null;
                                              pos = pos1;
                                            }
                                          } else {
                                            result0 = null;
                                            pos = pos1;
                                          }
                                        } else {
                                          result0 = null;
                                          pos = pos1;
                                        }
                                      } else {
                                        result0 = null;
                                        pos = pos1;
                                      }
                                    } else {
                                      result0 = null;
                                      pos = pos1;
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                          data.host_type = 'IPv6';
                          return input.substring(pos, offset); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_h16() {
        var result0, result1, result2, result3;
        var pos0;
        
        pos0 = pos;
        result0 = parse_HEXDIG();
        if (result0 !== null) {
          result1 = parse_HEXDIG();
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result2 = parse_HEXDIG();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result3 = parse_HEXDIG();
              result3 = result3 !== null ? result3 : "";
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_ls32() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        result0 = parse_h16();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_h16();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        if (result0 === null) {
          result0 = parse_IPv4address();
        }
        return result0;
      }
      
      function parse_IPv4address() {
        var result0, result1, result2, result3, result4, result5, result6;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_dec_octet();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 46) {
            result1 = ".";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\".\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_dec_octet();
            if (result2 !== null) {
              if (input.charCodeAt(pos) === 46) {
                result3 = ".";
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\".\"");
                }
              }
              if (result3 !== null) {
                result4 = parse_dec_octet();
                if (result4 !== null) {
                  if (input.charCodeAt(pos) === 46) {
                    result5 = ".";
                    pos++;
                  } else {
                    result5 = null;
                    if (reportFailures === 0) {
                      matchFailed("\".\"");
                    }
                  }
                  if (result5 !== null) {
                    result6 = parse_dec_octet();
                    if (result6 !== null) {
                      result0 = [result0, result1, result2, result3, result4, result5, result6];
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                            data.host_type = 'IPv4';
                            return input.substring(pos, offset); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_dec_octet() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 2) === "25") {
          result0 = "25";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"25\"");
          }
        }
        if (result0 !== null) {
          if (/^[0-5]/.test(input.charAt(pos))) {
            result1 = input.charAt(pos);
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("[0-5]");
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          if (input.charCodeAt(pos) === 50) {
            result0 = "2";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"2\"");
            }
          }
          if (result0 !== null) {
            if (/^[0-4]/.test(input.charAt(pos))) {
              result1 = input.charAt(pos);
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("[0-4]");
              }
            }
            if (result1 !== null) {
              result2 = parse_DIGIT();
              if (result2 !== null) {
                result0 = [result0, result1, result2];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
          if (result0 === null) {
            pos0 = pos;
            if (input.charCodeAt(pos) === 49) {
              result0 = "1";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"1\"");
              }
            }
            if (result0 !== null) {
              result1 = parse_DIGIT();
              if (result1 !== null) {
                result2 = parse_DIGIT();
                if (result2 !== null) {
                  result0 = [result0, result1, result2];
                } else {
                  result0 = null;
                  pos = pos0;
                }
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
            if (result0 === null) {
              pos0 = pos;
              if (/^[1-9]/.test(input.charAt(pos))) {
                result0 = input.charAt(pos);
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("[1-9]");
                }
              }
              if (result0 !== null) {
                result1 = parse_DIGIT();
                if (result1 !== null) {
                  result0 = [result0, result1];
                } else {
                  result0 = null;
                  pos = pos0;
                }
              } else {
                result0 = null;
                pos = pos0;
              }
              if (result0 === null) {
                result0 = parse_DIGIT();
              }
            }
          }
        }
        return result0;
      }
      
      function parse_port() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_DIGIT();
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result1 = parse_DIGIT();
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result2 = parse_DIGIT();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result3 = parse_DIGIT();
              result3 = result3 !== null ? result3 : "";
              if (result3 !== null) {
                result4 = parse_DIGIT();
                result4 = result4 !== null ? result4 : "";
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, port) {
                            port = parseInt(port.join(''));
                            data.port = port;
                            return port; })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_uri_parameters() {
        var result0, result1, result2;
        var pos0;
        
        result0 = [];
        pos0 = pos;
        if (input.charCodeAt(pos) === 59) {
          result1 = ";";
          pos++;
        } else {
          result1 = null;
          if (reportFailures === 0) {
            matchFailed("\";\"");
          }
        }
        if (result1 !== null) {
          result2 = parse_uri_parameter();
          if (result2 !== null) {
            result1 = [result1, result2];
          } else {
            result1 = null;
            pos = pos0;
          }
        } else {
          result1 = null;
          pos = pos0;
        }
        while (result1 !== null) {
          result0.push(result1);
          pos0 = pos;
          if (input.charCodeAt(pos) === 59) {
            result1 = ";";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\";\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_uri_parameter();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos0;
            }
          } else {
            result1 = null;
            pos = pos0;
          }
        }
        return result0;
      }
      
      function parse_uri_parameter() {
        var result0;
        
        result0 = parse_transport_param();
        if (result0 === null) {
          result0 = parse_user_param();
          if (result0 === null) {
            result0 = parse_method_param();
            if (result0 === null) {
              result0 = parse_ttl_param();
              if (result0 === null) {
                result0 = parse_maddr_param();
                if (result0 === null) {
                  result0 = parse_lr_param();
                  if (result0 === null) {
                    result0 = parse_other_param();
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_transport_param() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 10).toLowerCase() === "transport=") {
          result0 = input.substr(pos, 10);
          pos += 10;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"transport=\"");
          }
        }
        if (result0 !== null) {
          if (input.substr(pos, 3).toLowerCase() === "udp") {
            result1 = input.substr(pos, 3);
            pos += 3;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"udp\"");
            }
          }
          if (result1 === null) {
            if (input.substr(pos, 3).toLowerCase() === "tcp") {
              result1 = input.substr(pos, 3);
              pos += 3;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\"tcp\"");
              }
            }
            if (result1 === null) {
              if (input.substr(pos, 4).toLowerCase() === "sctp") {
                result1 = input.substr(pos, 4);
                pos += 4;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"sctp\"");
                }
              }
              if (result1 === null) {
                if (input.substr(pos, 3).toLowerCase() === "tls") {
                  result1 = input.substr(pos, 3);
                  pos += 3;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"tls\"");
                  }
                }
                if (result1 === null) {
                  result1 = parse_token();
                }
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, transport) {
                              if(!data.uri_params) data.uri_params={};
                              data.uri_params['transport'] = transport.toLowerCase(); })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_user_param() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 5).toLowerCase() === "user=") {
          result0 = input.substr(pos, 5);
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"user=\"");
          }
        }
        if (result0 !== null) {
          if (input.substr(pos, 5).toLowerCase() === "phone") {
            result1 = input.substr(pos, 5);
            pos += 5;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"phone\"");
            }
          }
          if (result1 === null) {
            if (input.substr(pos, 2).toLowerCase() === "ip") {
              result1 = input.substr(pos, 2);
              pos += 2;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\"ip\"");
              }
            }
            if (result1 === null) {
              result1 = parse_token();
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, user) {
                              if(!data.uri_params) data.uri_params={};
                              data.uri_params['user'] = user.toLowerCase(); })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_method_param() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 7).toLowerCase() === "method=") {
          result0 = input.substr(pos, 7);
          pos += 7;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"method=\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_Method();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, method) {
                              if(!data.uri_params) data.uri_params={};
                              data.uri_params['method'] = method; })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_ttl_param() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 4).toLowerCase() === "ttl=") {
          result0 = input.substr(pos, 4);
          pos += 4;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"ttl=\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_ttl();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, ttl) {
                              if(!data.params) data.params={};
                              data.params['ttl'] = ttl; })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_maddr_param() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 6).toLowerCase() === "maddr=") {
          result0 = input.substr(pos, 6);
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"maddr=\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_host();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, maddr) {
                              if(!data.uri_params) data.uri_params={};
                              data.uri_params['maddr'] = maddr; })(pos0, result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_lr_param() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 2).toLowerCase() === "lr") {
          result0 = input.substr(pos, 2);
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"lr\"");
          }
        }
        if (result0 !== null) {
          pos2 = pos;
          if (input.charCodeAt(pos) === 61) {
            result1 = "=";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"=\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_token();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                              if(!data.uri_params) data.uri_params={};
                              data.uri_params['lr'] = undefined; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_other_param() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_pname();
        if (result0 !== null) {
          pos2 = pos;
          if (input.charCodeAt(pos) === 61) {
            result1 = "=";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"=\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_pvalue();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, param, value) {
                              if(!data.uri_params) data.uri_params = {};
                              if (typeof value === 'undefined'){
                                value = undefined;
                              }
                              else {
                                value = value[1];
                              }
                              data.uri_params[param.toLowerCase()] = value && value.toLowerCase();})(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_pname() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_paramchar();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_paramchar();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, pname) {return pname.join(''); })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_pvalue() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_paramchar();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_paramchar();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, pvalue) {return pvalue.join(''); })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_paramchar() {
        var result0;
        
        result0 = parse_param_unreserved();
        if (result0 === null) {
          result0 = parse_unreserved();
          if (result0 === null) {
            result0 = parse_escaped();
          }
        }
        return result0;
      }
      
      function parse_param_unreserved() {
        var result0;
        
        if (input.charCodeAt(pos) === 91) {
          result0 = "[";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"[\"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos) === 93) {
            result0 = "]";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"]\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos) === 47) {
              result0 = "/";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"/\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 58) {
                result0 = ":";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\":\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 38) {
                  result0 = "&";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"&\"");
                  }
                }
                if (result0 === null) {
                  if (input.charCodeAt(pos) === 43) {
                    result0 = "+";
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"+\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.charCodeAt(pos) === 36) {
                      result0 = "$";
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"$\"");
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_headers() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        
        pos0 = pos;
        if (input.charCodeAt(pos) === 63) {
          result0 = "?";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"?\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_header();
          if (result1 !== null) {
            result2 = [];
            pos1 = pos;
            if (input.charCodeAt(pos) === 38) {
              result3 = "&";
              pos++;
            } else {
              result3 = null;
              if (reportFailures === 0) {
                matchFailed("\"&\"");
              }
            }
            if (result3 !== null) {
              result4 = parse_header();
              if (result4 !== null) {
                result3 = [result3, result4];
              } else {
                result3 = null;
                pos = pos1;
              }
            } else {
              result3 = null;
              pos = pos1;
            }
            while (result3 !== null) {
              result2.push(result3);
              pos1 = pos;
              if (input.charCodeAt(pos) === 38) {
                result3 = "&";
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\"&\"");
                }
              }
              if (result3 !== null) {
                result4 = parse_header();
                if (result4 !== null) {
                  result3 = [result3, result4];
                } else {
                  result3 = null;
                  pos = pos1;
                }
              } else {
                result3 = null;
                pos = pos1;
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_header() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_hname();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 61) {
            result1 = "=";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"=\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_hvalue();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, hname, hvalue) {
                              hname = hname.join('').toLowerCase();
                              hvalue = hvalue.join('');
                              if(!data.uri_headers) data.uri_headers = {};
                              if (!data.uri_headers[hname]) {
                                data.uri_headers[hname] = [hvalue];
                              } else {
                                data.uri_headers[hname].push(hvalue);
                              }})(pos0, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_hname() {
        var result0, result1;
        
        result1 = parse_hnv_unreserved();
        if (result1 === null) {
          result1 = parse_unreserved();
          if (result1 === null) {
            result1 = parse_escaped();
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_hnv_unreserved();
            if (result1 === null) {
              result1 = parse_unreserved();
              if (result1 === null) {
                result1 = parse_escaped();
              }
            }
          }
        } else {
          result0 = null;
        }
        return result0;
      }
      
      function parse_hvalue() {
        var result0, result1;
        
        result0 = [];
        result1 = parse_hnv_unreserved();
        if (result1 === null) {
          result1 = parse_unreserved();
          if (result1 === null) {
            result1 = parse_escaped();
          }
        }
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_hnv_unreserved();
          if (result1 === null) {
            result1 = parse_unreserved();
            if (result1 === null) {
              result1 = parse_escaped();
            }
          }
        }
        return result0;
      }
      
      function parse_hnv_unreserved() {
        var result0;
        
        if (input.charCodeAt(pos) === 91) {
          result0 = "[";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"[\"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos) === 93) {
            result0 = "]";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"]\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos) === 47) {
              result0 = "/";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"/\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 63) {
                result0 = "?";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"?\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 58) {
                  result0 = ":";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\":\"");
                  }
                }
                if (result0 === null) {
                  if (input.charCodeAt(pos) === 43) {
                    result0 = "+";
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"+\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.charCodeAt(pos) === 36) {
                      result0 = "$";
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"$\"");
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_Request_Response() {
        var result0;
        
        result0 = parse_Status_Line();
        if (result0 === null) {
          result0 = parse_Request_Line();
        }
        return result0;
      }
      
      function parse_Request_Line() {
        var result0, result1, result2, result3, result4;
        var pos0;
        
        pos0 = pos;
        result0 = parse_Method();
        if (result0 !== null) {
          result1 = parse_SP();
          if (result1 !== null) {
            result2 = parse_Request_URI();
            if (result2 !== null) {
              result3 = parse_SP();
              if (result3 !== null) {
                result4 = parse_SIP_Version();
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos0;
                }
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Request_URI() {
        var result0;
        
        result0 = parse_SIP_URI();
        if (result0 === null) {
          result0 = parse_absoluteURI();
        }
        return result0;
      }
      
      function parse_absoluteURI() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        result0 = parse_scheme();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_hier_part();
            if (result2 === null) {
              result2 = parse_opaque_part();
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_hier_part() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_net_path();
        if (result0 === null) {
          result0 = parse_abs_path();
        }
        if (result0 !== null) {
          pos1 = pos;
          if (input.charCodeAt(pos) === 63) {
            result1 = "?";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"?\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_query();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos1;
            }
          } else {
            result1 = null;
            pos = pos1;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_net_path() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 2) === "//") {
          result0 = "//";
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"//\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_authority();
          if (result1 !== null) {
            result2 = parse_abs_path();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_abs_path() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        if (input.charCodeAt(pos) === 47) {
          result0 = "/";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"/\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_path_segments();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_opaque_part() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        result0 = parse_uric_no_slash();
        if (result0 !== null) {
          result1 = [];
          result2 = parse_uric();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_uric();
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_uric() {
        var result0;
        
        result0 = parse_reserved();
        if (result0 === null) {
          result0 = parse_unreserved();
          if (result0 === null) {
            result0 = parse_escaped();
          }
        }
        return result0;
      }
      
      function parse_uric_no_slash() {
        var result0;
        
        result0 = parse_unreserved();
        if (result0 === null) {
          result0 = parse_escaped();
          if (result0 === null) {
            if (input.charCodeAt(pos) === 59) {
              result0 = ";";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\";\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 63) {
                result0 = "?";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"?\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 58) {
                  result0 = ":";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\":\"");
                  }
                }
                if (result0 === null) {
                  if (input.charCodeAt(pos) === 64) {
                    result0 = "@";
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"@\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.charCodeAt(pos) === 38) {
                      result0 = "&";
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"&\"");
                      }
                    }
                    if (result0 === null) {
                      if (input.charCodeAt(pos) === 61) {
                        result0 = "=";
                        pos++;
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"=\"");
                        }
                      }
                      if (result0 === null) {
                        if (input.charCodeAt(pos) === 43) {
                          result0 = "+";
                          pos++;
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"+\"");
                          }
                        }
                        if (result0 === null) {
                          if (input.charCodeAt(pos) === 36) {
                            result0 = "$";
                            pos++;
                          } else {
                            result0 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"$\"");
                            }
                          }
                          if (result0 === null) {
                            if (input.charCodeAt(pos) === 44) {
                              result0 = ",";
                              pos++;
                            } else {
                              result0 = null;
                              if (reportFailures === 0) {
                                matchFailed("\",\"");
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_path_segments() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_segment();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          if (input.charCodeAt(pos) === 47) {
            result2 = "/";
            pos++;
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("\"/\"");
            }
          }
          if (result2 !== null) {
            result3 = parse_segment();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            if (input.charCodeAt(pos) === 47) {
              result2 = "/";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"/\"");
              }
            }
            if (result2 !== null) {
              result3 = parse_segment();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_segment() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = [];
        result1 = parse_pchar();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_pchar();
        }
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          if (input.charCodeAt(pos) === 59) {
            result2 = ";";
            pos++;
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("\";\"");
            }
          }
          if (result2 !== null) {
            result3 = parse_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            if (input.charCodeAt(pos) === 59) {
              result2 = ";";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\";\"");
              }
            }
            if (result2 !== null) {
              result3 = parse_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_param() {
        var result0, result1;
        
        result0 = [];
        result1 = parse_pchar();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_pchar();
        }
        return result0;
      }
      
      function parse_pchar() {
        var result0;
        
        result0 = parse_unreserved();
        if (result0 === null) {
          result0 = parse_escaped();
          if (result0 === null) {
            if (input.charCodeAt(pos) === 58) {
              result0 = ":";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\":\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 64) {
                result0 = "@";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"@\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 38) {
                  result0 = "&";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"&\"");
                  }
                }
                if (result0 === null) {
                  if (input.charCodeAt(pos) === 61) {
                    result0 = "=";
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"=\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.charCodeAt(pos) === 43) {
                      result0 = "+";
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"+\"");
                      }
                    }
                    if (result0 === null) {
                      if (input.charCodeAt(pos) === 36) {
                        result0 = "$";
                        pos++;
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"$\"");
                        }
                      }
                      if (result0 === null) {
                        if (input.charCodeAt(pos) === 44) {
                          result0 = ",";
                          pos++;
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("\",\"");
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_scheme() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_ALPHA();
        if (result0 !== null) {
          result1 = [];
          result2 = parse_ALPHA();
          if (result2 === null) {
            result2 = parse_DIGIT();
            if (result2 === null) {
              if (input.charCodeAt(pos) === 43) {
                result2 = "+";
                pos++;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"+\"");
                }
              }
              if (result2 === null) {
                if (input.charCodeAt(pos) === 45) {
                  result2 = "-";
                  pos++;
                } else {
                  result2 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"-\"");
                  }
                }
                if (result2 === null) {
                  if (input.charCodeAt(pos) === 46) {
                    result2 = ".";
                    pos++;
                  } else {
                    result2 = null;
                    if (reportFailures === 0) {
                      matchFailed("\".\"");
                    }
                  }
                }
              }
            }
          }
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_ALPHA();
            if (result2 === null) {
              result2 = parse_DIGIT();
              if (result2 === null) {
                if (input.charCodeAt(pos) === 43) {
                  result2 = "+";
                  pos++;
                } else {
                  result2 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"+\"");
                  }
                }
                if (result2 === null) {
                  if (input.charCodeAt(pos) === 45) {
                    result2 = "-";
                    pos++;
                  } else {
                    result2 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"-\"");
                    }
                  }
                  if (result2 === null) {
                    if (input.charCodeAt(pos) === 46) {
                      result2 = ".";
                      pos++;
                    } else {
                      result2 = null;
                      if (reportFailures === 0) {
                        matchFailed("\".\"");
                      }
                    }
                  }
                }
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                            data.scheme= input.substring(pos, offset); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_authority() {
        var result0;
        
        result0 = parse_srvr();
        if (result0 === null) {
          result0 = parse_reg_name();
        }
        return result0;
      }
      
      function parse_srvr() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_userinfo();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 64) {
            result1 = "@";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"@\"");
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result1 = parse_hostport();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        result0 = result0 !== null ? result0 : "";
        return result0;
      }
      
      function parse_reg_name() {
        var result0, result1;
        
        result1 = parse_unreserved();
        if (result1 === null) {
          result1 = parse_escaped();
          if (result1 === null) {
            if (input.charCodeAt(pos) === 36) {
              result1 = "$";
              pos++;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\"$\"");
              }
            }
            if (result1 === null) {
              if (input.charCodeAt(pos) === 44) {
                result1 = ",";
                pos++;
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\",\"");
                }
              }
              if (result1 === null) {
                if (input.charCodeAt(pos) === 59) {
                  result1 = ";";
                  pos++;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\";\"");
                  }
                }
                if (result1 === null) {
                  if (input.charCodeAt(pos) === 58) {
                    result1 = ":";
                    pos++;
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\":\"");
                    }
                  }
                  if (result1 === null) {
                    if (input.charCodeAt(pos) === 64) {
                      result1 = "@";
                      pos++;
                    } else {
                      result1 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"@\"");
                      }
                    }
                    if (result1 === null) {
                      if (input.charCodeAt(pos) === 38) {
                        result1 = "&";
                        pos++;
                      } else {
                        result1 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"&\"");
                        }
                      }
                      if (result1 === null) {
                        if (input.charCodeAt(pos) === 61) {
                          result1 = "=";
                          pos++;
                        } else {
                          result1 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"=\"");
                          }
                        }
                        if (result1 === null) {
                          if (input.charCodeAt(pos) === 43) {
                            result1 = "+";
                            pos++;
                          } else {
                            result1 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"+\"");
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_unreserved();
            if (result1 === null) {
              result1 = parse_escaped();
              if (result1 === null) {
                if (input.charCodeAt(pos) === 36) {
                  result1 = "$";
                  pos++;
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"$\"");
                  }
                }
                if (result1 === null) {
                  if (input.charCodeAt(pos) === 44) {
                    result1 = ",";
                    pos++;
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\",\"");
                    }
                  }
                  if (result1 === null) {
                    if (input.charCodeAt(pos) === 59) {
                      result1 = ";";
                      pos++;
                    } else {
                      result1 = null;
                      if (reportFailures === 0) {
                        matchFailed("\";\"");
                      }
                    }
                    if (result1 === null) {
                      if (input.charCodeAt(pos) === 58) {
                        result1 = ":";
                        pos++;
                      } else {
                        result1 = null;
                        if (reportFailures === 0) {
                          matchFailed("\":\"");
                        }
                      }
                      if (result1 === null) {
                        if (input.charCodeAt(pos) === 64) {
                          result1 = "@";
                          pos++;
                        } else {
                          result1 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"@\"");
                          }
                        }
                        if (result1 === null) {
                          if (input.charCodeAt(pos) === 38) {
                            result1 = "&";
                            pos++;
                          } else {
                            result1 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"&\"");
                            }
                          }
                          if (result1 === null) {
                            if (input.charCodeAt(pos) === 61) {
                              result1 = "=";
                              pos++;
                            } else {
                              result1 = null;
                              if (reportFailures === 0) {
                                matchFailed("\"=\"");
                              }
                            }
                            if (result1 === null) {
                              if (input.charCodeAt(pos) === 43) {
                                result1 = "+";
                                pos++;
                              } else {
                                result1 = null;
                                if (reportFailures === 0) {
                                  matchFailed("\"+\"");
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } else {
          result0 = null;
        }
        return result0;
      }
      
      function parse_query() {
        var result0, result1;
        
        result0 = [];
        result1 = parse_uric();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_uric();
        }
        return result0;
      }
      
      function parse_SIP_Version() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 3).toLowerCase() === "sip") {
          result0 = input.substr(pos, 3);
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"SIP\"");
          }
        }
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 47) {
            result1 = "/";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"/\"");
            }
          }
          if (result1 !== null) {
            result3 = parse_DIGIT();
            if (result3 !== null) {
              result2 = [];
              while (result3 !== null) {
                result2.push(result3);
                result3 = parse_DIGIT();
              }
            } else {
              result2 = null;
            }
            if (result2 !== null) {
              if (input.charCodeAt(pos) === 46) {
                result3 = ".";
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\".\"");
                }
              }
              if (result3 !== null) {
                result5 = parse_DIGIT();
                if (result5 !== null) {
                  result4 = [];
                  while (result5 !== null) {
                    result4.push(result5);
                    result5 = parse_DIGIT();
                  }
                } else {
                  result4 = null;
                }
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                            data.sip_version = input.substring(pos, offset); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_INVITEm() {
        var result0;
        
        if (input.substr(pos, 6) === "INVITE") {
          result0 = "INVITE";
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"INVITE\"");
          }
        }
        return result0;
      }
      
      function parse_ACKm() {
        var result0;
        
        if (input.substr(pos, 3) === "ACK") {
          result0 = "ACK";
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"ACK\"");
          }
        }
        return result0;
      }
      
      function parse_OPTIONSm() {
        var result0;
        
        if (input.substr(pos, 7) === "OPTIONS") {
          result0 = "OPTIONS";
          pos += 7;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"OPTIONS\"");
          }
        }
        return result0;
      }
      
      function parse_BYEm() {
        var result0;
        
        if (input.substr(pos, 3) === "BYE") {
          result0 = "BYE";
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"BYE\"");
          }
        }
        return result0;
      }
      
      function parse_CANCELm() {
        var result0;
        
        if (input.substr(pos, 6) === "CANCEL") {
          result0 = "CANCEL";
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"CANCEL\"");
          }
        }
        return result0;
      }
      
      function parse_REGISTERm() {
        var result0;
        
        if (input.substr(pos, 8) === "REGISTER") {
          result0 = "REGISTER";
          pos += 8;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"REGISTER\"");
          }
        }
        return result0;
      }
      
      function parse_SUBSCRIBEm() {
        var result0;
        
        if (input.substr(pos, 9) === "SUBSCRIBE") {
          result0 = "SUBSCRIBE";
          pos += 9;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"SUBSCRIBE\"");
          }
        }
        return result0;
      }
      
      function parse_NOTIFYm() {
        var result0;
        
        if (input.substr(pos, 6) === "NOTIFY") {
          result0 = "NOTIFY";
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"NOTIFY\"");
          }
        }
        return result0;
      }
      
      function parse_Method() {
        var result0;
        var pos0;
        
        pos0 = pos;
        result0 = parse_INVITEm();
        if (result0 === null) {
          result0 = parse_ACKm();
          if (result0 === null) {
            result0 = parse_OPTIONSm();
            if (result0 === null) {
              result0 = parse_BYEm();
              if (result0 === null) {
                result0 = parse_CANCELm();
                if (result0 === null) {
                  result0 = parse_REGISTERm();
                  if (result0 === null) {
                    result0 = parse_SUBSCRIBEm();
                    if (result0 === null) {
                      result0 = parse_NOTIFYm();
                      if (result0 === null) {
                        result0 = parse_token();
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                            data.method = input.substring(pos, offset);
                            return data.method; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Status_Line() {
        var result0, result1, result2, result3, result4;
        var pos0;
        
        pos0 = pos;
        result0 = parse_SIP_Version();
        if (result0 !== null) {
          result1 = parse_SP();
          if (result1 !== null) {
            result2 = parse_Status_Code();
            if (result2 !== null) {
              result3 = parse_SP();
              if (result3 !== null) {
                result4 = parse_Reason_Phrase();
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos0;
                }
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Status_Code() {
        var result0;
        var pos0;
        
        pos0 = pos;
        result0 = parse_extension_code();
        if (result0 !== null) {
          result0 = (function(offset, status_code) {
                          data.status_code = parseInt(status_code.join('')); })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_extension_code() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        result0 = parse_DIGIT();
        if (result0 !== null) {
          result1 = parse_DIGIT();
          if (result1 !== null) {
            result2 = parse_DIGIT();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Reason_Phrase() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result0 = [];
        result1 = parse_reserved();
        if (result1 === null) {
          result1 = parse_unreserved();
          if (result1 === null) {
            result1 = parse_escaped();
            if (result1 === null) {
              result1 = parse_UTF8_NONASCII();
              if (result1 === null) {
                result1 = parse_UTF8_CONT();
                if (result1 === null) {
                  result1 = parse_SP();
                  if (result1 === null) {
                    result1 = parse_HTAB();
                  }
                }
              }
            }
          }
        }
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_reserved();
          if (result1 === null) {
            result1 = parse_unreserved();
            if (result1 === null) {
              result1 = parse_escaped();
              if (result1 === null) {
                result1 = parse_UTF8_NONASCII();
                if (result1 === null) {
                  result1 = parse_UTF8_CONT();
                  if (result1 === null) {
                    result1 = parse_SP();
                    if (result1 === null) {
                      result1 = parse_HTAB();
                    }
                  }
                }
              }
            }
          }
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                          data.reason_phrase = input.substring(pos, offset); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Allow_Events() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_event_type();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_COMMA();
          if (result2 !== null) {
            result3 = parse_event_type();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_COMMA();
            if (result2 !== null) {
              result3 = parse_event_type();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Call_ID() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_word();
        if (result0 !== null) {
          pos2 = pos;
          if (input.charCodeAt(pos) === 64) {
            result1 = "@";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"@\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_word();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                      data = input.substring(pos, offset); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Contact() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        result0 = parse_STAR();
        if (result0 === null) {
          pos1 = pos;
          result0 = parse_contact_param();
          if (result0 !== null) {
            result1 = [];
            pos2 = pos;
            result2 = parse_COMMA();
            if (result2 !== null) {
              result3 = parse_contact_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
            while (result2 !== null) {
              result1.push(result2);
              pos2 = pos;
              result2 = parse_COMMA();
              if (result2 !== null) {
                result3 = parse_contact_param();
                if (result3 !== null) {
                  result2 = [result2, result3];
                } else {
                  result2 = null;
                  pos = pos2;
                }
              } else {
                result2 = null;
                pos = pos2;
              }
            }
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                                var idx, length;
                                length = data.multi_header.length;
                                for (idx = 0; idx < length; idx++) {
                                  if (data.multi_header[idx].parsed === null) {
                                    data = null;
                                    break;
                                  }
                                }
                                if (data !== null) {
                                  data = data.multi_header;
                                } else {
                                  data = -1;
                                }})(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_contact_param() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SIP_URI_noparams();
        if (result0 === null) {
          result0 = parse_name_addr();
        }
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_SEMI();
          if (result2 !== null) {
            result3 = parse_contact_params();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_SEMI();
            if (result2 !== null) {
              result3 = parse_contact_params();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                                var header;
                                if(!data.multi_header) data.multi_header = [];
                                try {
                                  header = new NameAddrHeader(data.uri, data.display_name, data.params);
                                  delete data.uri;
                                  delete data.display_name;
                                  delete data.params;
                                } catch(e) {
                                  header = null;
                                }
                                data.multi_header.push( { 'possition': pos,
                                                          'offset': offset,
                                                          'parsed': header
                                                        });})(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_name_addr() {
        var result0, result1, result2, result3;
        var pos0;
        
        pos0 = pos;
        result0 = parse_display_name();
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result1 = parse_LAQUOT();
          if (result1 !== null) {
            result2 = parse_SIP_URI();
            if (result2 !== null) {
              result3 = parse_RAQUOT();
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_display_name() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_token();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_LWS();
          if (result2 !== null) {
            result3 = parse_token();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_LWS();
            if (result2 !== null) {
              result3 = parse_token();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 === null) {
          result0 = parse_quoted_string();
        }
        if (result0 !== null) {
          result0 = (function(offset, display_name) {
                                display_name = input.substring(pos, offset).trim();
                                if (display_name[0] === '\"') {
                                  display_name = display_name.substring(1, display_name.length-1);
                                }
                                data.display_name = display_name; })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_contact_params() {
        var result0;
        
        result0 = parse_c_p_q();
        if (result0 === null) {
          result0 = parse_c_p_expires();
          if (result0 === null) {
            result0 = parse_generic_param();
          }
        }
        return result0;
      }
      
      function parse_c_p_q() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 1).toLowerCase() === "q") {
          result0 = input.substr(pos, 1);
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"q\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_qvalue();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, q) {
                                if(!data.params) data.params = {};
                                data.params['q'] = q; })(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_c_p_expires() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 7).toLowerCase() === "expires") {
          result0 = input.substr(pos, 7);
          pos += 7;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"expires\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_delta_seconds();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, expires) {
                                if(!data.params) data.params = {};
                                data.params['expires'] = expires; })(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_delta_seconds() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_DIGIT();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_DIGIT();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, delta_seconds) {
                                return parseInt(delta_seconds.join('')); })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_qvalue() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        if (input.charCodeAt(pos) === 48) {
          result0 = "0";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"0\"");
          }
        }
        if (result0 !== null) {
          pos2 = pos;
          if (input.charCodeAt(pos) === 46) {
            result1 = ".";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\".\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_DIGIT();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result3 = parse_DIGIT();
              result3 = result3 !== null ? result3 : "";
              if (result3 !== null) {
                result4 = parse_DIGIT();
                result4 = result4 !== null ? result4 : "";
                if (result4 !== null) {
                  result1 = [result1, result2, result3, result4];
                } else {
                  result1 = null;
                  pos = pos2;
                }
              } else {
                result1 = null;
                pos = pos2;
              }
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                                return parseFloat(input.substring(pos, offset)); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_generic_param() {
        var result0, result1, result2;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_token();
        if (result0 !== null) {
          pos2 = pos;
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_gen_value();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, param, value) {
                                if(!data.params) data.params = {};
                                if (typeof value === 'undefined'){
                                  value = undefined;
                                }
                                else {
                                  value = value[1];
                                }
                                data.params[param.toLowerCase()] = value;})(pos0, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_gen_value() {
        var result0;
        
        result0 = parse_token();
        if (result0 === null) {
          result0 = parse_host();
          if (result0 === null) {
            result0 = parse_quoted_string();
          }
        }
        return result0;
      }
      
      function parse_Content_Disposition() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_disp_type();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_SEMI();
          if (result2 !== null) {
            result3 = parse_disp_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_SEMI();
            if (result2 !== null) {
              result3 = parse_disp_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_disp_type() {
        var result0;
        
        if (input.substr(pos, 6).toLowerCase() === "render") {
          result0 = input.substr(pos, 6);
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"render\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 7).toLowerCase() === "session") {
            result0 = input.substr(pos, 7);
            pos += 7;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"session\"");
            }
          }
          if (result0 === null) {
            if (input.substr(pos, 4).toLowerCase() === "icon") {
              result0 = input.substr(pos, 4);
              pos += 4;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"icon\"");
              }
            }
            if (result0 === null) {
              if (input.substr(pos, 5).toLowerCase() === "alert") {
                result0 = input.substr(pos, 5);
                pos += 5;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"alert\"");
                }
              }
              if (result0 === null) {
                result0 = parse_token();
              }
            }
          }
        }
        return result0;
      }
      
      function parse_disp_param() {
        var result0;
        
        result0 = parse_handling_param();
        if (result0 === null) {
          result0 = parse_generic_param();
        }
        return result0;
      }
      
      function parse_handling_param() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 8).toLowerCase() === "handling") {
          result0 = input.substr(pos, 8);
          pos += 8;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"handling\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            if (input.substr(pos, 8).toLowerCase() === "optional") {
              result2 = input.substr(pos, 8);
              pos += 8;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"optional\"");
              }
            }
            if (result2 === null) {
              if (input.substr(pos, 8).toLowerCase() === "required") {
                result2 = input.substr(pos, 8);
                pos += 8;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"required\"");
                }
              }
              if (result2 === null) {
                result2 = parse_token();
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Content_Encoding() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_token();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_COMMA();
          if (result2 !== null) {
            result3 = parse_token();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_COMMA();
            if (result2 !== null) {
              result3 = parse_token();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Content_Length() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_DIGIT();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_DIGIT();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, length) {
                                data = parseInt(length.join('')); })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Content_Type() {
        var result0;
        var pos0;
        
        pos0 = pos;
        result0 = parse_media_type();
        if (result0 !== null) {
          result0 = (function(offset) {
                                data = input.substring(pos, offset); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_media_type() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_m_type();
        if (result0 !== null) {
          result1 = parse_SLASH();
          if (result1 !== null) {
            result2 = parse_m_subtype();
            if (result2 !== null) {
              result3 = [];
              pos1 = pos;
              result4 = parse_SEMI();
              if (result4 !== null) {
                result5 = parse_m_parameter();
                if (result5 !== null) {
                  result4 = [result4, result5];
                } else {
                  result4 = null;
                  pos = pos1;
                }
              } else {
                result4 = null;
                pos = pos1;
              }
              while (result4 !== null) {
                result3.push(result4);
                pos1 = pos;
                result4 = parse_SEMI();
                if (result4 !== null) {
                  result5 = parse_m_parameter();
                  if (result5 !== null) {
                    result4 = [result4, result5];
                  } else {
                    result4 = null;
                    pos = pos1;
                  }
                } else {
                  result4 = null;
                  pos = pos1;
                }
              }
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_m_type() {
        var result0;
        
        result0 = parse_discrete_type();
        if (result0 === null) {
          result0 = parse_composite_type();
        }
        return result0;
      }
      
      function parse_discrete_type() {
        var result0;
        
        if (input.substr(pos, 4).toLowerCase() === "text") {
          result0 = input.substr(pos, 4);
          pos += 4;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"text\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 5).toLowerCase() === "image") {
            result0 = input.substr(pos, 5);
            pos += 5;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"image\"");
            }
          }
          if (result0 === null) {
            if (input.substr(pos, 5).toLowerCase() === "audio") {
              result0 = input.substr(pos, 5);
              pos += 5;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"audio\"");
              }
            }
            if (result0 === null) {
              if (input.substr(pos, 5).toLowerCase() === "video") {
                result0 = input.substr(pos, 5);
                pos += 5;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"video\"");
                }
              }
              if (result0 === null) {
                if (input.substr(pos, 11).toLowerCase() === "application") {
                  result0 = input.substr(pos, 11);
                  pos += 11;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"application\"");
                  }
                }
                if (result0 === null) {
                  result0 = parse_extension_token();
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_composite_type() {
        var result0;
        
        if (input.substr(pos, 7).toLowerCase() === "message") {
          result0 = input.substr(pos, 7);
          pos += 7;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"message\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 9).toLowerCase() === "multipart") {
            result0 = input.substr(pos, 9);
            pos += 9;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"multipart\"");
            }
          }
          if (result0 === null) {
            result0 = parse_extension_token();
          }
        }
        return result0;
      }
      
      function parse_extension_token() {
        var result0;
        
        result0 = parse_token();
        if (result0 === null) {
          result0 = parse_x_token();
        }
        return result0;
      }
      
      function parse_x_token() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 2).toLowerCase() === "x-") {
          result0 = input.substr(pos, 2);
          pos += 2;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"x-\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_token();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_m_subtype() {
        var result0;
        
        result0 = parse_extension_token();
        if (result0 === null) {
          result0 = parse_token();
        }
        return result0;
      }
      
      function parse_m_parameter() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        result0 = parse_token();
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_m_value();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_m_value() {
        var result0;
        
        result0 = parse_token();
        if (result0 === null) {
          result0 = parse_quoted_string();
        }
        return result0;
      }
      
      function parse_CSeq() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        result0 = parse_CSeq_value();
        if (result0 !== null) {
          result1 = parse_LWS();
          if (result1 !== null) {
            result2 = parse_Method();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_CSeq_value() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_DIGIT();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_DIGIT();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, cseq_value) {
                          data.value=parseInt(cseq_value.join('')); })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Expires() {
        var result0;
        var pos0;
        
        pos0 = pos;
        result0 = parse_delta_seconds();
        if (result0 !== null) {
          result0 = (function(offset, expires) {data = expires; })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Event() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_event_type();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_SEMI();
          if (result2 !== null) {
            result3 = parse_generic_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_SEMI();
            if (result2 !== null) {
              result3 = parse_generic_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, event_type) {
                               data.event = event_type.join('').toLowerCase(); })(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_event_type() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_token_nodot();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          if (input.charCodeAt(pos) === 46) {
            result2 = ".";
            pos++;
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("\".\"");
            }
          }
          if (result2 !== null) {
            result3 = parse_token_nodot();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            if (input.charCodeAt(pos) === 46) {
              result2 = ".";
              pos++;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\".\"");
              }
            }
            if (result2 !== null) {
              result3 = parse_token_nodot();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_From() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SIP_URI_noparams();
        if (result0 === null) {
          result0 = parse_name_addr();
        }
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_SEMI();
          if (result2 !== null) {
            result3 = parse_from_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_SEMI();
            if (result2 !== null) {
              result3 = parse_from_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                        var tag = data.tag;
                        try {
                          data = new NameAddrHeader(data.uri, data.display_name, data.params);
                          if (tag) {data.setParam('tag',tag)}
                        } catch(e) {
                          data = -1;
                        }})(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_from_param() {
        var result0;
        
        result0 = parse_tag_param();
        if (result0 === null) {
          result0 = parse_generic_param();
        }
        return result0;
      }
      
      function parse_tag_param() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 3).toLowerCase() === "tag") {
          result0 = input.substr(pos, 3);
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"tag\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_token();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, tag) {data.tag = tag; })(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Max_Forwards() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result1 = parse_DIGIT();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_DIGIT();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result0 = (function(offset, forwards) {
                          data = parseInt(forwards.join('')); })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Min_Expires() {
        var result0;
        var pos0;
        
        pos0 = pos;
        result0 = parse_delta_seconds();
        if (result0 !== null) {
          result0 = (function(offset, min_expires) {data = min_expires; })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Name_Addr_Header() {
        var result0, result1, result2, result3, result4, result5, result6;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = [];
        result1 = parse_display_name();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_display_name();
        }
        if (result0 !== null) {
          result1 = parse_LAQUOT();
          if (result1 !== null) {
            result2 = parse_SIP_URI();
            if (result2 !== null) {
              result3 = parse_RAQUOT();
              if (result3 !== null) {
                result4 = [];
                pos2 = pos;
                result5 = parse_SEMI();
                if (result5 !== null) {
                  result6 = parse_generic_param();
                  if (result6 !== null) {
                    result5 = [result5, result6];
                  } else {
                    result5 = null;
                    pos = pos2;
                  }
                } else {
                  result5 = null;
                  pos = pos2;
                }
                while (result5 !== null) {
                  result4.push(result5);
                  pos2 = pos;
                  result5 = parse_SEMI();
                  if (result5 !== null) {
                    result6 = parse_generic_param();
                    if (result6 !== null) {
                      result5 = [result5, result6];
                    } else {
                      result5 = null;
                      pos = pos2;
                    }
                  } else {
                    result5 = null;
                    pos = pos2;
                  }
                }
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                              try {
                                data = new NameAddrHeader(data.uri, data.display_name, data.params);
                              } catch(e) {
                                data = -1;
                              }})(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Proxy_Authenticate() {
        var result0;
        
        result0 = parse_challenge();
        return result0;
      }
      
      function parse_challenge() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1;
        
        pos0 = pos;
        if (input.substr(pos, 6).toLowerCase() === "digest") {
          result0 = input.substr(pos, 6);
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"Digest\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_LWS();
          if (result1 !== null) {
            result2 = parse_digest_cln();
            if (result2 !== null) {
              result3 = [];
              pos1 = pos;
              result4 = parse_COMMA();
              if (result4 !== null) {
                result5 = parse_digest_cln();
                if (result5 !== null) {
                  result4 = [result4, result5];
                } else {
                  result4 = null;
                  pos = pos1;
                }
              } else {
                result4 = null;
                pos = pos1;
              }
              while (result4 !== null) {
                result3.push(result4);
                pos1 = pos;
                result4 = parse_COMMA();
                if (result4 !== null) {
                  result5 = parse_digest_cln();
                  if (result5 !== null) {
                    result4 = [result4, result5];
                  } else {
                    result4 = null;
                    pos = pos1;
                  }
                } else {
                  result4 = null;
                  pos = pos1;
                }
              }
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        if (result0 === null) {
          result0 = parse_other_challenge();
        }
        return result0;
      }
      
      function parse_other_challenge() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_token();
        if (result0 !== null) {
          result1 = parse_LWS();
          if (result1 !== null) {
            result2 = parse_auth_param();
            if (result2 !== null) {
              result3 = [];
              pos1 = pos;
              result4 = parse_COMMA();
              if (result4 !== null) {
                result5 = parse_auth_param();
                if (result5 !== null) {
                  result4 = [result4, result5];
                } else {
                  result4 = null;
                  pos = pos1;
                }
              } else {
                result4 = null;
                pos = pos1;
              }
              while (result4 !== null) {
                result3.push(result4);
                pos1 = pos;
                result4 = parse_COMMA();
                if (result4 !== null) {
                  result5 = parse_auth_param();
                  if (result5 !== null) {
                    result4 = [result4, result5];
                  } else {
                    result4 = null;
                    pos = pos1;
                  }
                } else {
                  result4 = null;
                  pos = pos1;
                }
              }
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_auth_param() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        result0 = parse_token();
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_token();
            if (result2 === null) {
              result2 = parse_quoted_string();
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_digest_cln() {
        var result0;
        
        result0 = parse_realm();
        if (result0 === null) {
          result0 = parse_domain();
          if (result0 === null) {
            result0 = parse_nonce();
            if (result0 === null) {
              result0 = parse_opaque();
              if (result0 === null) {
                result0 = parse_stale();
                if (result0 === null) {
                  result0 = parse_algorithm();
                  if (result0 === null) {
                    result0 = parse_qop_options();
                    if (result0 === null) {
                      result0 = parse_auth_param();
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_realm() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 5).toLowerCase() === "realm") {
          result0 = input.substr(pos, 5);
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"realm\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_realm_value();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_realm_value() {
        var result0;
        var pos0;
        
        pos0 = pos;
        result0 = parse_quoted_string_clean();
        if (result0 !== null) {
          result0 = (function(offset, realm) { data.realm = realm; })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_domain() {
        var result0, result1, result2, result3, result4, result5, result6;
        var pos0, pos1;
        
        pos0 = pos;
        if (input.substr(pos, 6).toLowerCase() === "domain") {
          result0 = input.substr(pos, 6);
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"domain\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_LDQUOT();
            if (result2 !== null) {
              result3 = parse_URI();
              if (result3 !== null) {
                result4 = [];
                pos1 = pos;
                result6 = parse_SP();
                if (result6 !== null) {
                  result5 = [];
                  while (result6 !== null) {
                    result5.push(result6);
                    result6 = parse_SP();
                  }
                } else {
                  result5 = null;
                }
                if (result5 !== null) {
                  result6 = parse_URI();
                  if (result6 !== null) {
                    result5 = [result5, result6];
                  } else {
                    result5 = null;
                    pos = pos1;
                  }
                } else {
                  result5 = null;
                  pos = pos1;
                }
                while (result5 !== null) {
                  result4.push(result5);
                  pos1 = pos;
                  result6 = parse_SP();
                  if (result6 !== null) {
                    result5 = [];
                    while (result6 !== null) {
                      result5.push(result6);
                      result6 = parse_SP();
                    }
                  } else {
                    result5 = null;
                  }
                  if (result5 !== null) {
                    result6 = parse_URI();
                    if (result6 !== null) {
                      result5 = [result5, result6];
                    } else {
                      result5 = null;
                      pos = pos1;
                    }
                  } else {
                    result5 = null;
                    pos = pos1;
                  }
                }
                if (result4 !== null) {
                  result5 = parse_RDQUOT();
                  if (result5 !== null) {
                    result0 = [result0, result1, result2, result3, result4, result5];
                  } else {
                    result0 = null;
                    pos = pos0;
                  }
                } else {
                  result0 = null;
                  pos = pos0;
                }
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_URI() {
        var result0;
        
        result0 = parse_absoluteURI();
        if (result0 === null) {
          result0 = parse_abs_path();
        }
        return result0;
      }
      
      function parse_nonce() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 5).toLowerCase() === "nonce") {
          result0 = input.substr(pos, 5);
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"nonce\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_nonce_value();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_nonce_value() {
        var result0;
        var pos0;
        
        pos0 = pos;
        result0 = parse_quoted_string_clean();
        if (result0 !== null) {
          result0 = (function(offset, nonce) { data.nonce=nonce; })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_opaque() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 6).toLowerCase() === "opaque") {
          result0 = input.substr(pos, 6);
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"opaque\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_quoted_string_clean();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, opaque) { data.opaque=opaque; })(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_stale() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        if (input.substr(pos, 5).toLowerCase() === "stale") {
          result0 = input.substr(pos, 5);
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"stale\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            pos1 = pos;
            if (input.substr(pos, 4).toLowerCase() === "true") {
              result2 = input.substr(pos, 4);
              pos += 4;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"true\"");
              }
            }
            if (result2 !== null) {
              result2 = (function(offset) { data.stale=true; })(pos1);
            }
            if (result2 === null) {
              pos = pos1;
            }
            if (result2 === null) {
              pos1 = pos;
              if (input.substr(pos, 5).toLowerCase() === "false") {
                result2 = input.substr(pos, 5);
                pos += 5;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"false\"");
                }
              }
              if (result2 !== null) {
                result2 = (function(offset) { data.stale=false; })(pos1);
              }
              if (result2 === null) {
                pos = pos1;
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_algorithm() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 9).toLowerCase() === "algorithm") {
          result0 = input.substr(pos, 9);
          pos += 9;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"algorithm\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            if (input.substr(pos, 3).toLowerCase() === "md5") {
              result2 = input.substr(pos, 3);
              pos += 3;
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"MD5\"");
              }
            }
            if (result2 === null) {
              if (input.substr(pos, 8).toLowerCase() === "md5-sess") {
                result2 = input.substr(pos, 8);
                pos += 8;
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"MD5-sess\"");
                }
              }
              if (result2 === null) {
                result2 = parse_token();
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, algorithm) {
                              data.algorithm=algorithm.toUpperCase(); })(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_qop_options() {
        var result0, result1, result2, result3, result4, result5, result6;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        if (input.substr(pos, 3).toLowerCase() === "qop") {
          result0 = input.substr(pos, 3);
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"qop\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_LDQUOT();
            if (result2 !== null) {
              pos1 = pos;
              result3 = parse_qop_value();
              if (result3 !== null) {
                result4 = [];
                pos2 = pos;
                if (input.charCodeAt(pos) === 44) {
                  result5 = ",";
                  pos++;
                } else {
                  result5 = null;
                  if (reportFailures === 0) {
                    matchFailed("\",\"");
                  }
                }
                if (result5 !== null) {
                  result6 = parse_qop_value();
                  if (result6 !== null) {
                    result5 = [result5, result6];
                  } else {
                    result5 = null;
                    pos = pos2;
                  }
                } else {
                  result5 = null;
                  pos = pos2;
                }
                while (result5 !== null) {
                  result4.push(result5);
                  pos2 = pos;
                  if (input.charCodeAt(pos) === 44) {
                    result5 = ",";
                    pos++;
                  } else {
                    result5 = null;
                    if (reportFailures === 0) {
                      matchFailed("\",\"");
                    }
                  }
                  if (result5 !== null) {
                    result6 = parse_qop_value();
                    if (result6 !== null) {
                      result5 = [result5, result6];
                    } else {
                      result5 = null;
                      pos = pos2;
                    }
                  } else {
                    result5 = null;
                    pos = pos2;
                  }
                }
                if (result4 !== null) {
                  result3 = [result3, result4];
                } else {
                  result3 = null;
                  pos = pos1;
                }
              } else {
                result3 = null;
                pos = pos1;
              }
              if (result3 !== null) {
                result4 = parse_RDQUOT();
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos0;
                }
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_qop_value() {
        var result0;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 8).toLowerCase() === "auth-int") {
          result0 = input.substr(pos, 8);
          pos += 8;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"auth-int\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 4).toLowerCase() === "auth") {
            result0 = input.substr(pos, 4);
            pos += 4;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"auth\"");
            }
          }
          if (result0 === null) {
            result0 = parse_token();
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, qop_value) {
                                data.qop || (data.qop=[]);
                                data.qop.push(qop_value.toLowerCase()); })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Proxy_Require() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_token();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_COMMA();
          if (result2 !== null) {
            result3 = parse_token();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_COMMA();
            if (result2 !== null) {
              result3 = parse_token();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Record_Route() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_rec_route();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_COMMA();
          if (result2 !== null) {
            result3 = parse_rec_route();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_COMMA();
            if (result2 !== null) {
              result3 = parse_rec_route();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                          var idx, length;
                          length = data.multi_header.length;
                          for (idx = 0; idx < length; idx++) {
                            if (data.multi_header[idx].parsed === null) {
                              data = null;
                              break;
                            }
                          }
                          if (data !== null) {
                            data = data.multi_header;
                          } else {
                            data = -1;
                          }})(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_rec_route() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_name_addr();
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_SEMI();
          if (result2 !== null) {
            result3 = parse_generic_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_SEMI();
            if (result2 !== null) {
              result3 = parse_generic_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                          var header;
                          if(!data.multi_header) data.multi_header = [];
                          try {
                            header = new NameAddrHeader(data.uri, data.display_name, data.params);
                            delete data.uri;
                            delete data.display_name;
                            delete data.params;
                          } catch(e) {
                            header = null;
                          }
                          data.multi_header.push( { 'possition': pos,
                                                    'offset': offset,
                                                    'parsed': header
                                                  });})(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Require() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_token();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_COMMA();
          if (result2 !== null) {
            result3 = parse_token();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_COMMA();
            if (result2 !== null) {
              result3 = parse_token();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Route() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_route_param();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_COMMA();
          if (result2 !== null) {
            result3 = parse_route_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_COMMA();
            if (result2 !== null) {
              result3 = parse_route_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_route_param() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_name_addr();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_SEMI();
          if (result2 !== null) {
            result3 = parse_generic_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_SEMI();
            if (result2 !== null) {
              result3 = parse_generic_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_Subscription_State() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_substate_value();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_SEMI();
          if (result2 !== null) {
            result3 = parse_subexp_params();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_SEMI();
            if (result2 !== null) {
              result3 = parse_subexp_params();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_substate_value() {
        var result0;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 6).toLowerCase() === "active") {
          result0 = input.substr(pos, 6);
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"active\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 7).toLowerCase() === "pending") {
            result0 = input.substr(pos, 7);
            pos += 7;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"pending\"");
            }
          }
          if (result0 === null) {
            if (input.substr(pos, 10).toLowerCase() === "terminated") {
              result0 = input.substr(pos, 10);
              pos += 10;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"terminated\"");
              }
            }
            if (result0 === null) {
              result0 = parse_token();
            }
          }
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                                data.state = input.substring(pos, offset); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_subexp_params() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 6).toLowerCase() === "reason") {
          result0 = input.substr(pos, 6);
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"reason\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_event_reason_value();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, reason) {
                                if (typeof reason !== 'undefined') data.reason = reason; })(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        if (result0 === null) {
          pos0 = pos;
          pos1 = pos;
          if (input.substr(pos, 7).toLowerCase() === "expires") {
            result0 = input.substr(pos, 7);
            pos += 7;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"expires\"");
            }
          }
          if (result0 !== null) {
            result1 = parse_EQUAL();
            if (result1 !== null) {
              result2 = parse_delta_seconds();
              if (result2 !== null) {
                result0 = [result0, result1, result2];
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
          if (result0 !== null) {
            result0 = (function(offset, expires) {
                                  if (typeof expires !== 'undefined') data.expires = expires; })(pos0, result0[2]);
          }
          if (result0 === null) {
            pos = pos0;
          }
          if (result0 === null) {
            pos0 = pos;
            pos1 = pos;
            if (input.substr(pos, 11).toLowerCase() === "retry_after") {
              result0 = input.substr(pos, 11);
              pos += 11;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"retry_after\"");
              }
            }
            if (result0 !== null) {
              result1 = parse_EQUAL();
              if (result1 !== null) {
                result2 = parse_delta_seconds();
                if (result2 !== null) {
                  result0 = [result0, result1, result2];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
            if (result0 !== null) {
              result0 = (function(offset, retry_after) {
                                    if (typeof retry_after !== 'undefined') data.retry_after = retry_after; })(pos0, result0[2]);
            }
            if (result0 === null) {
              pos = pos0;
            }
            if (result0 === null) {
              result0 = parse_generic_param();
            }
          }
        }
        return result0;
      }
      
      function parse_event_reason_value() {
        var result0;
        
        if (input.substr(pos, 11).toLowerCase() === "deactivated") {
          result0 = input.substr(pos, 11);
          pos += 11;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"deactivated\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 9).toLowerCase() === "probation") {
            result0 = input.substr(pos, 9);
            pos += 9;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"probation\"");
            }
          }
          if (result0 === null) {
            if (input.substr(pos, 8).toLowerCase() === "rejected") {
              result0 = input.substr(pos, 8);
              pos += 8;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"rejected\"");
              }
            }
            if (result0 === null) {
              if (input.substr(pos, 7).toLowerCase() === "timeout") {
                result0 = input.substr(pos, 7);
                pos += 7;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"timeout\"");
                }
              }
              if (result0 === null) {
                if (input.substr(pos, 6).toLowerCase() === "giveup") {
                  result0 = input.substr(pos, 6);
                  pos += 6;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"giveup\"");
                  }
                }
                if (result0 === null) {
                  if (input.substr(pos, 10).toLowerCase() === "noresource") {
                    result0 = input.substr(pos, 10);
                    pos += 10;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"noresource\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.substr(pos, 9).toLowerCase() === "invariant") {
                      result0 = input.substr(pos, 9);
                      pos += 9;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"invariant\"");
                      }
                    }
                    if (result0 === null) {
                      result0 = parse_token();
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_Subject() {
        var result0;
        
        result0 = parse_TEXT_UTF8_TRIM();
        result0 = result0 !== null ? result0 : "";
        return result0;
      }
      
      function parse_Supported() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_token();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_COMMA();
          if (result2 !== null) {
            result3 = parse_token();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_COMMA();
            if (result2 !== null) {
              result3 = parse_token();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        result0 = result0 !== null ? result0 : "";
        return result0;
      }
      
      function parse_To() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_SIP_URI_noparams();
        if (result0 === null) {
          result0 = parse_name_addr();
        }
        if (result0 !== null) {
          result1 = [];
          pos2 = pos;
          result2 = parse_SEMI();
          if (result2 !== null) {
            result3 = parse_to_param();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos2;
            }
          } else {
            result2 = null;
            pos = pos2;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos2 = pos;
            result2 = parse_SEMI();
            if (result2 !== null) {
              result3 = parse_to_param();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos2;
              }
            } else {
              result2 = null;
              pos = pos2;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                      var tag = data.tag;
                      try {
                        data = new NameAddrHeader(data.uri, data.display_name, data.params);
                        if (tag) {data.setParam('tag',tag)}
                      } catch(e) {
                        data = -1;
                      }})(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_to_param() {
        var result0;
        
        result0 = parse_tag_param();
        if (result0 === null) {
          result0 = parse_generic_param();
        }
        return result0;
      }
      
      function parse_Via() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_via_parm();
        if (result0 !== null) {
          result1 = [];
          pos1 = pos;
          result2 = parse_COMMA();
          if (result2 !== null) {
            result3 = parse_via_parm();
            if (result3 !== null) {
              result2 = [result2, result3];
            } else {
              result2 = null;
              pos = pos1;
            }
          } else {
            result2 = null;
            pos = pos1;
          }
          while (result2 !== null) {
            result1.push(result2);
            pos1 = pos;
            result2 = parse_COMMA();
            if (result2 !== null) {
              result3 = parse_via_parm();
              if (result3 !== null) {
                result2 = [result2, result3];
              } else {
                result2 = null;
                pos = pos1;
              }
            } else {
              result2 = null;
              pos = pos1;
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_via_parm() {
        var result0, result1, result2, result3, result4, result5;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_sent_protocol();
        if (result0 !== null) {
          result1 = parse_LWS();
          if (result1 !== null) {
            result2 = parse_sent_by();
            if (result2 !== null) {
              result3 = [];
              pos1 = pos;
              result4 = parse_SEMI();
              if (result4 !== null) {
                result5 = parse_via_params();
                if (result5 !== null) {
                  result4 = [result4, result5];
                } else {
                  result4 = null;
                  pos = pos1;
                }
              } else {
                result4 = null;
                pos = pos1;
              }
              while (result4 !== null) {
                result3.push(result4);
                pos1 = pos;
                result4 = parse_SEMI();
                if (result4 !== null) {
                  result5 = parse_via_params();
                  if (result5 !== null) {
                    result4 = [result4, result5];
                  } else {
                    result4 = null;
                    pos = pos1;
                  }
                } else {
                  result4 = null;
                  pos = pos1;
                }
              }
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_via_params() {
        var result0;
        
        result0 = parse_via_ttl();
        if (result0 === null) {
          result0 = parse_via_maddr();
          if (result0 === null) {
            result0 = parse_via_received();
            if (result0 === null) {
              result0 = parse_via_branch();
              if (result0 === null) {
                result0 = parse_response_port();
                if (result0 === null) {
                  result0 = parse_generic_param();
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_via_ttl() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 3).toLowerCase() === "ttl") {
          result0 = input.substr(pos, 3);
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"ttl\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_ttl();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, via_ttl_value) {
                              data.ttl = via_ttl_value; })(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_via_maddr() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 5).toLowerCase() === "maddr") {
          result0 = input.substr(pos, 5);
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"maddr\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_host();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, via_maddr) {
                              data.maddr = via_maddr; })(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_via_received() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 8).toLowerCase() === "received") {
          result0 = input.substr(pos, 8);
          pos += 8;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"received\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_IPv4address();
            if (result2 === null) {
              result2 = parse_IPv6address();
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, via_received) {
                              data.received = via_received; })(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_via_branch() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 6).toLowerCase() === "branch") {
          result0 = input.substr(pos, 6);
          pos += 6;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"branch\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = parse_token();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, via_branch) {
                              data.branch = via_branch; })(pos0, result0[2]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_response_port() {
        var result0, result1, result2, result3;
        var pos0, pos1, pos2;
        
        pos0 = pos;
        pos1 = pos;
        if (input.substr(pos, 5).toLowerCase() === "rport") {
          result0 = input.substr(pos, 5);
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"rport\"");
          }
        }
        if (result0 !== null) {
          pos2 = pos;
          result1 = parse_EQUAL();
          if (result1 !== null) {
            result2 = [];
            result3 = parse_DIGIT();
            while (result3 !== null) {
              result2.push(result3);
              result3 = parse_DIGIT();
            }
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos2;
            }
          } else {
            result1 = null;
            pos = pos2;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                              if(typeof response_port !== 'undefined')
                                data.rport = response_port.join(''); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_sent_protocol() {
        var result0, result1, result2, result3, result4;
        var pos0;
        
        pos0 = pos;
        result0 = parse_protocol_name();
        if (result0 !== null) {
          result1 = parse_SLASH();
          if (result1 !== null) {
            result2 = parse_token();
            if (result2 !== null) {
              result3 = parse_SLASH();
              if (result3 !== null) {
                result4 = parse_transport();
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos0;
                }
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_protocol_name() {
        var result0;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 3).toLowerCase() === "sip") {
          result0 = input.substr(pos, 3);
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"SIP\"");
          }
        }
        if (result0 === null) {
          result0 = parse_token();
        }
        if (result0 !== null) {
          result0 = (function(offset, via_protocol) {
                              data.protocol = via_protocol; })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_transport() {
        var result0;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 3).toLowerCase() === "udp") {
          result0 = input.substr(pos, 3);
          pos += 3;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"UDP\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 3).toLowerCase() === "tcp") {
            result0 = input.substr(pos, 3);
            pos += 3;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"TCP\"");
            }
          }
          if (result0 === null) {
            if (input.substr(pos, 3).toLowerCase() === "tls") {
              result0 = input.substr(pos, 3);
              pos += 3;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"TLS\"");
              }
            }
            if (result0 === null) {
              if (input.substr(pos, 4).toLowerCase() === "sctp") {
                result0 = input.substr(pos, 4);
                pos += 4;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"SCTP\"");
                }
              }
              if (result0 === null) {
                result0 = parse_token();
              }
            }
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, via_transport) {
                              data.transport = via_transport; })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_sent_by() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_via_host();
        if (result0 !== null) {
          pos1 = pos;
          result1 = parse_COLON();
          if (result1 !== null) {
            result2 = parse_via_port();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos1;
            }
          } else {
            result1 = null;
            pos = pos1;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_via_host() {
        var result0;
        var pos0;
        
        pos0 = pos;
        result0 = parse_IPv4address();
        if (result0 === null) {
          result0 = parse_IPv6reference();
          if (result0 === null) {
            result0 = parse_hostname();
          }
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                              data.host = input.substring(pos, offset); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_via_port() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_DIGIT();
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result1 = parse_DIGIT();
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result2 = parse_DIGIT();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result3 = parse_DIGIT();
              result3 = result3 !== null ? result3 : "";
              if (result3 !== null) {
                result4 = parse_DIGIT();
                result4 = result4 !== null ? result4 : "";
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, via_sent_by_port) {
                              data.port = parseInt(via_sent_by_port.join('')); })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_ttl() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_DIGIT();
        if (result0 !== null) {
          result1 = parse_DIGIT();
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result2 = parse_DIGIT();
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, ttl) {
                              return parseInt(ttl.join('')); })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_WWW_Authenticate() {
        var result0;
        
        result0 = parse_challenge();
        return result0;
      }
      
      function parse_extension_header() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        result0 = parse_token();
        if (result0 !== null) {
          result1 = parse_HCOLON();
          if (result1 !== null) {
            result2 = parse_header_value();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_header_value() {
        var result0, result1;
        
        result0 = [];
        result1 = parse_TEXT_UTF8char();
        if (result1 === null) {
          result1 = parse_UTF8_CONT();
          if (result1 === null) {
            result1 = parse_LWS();
          }
        }
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_TEXT_UTF8char();
          if (result1 === null) {
            result1 = parse_UTF8_CONT();
            if (result1 === null) {
              result1 = parse_LWS();
            }
          }
        }
        return result0;
      }
      
      function parse_message_body() {
        var result0, result1;
        
        result0 = [];
        result1 = parse_OCTET();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_OCTET();
        }
        return result0;
      }
      
      function parse_stun_URI() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        result0 = parse_stun_scheme();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_stun_host_port();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_stun_scheme() {
        var result0;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 5).toLowerCase() === "stuns") {
          result0 = input.substr(pos, 5);
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"stuns\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 4).toLowerCase() === "stun") {
            result0 = input.substr(pos, 4);
            pos += 4;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"stun\"");
            }
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, scheme) {
                              data.scheme = scheme; })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_stun_host_port() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_stun_host();
        if (result0 !== null) {
          pos1 = pos;
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_port();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = pos1;
            }
          } else {
            result1 = null;
            pos = pos1;
          }
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_stun_host() {
        var result0;
        var pos0;
        
        pos0 = pos;
        result0 = parse_IPv4address();
        if (result0 === null) {
          result0 = parse_IPv6reference();
          if (result0 === null) {
            result0 = parse_reg_name();
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, host) {
                              data.host = host; })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_reg_name() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result0 = [];
        result1 = parse_stun_unreserved();
        if (result1 === null) {
          result1 = parse_escaped();
          if (result1 === null) {
            result1 = parse_sub_delims();
          }
        }
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_stun_unreserved();
          if (result1 === null) {
            result1 = parse_escaped();
            if (result1 === null) {
              result1 = parse_sub_delims();
            }
          }
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                              return input.substring(pos, offset); })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_stun_unreserved() {
        var result0;
        
        result0 = parse_ALPHA();
        if (result0 === null) {
          result0 = parse_DIGIT();
          if (result0 === null) {
            if (input.charCodeAt(pos) === 45) {
              result0 = "-";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"-\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 46) {
                result0 = ".";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\".\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 95) {
                  result0 = "_";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"_\"");
                  }
                }
                if (result0 === null) {
                  if (input.charCodeAt(pos) === 126) {
                    result0 = "~";
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"~\"");
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_sub_delims() {
        var result0;
        
        if (input.charCodeAt(pos) === 33) {
          result0 = "!";
          pos++;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"!\"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos) === 36) {
            result0 = "$";
            pos++;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"$\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos) === 38) {
              result0 = "&";
              pos++;
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"&\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos) === 39) {
                result0 = "'";
                pos++;
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"'\"");
                }
              }
              if (result0 === null) {
                if (input.charCodeAt(pos) === 40) {
                  result0 = "(";
                  pos++;
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"(\"");
                  }
                }
                if (result0 === null) {
                  if (input.charCodeAt(pos) === 41) {
                    result0 = ")";
                    pos++;
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\")\"");
                    }
                  }
                  if (result0 === null) {
                    if (input.charCodeAt(pos) === 42) {
                      result0 = "*";
                      pos++;
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"*\"");
                      }
                    }
                    if (result0 === null) {
                      if (input.charCodeAt(pos) === 43) {
                        result0 = "+";
                        pos++;
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"+\"");
                        }
                      }
                      if (result0 === null) {
                        if (input.charCodeAt(pos) === 44) {
                          result0 = ",";
                          pos++;
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("\",\"");
                          }
                        }
                        if (result0 === null) {
                          if (input.charCodeAt(pos) === 59) {
                            result0 = ";";
                            pos++;
                          } else {
                            result0 = null;
                            if (reportFailures === 0) {
                              matchFailed("\";\"");
                            }
                          }
                          if (result0 === null) {
                            if (input.charCodeAt(pos) === 61) {
                              result0 = "=";
                              pos++;
                            } else {
                              result0 = null;
                              if (reportFailures === 0) {
                                matchFailed("\"=\"");
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_turn_URI() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        
        pos0 = pos;
        result0 = parse_turn_scheme();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 58) {
            result1 = ":";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\":\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_stun_host_port();
            if (result2 !== null) {
              pos1 = pos;
              if (input.substr(pos, 11) === "?transport=") {
                result3 = "?transport=";
                pos += 11;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\"?transport=\"");
                }
              }
              if (result3 !== null) {
                result4 = parse_transport();
                if (result4 !== null) {
                  result3 = [result3, result4];
                } else {
                  result3 = null;
                  pos = pos1;
                }
              } else {
                result3 = null;
                pos = pos1;
              }
              result3 = result3 !== null ? result3 : "";
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_turn_scheme() {
        var result0;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 5).toLowerCase() === "turns") {
          result0 = input.substr(pos, 5);
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"turns\"");
          }
        }
        if (result0 === null) {
          if (input.substr(pos, 4).toLowerCase() === "turn") {
            result0 = input.substr(pos, 4);
            pos += 4;
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"turn\"");
            }
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, scheme) {
                              data.scheme = scheme; })(pos0, result0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_turn_transport() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_transport();
        if (result0 !== null) {
          if (input.substr(pos, 3).toLowerCase() === "udp") {
            result1 = input.substr(pos, 3);
            pos += 3;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"udp\"");
            }
          }
          if (result1 === null) {
            if (input.substr(pos, 3).toLowerCase() === "tcp") {
              result1 = input.substr(pos, 3);
              pos += 3;
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\"tcp\"");
              }
            }
            if (result1 === null) {
              result1 = [];
              result2 = parse_unreserved();
              while (result2 !== null) {
                result1.push(result2);
                result2 = parse_unreserved();
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset) {
                              data.transport = transport; })(pos0);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_uuid_URI() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        if (input.substr(pos, 5) === "uuid:") {
          result0 = "uuid:";
          pos += 5;
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"uuid:\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_uuid();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_uuid() {
        var result0, result1, result2, result3, result4, result5, result6, result7, result8;
        var pos0, pos1;
        
        pos0 = pos;
        pos1 = pos;
        result0 = parse_hex8();
        if (result0 !== null) {
          if (input.charCodeAt(pos) === 45) {
            result1 = "-";
            pos++;
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"-\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_hex4();
            if (result2 !== null) {
              if (input.charCodeAt(pos) === 45) {
                result3 = "-";
                pos++;
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\"-\"");
                }
              }
              if (result3 !== null) {
                result4 = parse_hex4();
                if (result4 !== null) {
                  if (input.charCodeAt(pos) === 45) {
                    result5 = "-";
                    pos++;
                  } else {
                    result5 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"-\"");
                    }
                  }
                  if (result5 !== null) {
                    result6 = parse_hex4();
                    if (result6 !== null) {
                      if (input.charCodeAt(pos) === 45) {
                        result7 = "-";
                        pos++;
                      } else {
                        result7 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"-\"");
                        }
                      }
                      if (result7 !== null) {
                        result8 = parse_hex12();
                        if (result8 !== null) {
                          result0 = [result0, result1, result2, result3, result4, result5, result6, result7, result8];
                        } else {
                          result0 = null;
                          pos = pos1;
                        }
                      } else {
                        result0 = null;
                        pos = pos1;
                      }
                    } else {
                      result0 = null;
                      pos = pos1;
                    }
                  } else {
                    result0 = null;
                    pos = pos1;
                  }
                } else {
                  result0 = null;
                  pos = pos1;
                }
              } else {
                result0 = null;
                pos = pos1;
              }
            } else {
              result0 = null;
              pos = pos1;
            }
          } else {
            result0 = null;
            pos = pos1;
          }
        } else {
          result0 = null;
          pos = pos1;
        }
        if (result0 !== null) {
          result0 = (function(offset, uuid) {
                          data = input.substring(pos+5, offset); })(pos0, result0[0]);
        }
        if (result0 === null) {
          pos = pos0;
        }
        return result0;
      }
      
      function parse_hex4() {
        var result0, result1, result2, result3;
        var pos0;
        
        pos0 = pos;
        result0 = parse_HEXDIG();
        if (result0 !== null) {
          result1 = parse_HEXDIG();
          if (result1 !== null) {
            result2 = parse_HEXDIG();
            if (result2 !== null) {
              result3 = parse_HEXDIG();
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = pos0;
              }
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_hex8() {
        var result0, result1;
        var pos0;
        
        pos0 = pos;
        result0 = parse_hex4();
        if (result0 !== null) {
          result1 = parse_hex4();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      function parse_hex12() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = pos;
        result0 = parse_hex4();
        if (result0 !== null) {
          result1 = parse_hex4();
          if (result1 !== null) {
            result2 = parse_hex4();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = pos0;
            }
          } else {
            result0 = null;
            pos = pos0;
          }
        } else {
          result0 = null;
          pos = pos0;
        }
        return result0;
      }
      
      
      function cleanupExpected(expected) {
        expected.sort();
        
        var lastExpected = null;
        var cleanExpected = [];
        for (var i = 0; i < expected.length; i++) {
          if (expected[i] !== lastExpected) {
            cleanExpected.push(expected[i]);
            lastExpected = expected[i];
          }
        }
        return cleanExpected;
      }
      
      function computeErrorPosition() {
        /*
         * The first idea was to use |String.split| to break the input up to the
         * error position along newlines and derive the line and column from
         * there. However IE's |split| implementation is so broken that it was
         * enough to prevent it.
         */
        
        var line = 1;
        var column = 1;
        var seenCR = false;
        
        for (var i = 0; i < Math.max(pos, rightmostFailuresPos); i++) {
          var ch = input.charAt(i);
          if (ch === "\n") {
            if (!seenCR) { line++; }
            column = 1;
            seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            line++;
            column = 1;
            seenCR = true;
          } else {
            column++;
            seenCR = false;
          }
        }
        
        return { line: line, column: column };
      }
      
      
        var URI = require('./URI');
        var NameAddrHeader = require('./NameAddrHeader');
      
        var data = {};
      
      
      var result = parseFunctions[startRule]();
      
      /*
       * The parser is now in one of the following three states:
       *
       * 1. The parser successfully parsed the whole input.
       *
       *    - |result !== null|
       *    - |pos === input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 2. The parser successfully parsed only a part of the input.
       *
       *    - |result !== null|
       *    - |pos < input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 3. The parser did not successfully parse any part of the input.
       *
       *   - |result === null|
       *   - |pos === 0|
       *   - |rightmostFailuresExpected| contains at least one failure
       *
       * All code following this comment (including called functions) must
       * handle these states.
       */
      if (result === null || pos !== input.length) {
        var offset = Math.max(pos, rightmostFailuresPos);
        var found = offset < input.length ? input.charAt(offset) : null;
        var errorPosition = computeErrorPosition();
        
        new this.SyntaxError(
          cleanupExpected(rightmostFailuresExpected),
          found,
          offset,
          errorPosition.line,
          errorPosition.column
        );
        return -1;
      }
      
      return data;
    },
    
    /* Returns the parser source code. */
    toSource: function() { return this._source; }
  };
  
  /* Thrown when a parser encounters a syntax error. */
  
  result.SyntaxError = function(expected, found, offset, line, column) {
    function buildMessage(expected, found) {
      var expectedHumanized, foundHumanized;
      
      switch (expected.length) {
        case 0:
          expectedHumanized = "end of input";
          break;
        case 1:
          expectedHumanized = expected[0];
          break;
        default:
          expectedHumanized = expected.slice(0, expected.length - 1).join(", ")
            + " or "
            + expected[expected.length - 1];
      }
      
      foundHumanized = found ? quote(found) : "end of input";
      
      return "Expected " + expectedHumanized + " but " + foundHumanized + " found.";
    }
    
    this.name = "SyntaxError";
    this.expected = expected;
    this.found = found;
    this.message = buildMessage(expected, found);
    this.offset = offset;
    this.line = line;
    this.column = column;
  };
  
  result.SyntaxError.prototype = Error.prototype;
  
  return result;
})();

},{"./NameAddrHeader":18,"./URI":31}],15:[function(require,module,exports){
module.exports = Logger;

function DateFmt(fstr) {
  this.formatString = fstr;

  var mthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  var zeroPad = function(number) {
    return ("0"+number).substr(-2,2);
  };

  var dateMarkers = {
    d:['getDate',function(v) { return zeroPad(v);}],
    m:['getMonth',function(v) { return zeroPad(v+1);}],
    n:['getMonth',function(v) { return mthNames[v]; }],
    w:['getDay',function(v) { return dayNames[v]; }],
    y:['getFullYear'],
    H:['getHours',function(v) { return zeroPad(v);}],
    M:['getMinutes',function(v) { return zeroPad(v);}],
    S:['getSeconds',function(v) { return zeroPad(v);}],
    i:['toISOString']
  };

  this.format = function(date) {
    var dateTxt = this.formatString.replace(/%(.)/g, function(m, p) {
      var dateMarker = dateMarkers[p];
      var method = dateMarker[0];
      var rv = date[method]();

      if ( dateMarker[1] !== null ) {
        rv = dateMarker[1](rv);
      }

      return rv;

    });

    return dateTxt;
  };

}


function Logger(logger, category, label) {
  this.logger = logger;
  this.category = category;
  this.label = label;
  this.fmt = new DateFmt("%m%d/%H%M%S");
}

Logger.prototype.debug = function(content) {
  this.logger.debug(this.category, this.label, content);
};

Logger.prototype.log = function(content) {
  this.logger.log(this.category, this.label, content);
};

Logger.prototype.warn = function(content) {
  this.logger.warn(this.category, this.label, content);
};

Logger.prototype.error = function(content) {
  this.logger.error(this.category, this.label, content);
};

Logger.prototype.formatMsg = function(msg) {
  return this.getTime()+' : '+msg;
};
Logger.prototype.getTime = function() {
  return this.getTimeFor(new Date());
};
Logger.prototype.getTimeFor = function(date) {
  return this.fmt.format(date);
};
},{}],16:[function(require,module,exports){
module.exports = LoggerFactory;


/**
 * Dependencies.
 */
var Logger = require('./Logger');


function LoggerFactory(configuration) {
  var logger,
    levels = { 'error': 0, 'warn': 1, 'log': 2, 'debug': 3 },
    level = configuration && configuration.trace_sip === true ? 3 : 1,
    builtinEnabled = true,
    connector = null;

    this.loggers = {};

    logger = this.getLogger('ExSIP.loggerfactory');


  Object.defineProperties(this, {
    builtinEnabled: {
      get: function(){ return builtinEnabled; },
      set: function(value){
        if (typeof value === 'boolean') {
          builtinEnabled = value;
        } else {
          logger.error('invalid "builtinEnabled" parameter value: '+ JSON.stringify(value));
        }
      }
    },

    level: {
      get: function() {return level; },
      set: function(value) {
        if (value >= 0 && value <=3) {
          level = value;
        } else if (value > 3) {
          level = 3;
        } else if (levels.hasOwnProperty(value)) {
          level = levels[value];
        } else {
          logger.error('invalid "level" parameter value: '+ JSON.stringify(value));
        }
      }
    },

    connector: {
      get: function() {return connector; },
      set: function(value){
        if(value === null || value === "" || value === undefined) {
          connector = null;
        } else if (typeof value === 'function') {
          connector = value;
        } else {
          logger.error('invalid "connector" parameter value: '+ JSON.stringify(value));
        }
      }
    }
  });
}


LoggerFactory.prototype.print = function(target, category, label, content) {
  var prefix = [];

  prefix.push(new Date());

  prefix.push(category);

  if (label) {
    prefix.push(label);
  }

  prefix.push('');

  if (typeof content === 'string') {
    target.call(console, prefix.join(' | ') + content);
  } else {
    target.call(console, content);
  }
};

LoggerFactory.prototype.debug = function(category, label, content) {
  if (this.level === 3) {
    if (this.builtinEnabled) {
      this.print(console.info, category, label, content);
    }

    if (this.connector) {
      this.connector('debug', category, label, content);
    }
  }
};

LoggerFactory.prototype.log = function(category, label, content) {
  if (this.level >= 2) {
    if (this.builtinEnabled) {
      this.print(console.log, category, label, content);
    }

    if (this.connector) {
      this.connector('log', category, label, content);
    }
  }
};

LoggerFactory.prototype.warn = function(category, label, content) {
  if (this.level >= 1) {
    if (this.builtinEnabled) {
      this.print(console.warn, category, label, content);
    }

    if (this.connector) {
      this.connector('warn', category, label, content);
    }
  }
};

LoggerFactory.prototype.error = function(category, label, content) {
  if (this.builtinEnabled) {
    this.print(console.error,category, label, content);
  }

  if (this.connector) {
    this.connector('error', category, label, content);
  }
};

LoggerFactory.prototype.getLogger = function(category, label) {
  var logger;

  if (label && this.level === 1) {
    return new Logger(this, category, label);
  } else if (this.loggers[category]) {
    return this.loggers[category];
  } else {
    logger = new Logger(this, category);
    this.loggers[category] = logger;
    return logger;
  }
};

},{"./Logger":15}],17:[function(require,module,exports){
module.exports = Message;

function Message(ua) {
  this.ua = ua;
  this.logger = ua.getLogger('ExSIP.message');

  // Custom message empty object for high level use
  this.data = {};
}


/**
 * Dependencies.
 */
var ExSIP_C = require('./Constants');
var EventEmitter = require('./EventEmitter');
var SIPMessage = require('./SIPMessage');
var Utils = require('./Utils');
var RequestSender = require('./RequestSender');
var Transactions = require('./Transactions');
var Exceptions = require('./Exceptions');


Message.prototype = new EventEmitter();


Message.prototype.isDebug = function() {
  return this.ua.isDebug();
};

Message.prototype.send = function(target, body, options) {
  var request_sender, event, contentType, eventHandlers, extraHeaders,
    events = [
      'succeeded',
      'failed'
    ],
    originalTarget = target;

  if (target === undefined || body === undefined) {
    throw new TypeError('Not enough arguments');
  }

  // Check target validity
  target = this.ua.normalizeTarget(target);
  if (!target) {
    throw new TypeError('Invalid target: '+ originalTarget);
  }

  this.initEvents(events);

  // Get call options
  options = options || {};
  extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [];
  eventHandlers = options.eventHandlers || {};
  contentType = options.contentType || 'text/plain';

  this.content_type = contentType;

  // Set event handlers
  for (event in eventHandlers) {
    this.on(event, eventHandlers[event]);
  }

  this.closed = false;
  this.ua.applicants[this] = this;

  extraHeaders.push('Content-Type: '+ contentType);

  this.request = new SIPMessage.OutgoingRequest(ExSIP_C.MESSAGE, target, this.ua, null, extraHeaders);

  if(body) {
    this.request.body = body;
    this.content = body;
  } else {
    this.content = null;
  }

  request_sender = new RequestSender(this, this.ua);

  this.newMessage('local', this.request);

  request_sender.send();
};

Message.prototype.receiveResponse = function(response) {
  var cause;

  if(this.closed) {
    return;
  }
  switch(true) {
    case /^1[0-9]{2}$/.test(response.status_code):
      // Ignore provisional responses.
      break;

    case /^2[0-9]{2}$/.test(response.status_code):
      delete this.ua.applicants[this];
      this.emit('succeeded', this, {
        originator: 'remote',
        response: response
      });
      break;

    default:
      delete this.ua.applicants[this];
      cause = Utils.sipErrorCause(response.status_code);
      this.emit('failed', this, {
        originator: 'remote',
        response: response,
        cause: cause
      });
      break;
  }
};


Message.prototype.onRequestTimeout = function() {
  if(this.closed) {
    return;
  }
  this.emit('failed', this, {
    originator: 'system',
    cause: ExSIP_C.causes.REQUEST_TIMEOUT
  });
};

Message.prototype.onTransportError = function() {
  if(this.closed) {
    return;
  }
  this.emit('failed', this, {
    originator: 'system',
    cause: ExSIP_C.causes.CONNECTION_ERROR
  });
};

Message.prototype.close = function() {
  this.closed = true;
  delete this.ua.applicants[this];
};

Message.prototype.init_incoming = function(request) {
  var transaction;

  this.request = request;
  this.content_type = request.getHeader('Content-Type');

  if (request.body) {
    this.content = request.body;
  } else {
    this.content = null;
  }

  this.newMessage('remote', request);

  transaction = this.ua.transactions.nist[request.via_branch];

  if (transaction && (transaction.state === Transactions.C.STATUS_TRYING || transaction.state === Transactions.C.STATUS_PROCEEDING)) {
    request.reply(200);
  }
};

/**
 * Accept the incoming Message
 * Only valid for incoming Messages
 */
Message.prototype.accept = function(options) {
  options = options || {};

  var
    extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [],
    body = options.body;

  if (this.direction !== 'incoming') {
    throw new Exceptions.NotSupportedError('"accept" not supported for outgoing Message');
  }

  this.request.reply(200, null, extraHeaders, body);
};

/**
 * Reject the incoming Message
 * Only valid for incoming Messages
 */
Message.prototype.reject = function(options) {
  options = options || {};

  var
    status_code = options.status_code || 480,
    reason_phrase = options.reason_phrase,
    extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [],
    body = options.body;

  if (this.direction !== 'incoming') {
    throw new Exceptions.NotSupportedError('"reject" not supported for outgoing Message');
  }

  if (status_code < 300 || status_code >= 700) {
    throw new TypeError('Invalid status_code: '+ status_code);
  }

  this.request.reply(status_code, reason_phrase, extraHeaders, body);
};

/**
 * Internal Callbacks
 */

Message.prototype.newMessage = function(originator, request) {
  var message = this,
    event_name = 'newMessage';

  if (originator === 'remote') {
    message.direction = 'incoming';
    message.local_identity = request.to;
    message.remote_identity = request.from;
  } else if (originator === 'local'){
    message.direction = 'outgoing';
    message.local_identity = request.from;
    message.remote_identity = request.to;
  }

  message.ua.emit(event_name, message.ua, {
    originator: originator,
    message: message,
    request: request
  });
};
},{"./Constants":7,"./EventEmitter":11,"./Exceptions":13,"./RequestSender":25,"./SIPMessage":26,"./Transactions":28,"./Utils":32}],18:[function(require,module,exports){
module.exports = NameAddrHeader;


/**
 * Dependencies.
 */
var URI = require('./URI');
var Grammar = require('./Grammar');


function NameAddrHeader(uri, display_name, parameters) {
  var param;

  // Checks
  if(!uri || !(uri instanceof URI)) {
    throw new TypeError('missing or invalid "uri" parameter');
  }

  // Initialize parameters
  this.uri = uri;
  this.parameters = {};

  for (param in parameters) {
    this.setParam(param, parameters[param]);
  }

  Object.defineProperties(this, {
    display_name: {
      get: function() { return display_name; },
      set: function(value) {
        display_name = (value === 0) ? '0' : value;
      }
    }
  });
}

NameAddrHeader.prototype = {
  setParam: function(key, value) {
    if (key) {
      this.parameters[key.toLowerCase()] = (typeof value === 'undefined' || value === null) ? null : value.toString();
    }
  },

  getParam: function(key) {
    if(key) {
      return this.parameters[key.toLowerCase()];
    }
  },

  hasParam: function(key) {
    if(key) {
      return (this.parameters.hasOwnProperty(key.toLowerCase()) && true) || false;
    }
  },

  deleteParam: function(parameter) {
    var value;
    parameter = parameter.toLowerCase();
    if (this.parameters.hasOwnProperty(parameter)) {
      value = this.parameters[parameter];
      delete this.parameters[parameter];
      return value;
    }
  },

  clearParams: function() {
    this.parameters = {};
  },

  clone: function() {
    return new NameAddrHeader(
      this.uri.clone(),
      this.display_name,
      JSON.parse(JSON.stringify(this.parameters)));
  },

  toString: function() {
    var body, parameter;

    body  = (this.display_name || this.display_name === 0) ? '"' + this.display_name + '" ' : '';
    body += '<' + this.uri.toString() + '>';

    for (parameter in this.parameters) {
      body += ';' + parameter;

      if (this.parameters[parameter] !== null) {
        body += '='+ this.parameters[parameter];
      }
    }

    return body;
  }
};


/**
  * Parse the given string and returns a NameAddrHeader instance or undefined if
  * it is an invalid NameAddrHeader.
  */
NameAddrHeader.parse = function(name_addr_header) {
  name_addr_header = Grammar.parse(name_addr_header,'Name_Addr_Header');

  if (name_addr_header !== -1) {
    return name_addr_header;
  } else {
    return undefined;
  }
};
},{"./Grammar":14,"./URI":31}],19:[function(require,module,exports){
var Parser = {};

module.exports = Parser;


/**
 * Dependencies.
 */
var sdp_transform = require('sdp-transform');
var Grammar = require('./Grammar');
var SIPMessage = require('./SIPMessage');


/**
 * Extract and parse every header of a SIP message.
 */
function getHeader(data, headerStart) {
  var
    // 'start' position of the header.
    start = headerStart,
    // 'end' position of the header.
    end = 0,
    // 'partial end' position of the header.
    partialEnd = 0;

  //End of message.
  if (data.substring(start, start + 2).match(/(^\r\n)/)) {
    return -2;
  }

  while(end === 0) {
    // Partial End of Header.
    partialEnd = data.indexOf('\r\n', start);

    // 'indexOf' returns -1 if the value to be found never occurs.
    if (partialEnd === -1) {
      return partialEnd;
    }

    if(!data.substring(partialEnd + 2, partialEnd + 4).match(/(^\r\n)/) && data.charAt(partialEnd + 2).match(/(^\s+)/)) {
      // Not the end of the message. Continue from the next position.
      start = partialEnd + 2;
    } else {
      end = partialEnd;
    }
  }

  return end;
}

function parseHeader(message, data, headerStart, headerEnd) {
  var header, idx, length, parsed,
    hcolonIndex = data.indexOf(':', headerStart),
    headerName = data.substring(headerStart, hcolonIndex).trim(),
    headerValue = data.substring(hcolonIndex + 1, headerEnd).trim();

  // If header-field is well-known, parse it.
  switch(headerName.toLowerCase()) {
    case 'via':
    case 'v':
      message.addHeader('via', headerValue);
      if(message.getHeaders('via').length === 1) {
        parsed = message.parseHeader('Via');
        if(parsed) {
          message.via = parsed;
          message.via_branch = parsed.branch;
        }
      } else {
        parsed = 0;
      }
      break;
    case 'from':
    case 'f':
      message.setHeader('from', headerValue);
      parsed = message.parseHeader('from');
      if(parsed) {
        message.from = parsed;
        message.from_tag = parsed.getParam('tag');
      }
      break;
    case 'to':
    case 't':
      message.setHeader('to', headerValue);
      parsed = message.parseHeader('to');
      if(parsed) {
        message.to = parsed;
        message.to_tag = parsed.getParam('tag');
      }
      break;
    case 'record-route':
      parsed = Grammar.parse(headerValue, 'Record_Route');

      if (parsed === -1) {
        parsed = undefined;
      }

      length = parsed.length;
      for (idx = 0; idx < length; idx++) {
        header = parsed[idx];
        message.addHeader('record-route', headerValue.substring(header.possition, header.offset));
        message.headers['Record-Route'][message.getHeaders('record-route').length - 1].parsed = header.parsed;
      }
      break;
    case 'call-id':
    case 'i':
      message.setHeader('call-id', headerValue);
      parsed = message.parseHeader('call-id');
      if(parsed) {
        message.call_id = headerValue;
      }
      break;
    case 'contact':
    case 'm':
      parsed = Grammar.parse(headerValue, 'Contact');

      if (parsed === -1) {
        parsed = undefined;
      }

      length = parsed.length;
      for (idx = 0; idx < length; idx++) {
        header = parsed[idx];
        message.addHeader('contact', headerValue.substring(header.possition, header.offset));
        message.headers.Contact[message.getHeaders('contact').length - 1].parsed = header.parsed;
      }
      break;
    case 'content-length':
    case 'l':
      message.setHeader('content-length', headerValue);
      parsed = message.parseHeader('content-length');
      break;
    case 'content-type':
    case 'c':
      message.setHeader('content-type', headerValue);
      parsed = message.parseHeader('content-type');
      break;
    case 'cseq':
      message.setHeader('cseq', headerValue);
      parsed = message.parseHeader('cseq');
      if(parsed) {
        message.cseq = parsed.value;
      }
      if(message instanceof SIPMessage.IncomingResponse) {
        message.method = parsed.method;
      }
      break;
    case 'max-forwards':
      message.setHeader('max-forwards', headerValue);
      parsed = message.parseHeader('max-forwards');
      break;
    case 'www-authenticate':
      message.setHeader('www-authenticate', headerValue);
      parsed = message.parseHeader('www-authenticate');
      break;
    case 'proxy-authenticate':
      message.setHeader('proxy-authenticate', headerValue);
      parsed = message.parseHeader('proxy-authenticate');
      break;
    default:
      // Do not parse this header.
      message.setHeader(headerName, headerValue);
      parsed = 0;
  }

  if (parsed === undefined) {
    return {
      error: 'error parsing header "'+ headerName +'"'
    };
  } else {
    return true;
  }
}


/**
 * Parse SIP Message
 */
Parser.parseMessage = function(data, ua) {
  var message, firstLine, contentLength, bodyStart, parsed,
    headerStart = 0,
    headerEnd = data.indexOf('\r\n'),
    logger = ua.getLogger('ExSIP.parser');

  if(headerEnd === -1) {
    logger.warn('no CRLF found, not a SIP message, discarded');
    return;
  }

  // Parse first line. Check if it is a Request or a Reply.
  firstLine = data.substring(0, headerEnd);
  parsed = Grammar.parse(firstLine, 'Request_Response');

  if(parsed === -1) {
    logger.warn('error parsing first line of SIP message: "' + firstLine + '"');
    return;
  } else if(!parsed.status_code) {
    message = new SIPMessage.IncomingRequest(ua);
    message.method = parsed.method;
    message.ruri = parsed.uri;
  } else {
    message = new SIPMessage.IncomingResponse(ua);
    message.status_code = parsed.status_code;
    message.reason_phrase = parsed.reason_phrase;
  }

  message.data = data;
  headerStart = headerEnd + 2;

  /* Loop over every line in data. Detect the end of each header and parse
  * it or simply add to the headers collection.
  */
  while(true) {
    headerEnd = getHeader(data, headerStart);

    // The SIP message has normally finished.
    if(headerEnd === -2) {
      bodyStart = headerStart + 2;
      break;
    }
    // data.indexOf returned -1 due to a malformed message.
    else if(headerEnd === -1) {
      parsed.error('malformed message');
      return;
    }

    parsed = parseHeader(message, data, headerStart, headerEnd);

    if(parsed !== true) {
      logger.error(parsed.error);
      return;
    }

    headerStart = headerEnd + 2;
  }

  /* RFC3261 18.3.
   * If there are additional bytes in the transport packet
   * beyond the end of the body, they MUST be discarded.
   */
  if(message.hasHeader('content-length')) {
    contentLength = message.getHeader('content-length');
    message.body = data.substr(bodyStart, contentLength);
  } else {
    message.body = data.substring(bodyStart);
  }

  return message;
};

/**
 * sdp-transform features.
 */
Parser.parseSDP = sdp_transform.parse;
Parser.writeSDP = sdp_transform.write;
Parser.parseFmtpConfig = sdp_transform.parseFmtpConfig;
Parser.parsePayloads = sdp_transform.parsePayloads;
Parser.parseRemoteCandidates = sdp_transform.parseRemoteCandidates;
},{"./Grammar":14,"./SIPMessage":26,"sdp-transform":2}],20:[function(require,module,exports){
module.exports = RTCSession;


var C = {
  // RTCSession states
  STATUS_NULL: 0,
  STATUS_INVITE_SENT: 1,
  STATUS_1XX_RECEIVED: 2,
  STATUS_INVITE_RECEIVED: 3,
  STATUS_WAITING_FOR_ANSWER: 4,
  STATUS_ANSWERED: 5,
  STATUS_WAITING_FOR_ACK: 6,
  STATUS_CANCELED: 7,
  STATUS_TERMINATED: 8,
  STATUS_CONFIRMED: 9,
  STATUS_REFER_SENT: 10,
  STATUS_BYE_SENT: 11
};

/**
 * Expose C object.
 */
RTCSession.C = C;

/**
 * Dependencies.
 */
var ExSIP_C = require('./Constants');
var EventEmitter = require('./EventEmitter');
var Exceptions = require('./Exceptions');
var Parser = require('./Parser');
var Utils = require('./Utils');
var Timers = require('./Timers');
var UA = require('./UA');
var WebRTC = require('./WebRTC');
var SIPMessage = require('./SIPMessage');
var Dialog = require('./Dialog');
var RequestSender = require('./RequestSender');
var RTCSession_RTCMediaHandler = require('./RTCSession/RTCMediaHandler');
var RTCSession_DTMF = require('./RTCSession/DTMF');


function RTCSession(ua) {
  var events = [
    'connecting',
    'progress',
    'failed',
    'accepted',
    'confirmed',
    'ended',
    'newDTMF',
    'hold',
    'held',
    'resumed',
    'unhold',
    'muted',
    'unmuted',
    'started',
    'onReInvite',
    'dataSent',
    'dataReceived',
    'iceconnected',
    'icecompleted',
    'iceclosed'
  ];

  this.ua = ua;
  this.setStatus(C.STATUS_NULL);
  this.dialog = null;
  this.earlyDialogs = {};
  this.rtcMediaHandler = null;
  this.receiveResponse = this.receiveInviteResponse;

  // RTCSession confirmation flag
  this.is_confirmed = false;

  // is late SDP being negotiated
  this.late_sdp = false;

  // Session Timers
  this.timers = {
    ackTimer: null,
    expiresTimer: null,
    invite2xxTimer: null,
    userNoAnswerTimer: null
  };

  // Custom session empty object for high level use
  this.data = {};
  this.dtmf = new RTCSession_DTMF(this);

  /**
   * User API
   */

  // Mute/Hold state
  this.isOnHold = false;
  this.audioMuted = false;
  this.videoMuted = false;
  this.local_hold = false;
  this.remote_hold = false;
  this.start_time = null;

  this.pending_actions = {
    actions: [],

    length: function() {
      return this.actions.length;
    },

    isPending: function(name) {
      var
        idx = 0,
        length = this.actions.length;

      for (idx; idx < length; idx++) {
        if (this.actions[idx].name === name) {
          return true;
        }
      }
      return false;
    },

    shift: function() {
      return this.actions.shift();
    },

    push: function(name) {
      this.actions.push({
        name: name
      });
    },

    pop: function(name) {
      var
        idx = 0,
        length = this.actions.length;

      for (idx; idx < length; idx++) {
        if (this.actions[idx].name === name) {
          this.actions.splice(idx, 1);
        }
      }
    }
  };

  // Custom session empty object for high level use
  this.data = {};

  this.initEvents(events);
}

RTCSession.prototype = new EventEmitter();

RTCSession.prototype.hasRemoteAudio = function() {
  return this.rtcMediaHandler && this.rtcMediaHandler.peerConnection && this.rtcMediaHandler.peerConnection.remoteDescription &&
  this.rtcMediaHandler.peerConnection.remoteDescription.hasAudio();
};

RTCSession.prototype.hasRemoteVideo = function() {
  return this.rtcMediaHandler && this.rtcMediaHandler.peerConnection && this.rtcMediaHandler.peerConnection.remoteDescription &&
  this.rtcMediaHandler.peerConnection.remoteDescription.hasVideo();
};

RTCSession.prototype.hasLocalAudio = function() {
  return this.rtcMediaHandler && this.rtcMediaHandler.peerConnection && this.rtcMediaHandler.peerConnection.localDescription &&
  this.rtcMediaHandler.peerConnection.localDescription.hasAudio();
};

RTCSession.prototype.hasLocalVideo = function() {
  return this.rtcMediaHandler && this.rtcMediaHandler.peerConnection && this.rtcMediaHandler.peerConnection.localDescription &&
  this.rtcMediaHandler.peerConnection.localDescription.hasVideo();
};

/**
 * Terminate the call.
 */
RTCSession.prototype.terminate = function(options) {
  options = options || {};

  var cancel_reason,
    status_code = options.status_code,
    reason_phrase = options.reason_phrase,
    extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [],
    body = options.body;

  // Check Session Status
  if (this.status === C.STATUS_TERMINATED) {
    throw new Exceptions.InvalidStateError(this.status);
  }

  this.logger.log('terminate with status : ' + this.status);

  switch (this.status) {
    // - UAC -
    case C.STATUS_NULL:
    case C.STATUS_INVITE_SENT:
    case C.STATUS_1XX_RECEIVED:
      this.logger.debug('canceling RTCSession');

      if (status_code && (status_code < 200 || status_code >= 700)) {
        throw new TypeError('Invalid status_code: ' + status_code);
      } else if (status_code) {
        reason_phrase = reason_phrase || ExSIP_C.REASON_PHRASE[status_code] || '';
        cancel_reason = 'SIP ;cause=' + status_code + ' ;text="' + reason_phrase + '"';
      }

      // Check Session Status
      if (this.status === C.STATUS_NULL) {
        this.isCanceled = true;
        this.cancelReason = cancel_reason;
      } else if (this.status === C.STATUS_INVITE_SENT) {
        if (this.received_100) {
          this.logger.debug('canceling after received 100 response');
          if (typeof(this.request.cancel) === 'undefined') {
            this.sendBye(options);
            this.ended('local', null, ExSIP_C.causes.BYE);
          } else {
            this.isCanceled = true;
            this.logger.log('terminate on 100 - setting isCanceled = true', this.ua);
            this.request.cancel(cancel_reason);
          }
        } else {
          this.isCanceled = true;
          this.cancelReason = cancel_reason;
        }
      } else if (this.status === C.STATUS_1XX_RECEIVED) {
        this.isCanceled = true;
        this.logger.log('terminate on 1xx - setting isCanceled = true');
        this.request.cancel(cancel_reason);
      }

      this.setStatus(C.STATUS_CANCELED);

      this.failed('local', null, ExSIP_C.causes.CANCELED);
      break;

      // - UAS -
    case C.STATUS_WAITING_FOR_ANSWER:
      this.logger.log('rejecting RTCSession with 486 Busy Here', this.ua);
      this.request.reply(486);
      this.failed('local', null, ExSIP_C.causes.REJECTED);
      break;
    case C.STATUS_ANSWERED:
      this.logger.debug('rejecting RTCSession');

      status_code = status_code || 480;

      if (status_code < 300 || status_code >= 700) {
        throw new TypeError('Invalid status_code: ' + status_code);
      }

      this.request.reply(status_code, reason_phrase, extraHeaders, body);
      this.failed('local', null, ExSIP_C.causes.REJECTED);
      break;

    case C.STATUS_WAITING_FOR_ACK:
    case C.STATUS_REFER_SENT:
    case C.STATUS_CONFIRMED:
      this.logger.debug('terminating RTCSession');

      // Send Bye
      this.sendBye(options);
      return;
      // reason_phrase = options.reason_phrase || ExSIP_C.REASON_PHRASE[status_code] || '';

      // if (status_code && (status_code < 200 || status_code >= 700)) {
      //   throw new TypeError('Invalid status_code: '+ status_code);
      // } else if (status_code) {
      //   extraHeaders.push('Reason: SIP ;cause=' + status_code + '; text="' + reason_phrase + '"');
      // }

      // /* RFC 3261 section 15 (Terminating a session):
      //   *
      //   * "...the callee's UA MUST NOT send a BYE on a confirmed dialog
      //   * until it has received an ACK for its 2xx response or until the server
      //   * transaction times out."
      //   */
      // if (this.status === C.STATUS_WAITING_FOR_ACK &&
      //     this.direction === 'incoming' &&
      //     this.request.server_transaction.state !== Transactions.C.STATUS_TERMINATED) {

      //   // Save the dialog for later restoration
      //   dialog = this.dialog;

      //   // Send the BYE as soon as the ACK is received...
      //   this.receiveRequest = function(request) {
      //     if(request.method === ExSIP_C.ACK) {
      //       self.sendBye({
      //         extraHeaders: extraHeaders,
      //         body: body
      //       });
      //       // this.sendRequest(ExSIP_C.BYE, {
      //       //   extraHeaders: extraHeaders,
      //       //   body: body
      //       // });
      //       dialog.terminate();
      //     }
      //   };

      //   // .., or when the INVITE transaction times out
      //   this.request.server_transaction.on('stateChanged', function(e){
      //     if (e.sender.state === Transactions.C.STATUS_TERMINATED) {
      //       self.sendBye({
      //         extraHeaders: extraHeaders,
      //         body: body
      //       });
      //       // self.sendRequest(ExSIP_C.BYE, {
      //       //   extraHeaders: extraHeaders,
      //       //   body: body
      //       // });
      //       dialog.terminate();
      //     }
      //   });

      //   this.ended('local', null, cause);

      //   // Restore the dialog into 'this' in order to be able to send the in-dialog BYE :-)
      //   this.dialog = dialog;

      //   // Restore the dialog into 'ua' so the ACK can reach 'this' session
      //   this.ua.dialogs[dialog.id.toString()] = dialog;

      // } else {
      //   self.sendBye({
      //     extraHeaders: extraHeaders,
      //     body: body
      //   });
      //   return;
      //   // this.sendRequest(ExSIP_C.BYE, {
      //   //   extraHeaders: extraHeaders,
      //   //   body: body
      //   // });

      //   // this.ended('local', null, cause);
      // }
  }

  this.close();
};

/**
 * Answer the call.
 */
RTCSession.prototype.answer = function(options) {
  options = options || {};

  var idx, length, sdp, remoteDescription,
    hasAudio = false,
    hasVideo = false,
    self = this,
    request = this.request,
    extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [],
    mediaConstraints = options.mediaConstraints || {},
    mediaStream = options.mediaStream || null,

    // rtcMediaHandler.createAnswer or rtcMediaHandler.createOffer succeeded
    sdpCreationSucceeded = function(body) {
      var
      // run for reply success callback
        replySucceeded = function() {
          self.setStatus(C.STATUS_WAITING_FOR_ACK);

          self.setInvite2xxTimer(request, body);
          self.setACKTimer();
          self.accepted('local');
          self.started('local');
        },

        // run for reply failure callback
        replyFailed = function() {
          self.failed('system', null, ExSIP_C.causes.CONNECTION_ERROR);
        };

      request.reply(200, null, extraHeaders,
        body,
        replySucceeded,
        replyFailed
      );
    },

    // rtcMediaHandler.createAnswer or rtcMediaHandler.createOffer failed
    sdpCreationFailed = function() {
      if (self.status === C.STATUS_TERMINATED) {
        return;
      }

      self.failed('system', null, ExSIP_C.causes.WEBRTC_ERROR);
    };

  this.data = options.data || {};

  // Check Session Direction and Status
  if (this.direction !== 'incoming') {
    throw new Exceptions.NotSupportedError('"answer" not supported for outgoing RTCSession');
  } else if (this.status !== C.STATUS_WAITING_FOR_ANSWER) {
    throw new Exceptions.InvalidStateError(this.status);
  }

  this.setStatus(C.STATUS_ANSWERED);

  // An error on dialog creation will fire 'failed' event
  if (!this.createDialog(request, 'UAS')) {
    request.reply(500, 'Missing Contact header field');
    return;
  }

  clearTimeout(this.timers.userNoAnswerTimer);

  extraHeaders.unshift('Contact: ' + self.contact);

  // Determine incoming media from remote session description
  remoteDescription = this.rtcMediaHandler.peerConnection.remoteDescription || {};
  sdp = Parser.parseSDP(remoteDescription.sdp || '');

  // Make sure sdp is an array, not the case if there is only one media
  if (!(sdp.media instanceof Array)) {
    sdp.media = [sdp.media || []];
  }

  // Go through all medias in SDP to find offered capabilities to answer with
  idx = sdp.media.length;
  while (idx--) {
    if (sdp.media[idx].type === 'audio' &&
      (sdp.media[idx].direction === 'sendrecv' ||
        sdp.media[idx].direction === 'recvonly')) {
      hasAudio = true;
    }
    if (sdp.media[idx].type === 'video' &&
      (sdp.media[idx].direction === 'sendrecv' ||
        sdp.media[idx].direction === 'recvonly')) {
      hasVideo = true;
    }
  }

  // Remove audio from mediaStream if suggested by mediaConstraints
  if (mediaStream && mediaConstraints.audio === false) {
    length = mediaStream.getAudioTracks().length;
    for (idx = 0; idx < length; idx++) {
      mediaStream.removeTrack(mediaStream.getAudioTracks()[idx]);
    }
  }

  // Remove video from mediaStream if suggested by mediaConstraints
  if (mediaStream && mediaConstraints.video === false) {
    length = mediaStream.getVideoTracks().length;
    for (idx = 0; idx < length; idx++) {
      mediaStream.removeTrack(mediaStream.getVideoTracks()[idx]);
    }
  }

  // Set audio constraints based on incoming stream if not supplied
  if (mediaConstraints.audio === undefined) {
    mediaConstraints.audio = hasAudio;
  }

  // Set video constraints based on incoming stream if not supplied
  if (mediaConstraints.video === undefined) {
    mediaConstraints.video = hasVideo;
  }

  this.getUserMedia(mediaConstraints, sdpCreationSucceeded, sdpCreationFailed, {
    isAnswer: true,
    remoteSdp: request.body
  });
};

/**
 * Send a DTMF
 */
RTCSession.prototype.sendDTMF = function(tones, options) {
  var duration, interToneGap;

  options = options || {};
  duration = options.duration || null;
  interToneGap = options.interToneGap || null;

  if (tones === undefined) {
    throw new TypeError('Not enough arguments');
  }

  // Check Session Status
  if (this.status !== C.STATUS_CONFIRMED && this.status !== C.STATUS_WAITING_FOR_ACK) {
    throw new Exceptions.InvalidStateError(this.status);
  }

  // Convert to string
  if (typeof tones === 'number') {
    tones = tones.toString();
  }

  // Check tones
  if (!tones || typeof tones !== 'string' || !tones.match(/^[0-9A-D#*,]+$/i)) {
    throw new TypeError('Invalid tones: ' + tones);
  }

  // Check duration
  if (duration && !Utils.isDecimal(duration)) {
    throw new TypeError('Invalid tone duration: ' + duration);
  } else if (!duration) {
    duration = RTCSession_DTMF.C.DEFAULT_DURATION;
  } else if (duration < RTCSession_DTMF.C.MIN_DURATION) {
    this.logger.warn('"duration" value is lower than the minimum allowed, setting it to ' + RTCSession_DTMF.C.MIN_DURATION + ' milliseconds');
    duration = RTCSession_DTMF.C.MIN_DURATION;
  } else if (duration > RTCSession_DTMF.C.MAX_DURATION) {
    this.logger.warn('"duration" value is greater than the maximum allowed, setting it to ' + RTCSession_DTMF.C.MAX_DURATION + ' milliseconds');
    duration = RTCSession_DTMF.C.MAX_DURATION;
  } else {
    duration = Math.abs(duration);
  }
  options.duration = duration;

  // Check interToneGap
  if (interToneGap && !Utils.isDecimal(interToneGap)) {
    throw new TypeError('Invalid interToneGap: ' + interToneGap);
  } else if (!interToneGap) {
    interToneGap = RTCSession_DTMF.C.DEFAULT_INTER_TONE_GAP;
  } else if (interToneGap < RTCSession_DTMF.C.MIN_INTER_TONE_GAP) {
    this.logger.warn('"interToneGap" value is lower than the minimum allowed, setting it to ' + RTCSession_DTMF.C.MIN_INTER_TONE_GAP + ' milliseconds');
    interToneGap = RTCSession_DTMF.C.MIN_INTER_TONE_GAP;
  } else {
    interToneGap = Math.abs(interToneGap);
  }

  this.dtmf.send(tones, options);
};

/**
 * Accepts the reInvite.
 * @param {Object} [options]
 */
RTCSession.prototype.rejectReInvite = function(options) {
  options = options || {};

  this.logger.log('rejecting re-INVITE');

  this.request.reply(488);
};

/**
 * Accepts the reInvite.
 * @param {Object} [options]
 */
RTCSession.prototype.acceptReInvite = function(options) {
  options = options || {};

  var self = this,
    extraHeaders = options.extraHeaders || [];

  this.logger.log('accepting re-INVITE');

  var replySucceeded = function() {
    var timeout = Timers.T1;

    self.setStatus(C.STATUS_WAITING_FOR_ACK);

    /**
     * RFC3261 13.3.1.4
     * Response retransmissions cannot be accomplished by transaction layer
     *  since it is destroyed when receiving the first 2xx answer
     */
    self.timers.invite2xxTimer = setTimeout(function invite2xxRetransmission() {
        if (self.status !== C.STATUS_WAITING_FOR_ACK) {
          return;
        }

        self.request.reply(200, null, extraHeaders, self.rtcMediaHandler.peerConnection.localDescription.sdp);

        if (timeout < Timers.T2) {
          timeout = timeout * 2;
          if (timeout > Timers.T2) {
            timeout = Timers.T2;
          }
        }
        self.timers.invite2xxTimer = setTimeout(
          invite2xxRetransmission, timeout
        );
      },
      timeout
    );

    /**
     * RFC3261 14.2
     * If a UAS generates a 2xx response and never receives an ACK,
     *  it SHOULD generate a BYE to terminate the dialog.
     */
    self.timers.ackTimer = setTimeout(function() {
        if (self.status === C.STATUS_WAITING_FOR_ACK) {
          self.logger.log('no ACK received');
          //                window.clearTimeout(self.timers.invite2xxTimer);
          //                self.sendBye();
          //                self.ended('remote', null, ExSIP.C.causes.NO_ACK);
        }
      },
      Timers.TIMER_H
    );

    self.started('local', undefined, true);
  };

  var replyFailed = function() {
    self.failed('system', null, ExSIP_C.causes.CONNECTION_ERROR);
  };

  //    var previousRemoteDescription = self.rtcMediaHandler.peerConnection.remoteDescription;
  var connectSuccess = function() {
    self.logger.debug('onMessage success');
    self.request.reply(200, null, extraHeaders,
      self.rtcMediaHandler.peerConnection.localDescription.getSdp({
        additionalSdp: self.rtcMediaHandler.peerConnection.remoteUnsupportedMedia
      }),
      replySucceeded,
      replyFailed
    );
  };

  var connectFailed = function(e) {
    self.logger.warn('invalid SDP');
    self.logger.warn(e);
    self.request.reply(488);
  };

  this.initialRemoteSdp = this.initialRemoteSdp || self.rtcMediaHandler.peerConnection.remoteDescription.sdp;
  var sdp = this.request.body;
  if (sdp.length === 0) {
    this.logger.debug('empty sdp');
  }
  this.reconnectRtcMediaHandler(connectSuccess, connectFailed, {
    isAnswer: true,
    remoteSdp: sdp,
    isReconnect: true
  });
};

RTCSession.prototype.reconnectRtcMediaHandler = function(connectSuccess, connectFailed, options) {
  var self = this;
  options = options || {};
  var localMedia = options.localMedia || this.rtcMediaHandler.localMedia || self.ua.localMedia;
  options.createOfferConstraints = options.createOfferConstraints || this.rtcMediaHandler.createOfferConstraints;
  this.rtcMediaHandler.close(!!options.localMedia);

  this.initRtcMediaHandler(options);
  this.rtcMediaHandler.localMedia = localMedia;
  this.rtcMediaHandler.createOfferConstraints = options.createOfferConstraints;
  this.connectRtcMediaHandler(localMedia, function() {
    self.started('local', undefined, true);
    connectSuccess();
  }, connectFailed, options);
};

// /**
//  * Send a generic in-dialog Request
//  */
// RTCSession.prototype.sendRequest = function(method, options, callbacks) {
//   var request = new RTCSession_Request(this, callbacks);

//   if(options.status) {
//     this.status = options.status;
//   }
//   request.body = options.sdp;

//   request.send(method, options);
// };

/**
 * Check if RTCSession is ready for a re-INVITE
 */
RTCSession.prototype.isReadyToReinvite = function() {
  // rtcMediaHandler is not ready
  if (!this.rtcMediaHandler.isReady()) {
    return;
  }

  // Another INVITE transaction is in progress
  if (this.dialog.uac_pending_reply === true || this.dialog.uas_pending_reply === true) {
    return false;
  } else {
    return true;
  }
};


/**
 * Mute
 */
RTCSession.prototype.mute = function(options) {
  options = options || {
    audio: true,
    video: false
  };

  var
    audioMuted = false,
    videoMuted = false;

  if (this.audioMuted === false && options.audio) {
    audioMuted = true;
    this.audioMuted = true;
    this.toogleMuteAudio(true);
  }

  if (this.videoMuted === false && options.video) {
    videoMuted = true;
    this.videoMuted = true;
    this.toogleMuteVideo(true);
  }

  if (audioMuted === true || videoMuted === true) {
    this.onmute({
      audio: audioMuted,
      video: videoMuted
    });
  }
};

/**
 * Unmute
 */
RTCSession.prototype.unmute = function(options) {
  options = options || {
    audio: true,
    video: true
  };

  var
    audioUnMuted = false,
    videoUnMuted = false;

  if (this.audioMuted === true && options.audio) {
    audioUnMuted = true;
    this.audioMuted = false;

    if (this.local_hold === false) {
      this.toogleMuteAudio(false);
    }
  }

  if (this.videoMuted === true && options.video) {
    videoUnMuted = true;
    this.videoMuted = false;

    if (this.local_hold === false) {
      this.toogleMuteVideo(false);
    }
  }

  if (audioUnMuted === true || videoUnMuted === true) {
    this.onunmute({
      audio: audioUnMuted,
      video: videoUnMuted
    });
  }
};

/**
 * isMuted
 */
RTCSession.prototype.isMuted = function() {
  return {
    audio: this.audioMuted,
    video: this.videoMuted
  };
};

/**
 * Hold
 */
// RTCSession.prototype.hold = function() {

//   if (this.status !== C.STATUS_WAITING_FOR_ACK && this.status !== C.STATUS_CONFIRMED) {
//     throw new Exceptions.InvalidStateError(this.status);
//   }

//   this.toogleMuteAudio(true);
//   this.toogleMuteVideo(true);

//   if (!this.isReadyToReinvite()) {
//     /* If there is a pending 'unhold' action, cancel it and don't queue this one
//      * Else, if there isn't any 'hold' action, add this one to the queue
//      * Else, if there is already a 'hold' action, skip
//      */
//     if (this.pending_actions.isPending('unhold')) {
//       this.pending_actions.pop('unhold');
//       return;
//     } else if (!this.pending_actions.isPending('hold')) {
//       this.pending_actions.push('hold');
//       return;
//     } else {
//       return;
//     }
//   } else {
//     if (this.local_hold === true) {
//       return;
//     }
//   }

//   this.onhold('local');

//   this.sendReinvite({
//     mangle: function(body) {
//       var idx, length;

//       body = Parser.parseSDP(body);

//       length = body.media.length;
//       for (idx = 0; idx < length; idx++) {
//         if (body.media[idx].direction === undefined) {
//           body.media[idx].direction = 'sendonly';
//         } else if (body.media[idx].direction === 'sendrecv') {
//           body.media[idx].direction = 'sendonly';
//         } else if (body.media[idx].direction === 'sendonly') {
//           body.media[idx].direction = 'inactive';
//         }
//       }

//       return Parser.writeSDP(body);
//     }
//   });
// };

// /**
//  * Unhold
//  */
// RTCSession.prototype.unhold = function() {

//   if (this.status !== C.STATUS_WAITING_FOR_ACK && this.status !== C.STATUS_CONFIRMED) {
//     throw new Exceptions.InvalidStateError(this.status);
//   }

//   if (!this.audioMuted) {
//     this.toogleMuteAudio(false);
//   }

//   if (!this.videoMuted) {
//     this.toogleMuteVideo(false);
//   }

//   if (!this.isReadyToReinvite()) {
//     /* If there is a pending 'hold' action, cancel it and don't queue this one
//      * Else, if there isn't any 'unhold' action, add this one to the queue
//      * Else, if there is already an 'unhold' action, skip
//      */
//     if (this.pending_actions.isPending('hold')) {
//       this.pending_actions.pop('hold');
//       return;
//     } else if (!this.pending_actions.isPending('unhold')) {
//       this.pending_actions.push('unhold');
//       return;
//     } else {
//       return;
//     }
//   } else {
//     if (this.local_hold === false) {
//       return;
//     }
//   }

//   this.onunhold('local');

//   this.sendReinvite();
// };


/**
 * Session Timers
 */


/**
 * RFC3261 13.3.1.4
 * Response retransmissions cannot be accomplished by transaction layer
 *  since it is destroyed when receiving the first 2xx answer
 */
RTCSession.prototype.setInvite2xxTimer = function(request, body) {
  var
    self = this,
    timeout = Timers.T1;

  this.timers.invite2xxTimer = setTimeout(function invite2xxRetransmission() {
    if (self.status !== C.STATUS_WAITING_FOR_ACK) {
      return;
    }

    request.reply(200, null, ['Contact: ' + self.contact], body);

    if (timeout < Timers.T2) {
      timeout = timeout * 2;
      if (timeout > Timers.T2) {
        timeout = Timers.T2;
      }
    }
    self.timers.invite2xxTimer = setTimeout(
      invite2xxRetransmission, timeout
    );
  }, timeout);
};


/**
 * RFC3261 14.2
 * If a UAS generates a 2xx response and never receives an ACK,
 *  it SHOULD generate a BYE to terminate the dialog.
 */
RTCSession.prototype.setACKTimer = function() {
  var self = this;

  this.timers.ackTimer = setTimeout(function() {
    if (self.status === C.STATUS_WAITING_FOR_ACK) {
      self.logger.debug('no ACK received, terminating the call');
      clearTimeout(self.timers.invite2xxTimer);
      self.sendBye();
      // self.sendRequest(ExSIP_C.BYE);
      self.ended('remote', null, ExSIP_C.causes.NO_ACK);
    }
  }, Timers.TIMER_H);
};


/**
 * RTCPeerconnection handlers
 */
// Modified to support Firefox 22
RTCSession.prototype.getLocalStreams = function() {
  try {
    if (this.rtcMediaHandler.peerConnection.localStreams) {
      return this.rtcMediaHandler &&
        this.rtcMediaHandler.peerConnection &&
        this.rtcMediaHandler.peerConnection.localStreams || [];
    } else {
      return this.rtcMediaHandler &&
        this.rtcMediaHandler.peerConnection &&
        this.rtcMediaHandler.peerConnection.getLocalStreams() || [];
    }
  } catch (ex) {
    return [];
  }
};

RTCSession.prototype.getRemoteStreams = function() {
  try {
    if (this.rtcMediaHandler.peerConnection.remoteStreams) {
      return this.rtcMediaHandler &&
        this.rtcMediaHandler.peerConnection &&
        this.rtcMediaHandler.peerConnection.remoteStreams || [];
    } else {
      return this.rtcMediaHandler &&
        this.rtcMediaHandler.peerConnection &&
        this.rtcMediaHandler.peerConnection.getRemoteStreams() || [];
    }
  } catch (ex) {
    return [];
  }
};

RTCSession.prototype.initRtcMediaHandler = function(options) {
  options = options || {};
  var constraints = options.RTCConstraints || this.ua.rtcConstraints() || {
    "optional": [{
      'DtlsSrtpKeyAgreement': 'true'
    }]
  };
  this.rtcMediaHandler = new RTCSession_RTCMediaHandler(this, {
    constraints: constraints,
    stun_servers: options.stun_servers,
    turn_servers: options.turn_servers
  });
};
/**
 * Session Management
 */

RTCSession.prototype.init_incoming = function(request) {
  var expires,
    self = this,
    contentType = request.getHeader('Content-Type'),

    waitForAnswer = function() {
      self.setStatus(C.STATUS_WAITING_FOR_ANSWER);

      // Set userNoAnswerTimer
      self.timers.userNoAnswerTimer = setTimeout(function() {
        request.reply(408);
        self.failed('local', null, ExSIP_C.causes.NO_ANSWER);
      }, self.ua.configuration.no_answer_timeout);

      /* Set expiresTimer
       * RFC3261 13.3.1
       */
      if (expires) {
        self.timers.expiresTimer = setTimeout(function() {
          if (self.status === C.STATUS_WAITING_FOR_ANSWER) {
            request.reply(487);
            self.failed('system', null, ExSIP_C.causes.EXPIRES);
          }
        }, expires);
      }

      // Fire 'newRTCSession' event.
      self.newRTCSession('remote', request);

      // Reply 180.
      request.reply(180, null, ['Contact: ' + self.contact]);

      // Fire 'progress' event.
      // TODO: Document that 'response' field in 'progress' event is null for
      // incoming calls.
      self.progress('local', null);
    };

  // Check body and content type
  if (request.body && (contentType !== 'application/sdp')) {
    request.reply(415);
    return;
  }

  // Session parameter initialization
  this.setStatus(C.STATUS_INVITE_RECEIVED);
  this.from_tag = request.from_tag;
  this.id = request.call_id + this.from_tag;
  this.request = request;
  this.contact = this.ua.contact.toString();

  this.logger = this.ua.getLogger('rtcsession', this.id);

  //Save the session into the ua sessions collection.
  this.ua.sessions[this.id] = this;

  //Get the Expires header value if exists
  if (request.hasHeader('expires')) {
    expires = request.getHeader('expires') * 1000;
  }

  /* Set the to_tag before
   * replying a response code that will create a dialog.
   */
  request.to_tag = Utils.newTag();

  // An error on dialog creation will fire 'failed' event
  if (!this.createDialog(request, 'UAS', true)) {
    request.reply(500, 'Missing Contact header field');
    return;
  }

  //Initialize Media Session
  this.initRtcMediaHandler();

  if (request.body) {
    this.rtcMediaHandler.onMessage(
      'offer',
      request.body,
      /*
       * onSuccess
       * SDP Offer is valid. Fire UA newRTCSession
       */
      waitForAnswer,
      /*
       * onFailure
       * Bad media description
       */
      function(e) {
        self.logger.warn('invalid SDP');
        self.logger.warn(e);
        request.reply(488);
      }
    );
  } else {
    this.late_sdp = true;
    waitForAnswer();
  }
};

RTCSession.prototype.connect = function(target, options) {
  var self = this;
  options = options || {};

  this.data = options.data || {};

  this.initRtcMediaHandler(options);

  this.connectLocalMedia(target, options, function() {
    self.sendInviteRequest(target, options);
  }, function() {

  });
};

RTCSession.prototype.close = function() {
  var idx;

  if (this.status === C.STATUS_TERMINATED) {
    return;
  }

  this.logger.debug('closing INVITE session ' + this.id);

  // 1st Step. Terminate media.
  if (this.rtcMediaHandler) {
    this.rtcMediaHandler.close();
  }

  // 2nd Step. Terminate signaling.

  // Clear session timers
  for (idx in this.timers) {
    clearTimeout(this.timers[idx]);
  }

  // Terminate dialogs

  // Terminate confirmed dialog
  if (this.dialog) {
    this.dialog.terminate();
    delete this.dialog;
  }

  // Terminate early dialogs
  for (idx in this.earlyDialogs) {
    this.earlyDialogs[idx].terminate();
    delete this.earlyDialogs[idx];
  }

  this.setStatus(C.STATUS_TERMINATED);

  delete this.ua.sessions[this.id];
};

/**
 * Dialog Management
 * @private
 */
RTCSession.prototype.createDialog = function(message, type, early) {
  var dialog, early_dialog,
    local_tag = (type === 'UAS') ? message.to_tag : message.from_tag,
    remote_tag = (type === 'UAS') ? message.from_tag : message.to_tag,
    id = message.call_id + local_tag + remote_tag;

  early_dialog = this.earlyDialogs[id];

  // Early Dialog
  if (early) {
    if (early_dialog) {
      return true;
    } else {
      early_dialog = new Dialog(this, message, type, Dialog.C.STATUS_EARLY);

      // Dialog has been successfully created.
      if (early_dialog.id) {
        this.earlyDialogs[id] = early_dialog;
        return true;
      }
      // Dialog not created due to an error.
      else {
        this.failed('remote', message, ExSIP_C.causes.INTERNAL_ERROR);
        return false;
      }
    }
  }

  // Confirmed Dialog
  else {
    // In case the dialog is in _early_ state, update it
    if (early_dialog) {
      early_dialog.update(message, type);
      this.dialog = early_dialog;
      delete this.earlyDialogs[id];
      return true;
    }

    // Otherwise, create a _confirmed_ dialog
    dialog = new Dialog(this, message, type);

    if (dialog.id) {
      this.to_tag = message.to_tag;
      this.dialog = dialog;
      return true;
    }
    // Dialog not created due to an error
    else {
      this.failed('remote', message, ExSIP_C.causes.INTERNAL_ERROR);
      return false;
    }
  }
};

RTCSession.prototype.connectRtcMediaHandler = function(stream, creationSucceeded, creationFailed, options) {
  this.rtcMediaHandler.connect(stream, creationSucceeded, creationFailed, options);
  this.dtmf.enableDtmfSender(stream, this.rtcMediaHandler.peerConnection);
};

RTCSession.prototype.sendData = function(data) {
  this.rtcMediaHandler.sendData(data);
};

/**
 * Get User Media
 * @private
 */
RTCSession.prototype.getUserMedia = function(constraints, creationSucceeded, creationFailed, options) {
  var self = this;

  var userMediaSucceeded = function(stream) {
    self.ua.localMedia = stream;
    self.connectRtcMediaHandler(stream, creationSucceeded, creationFailed, options);
    //      self.reconnectRtcMediaHandler(creationSucceeded, creationFailed, {localMedia: stream});
  };

  var userMediaFailed = function() {
    if (self.status === C.STATUS_TERMINATED) {
      return;
    }
    self.failed('local', null, ExSIP_C.causes.USER_DENIED_MEDIA_ACCESS);
  };


  if (this.ua.reuseLocalMedia() && this.ua.localMedia) {
    this.rtcMediaHandler.localMedia = this.ua.localMedia;
    userMediaSucceeded(this.ua.localMedia);
  } else {
    this.rtcMediaHandler.getUserMedia(
      userMediaSucceeded,
      userMediaFailed,
      constraints
    );
  }
};

RTCSession.prototype.sendInviteRequest = function(target, options, inviteSuccessCallback, inviteFailureCallback) {
  options = options || {};
  options.status = C.STATUS_INVITE_SENT;
  options.sdp = this.rtcMediaHandler.peerConnection.localDescription.sdp;
  options.target = target;
  this.sendRequest(ExSIP_C.INVITE, options, {
    success: inviteSuccessCallback,
    failure: inviteFailureCallback
  });
};
/**
 * Initial Request Sender
 * @private
 */
RTCSession.prototype.createOutgoingRequestSender = function(target, method, options) {
  options = options || {};

  var event, requestParams, iceServers,
    originalTarget = target,
    eventHandlers = options.eventHandlers || {},
    extraHeaders = options.extraHeaders && options.extraHeaders.slice() || [],
    stun_servers = options.stun_servers || null,
    turn_servers = options.turn_servers || null;


  if (stun_servers) {
    iceServers = UA.configuration_check.optional.stun_servers(stun_servers);
    if (!iceServers) {
      throw new TypeError('Invalid stun_servers: ' + stun_servers);
    } else {
      stun_servers = iceServers;
    }
  }

  if (turn_servers) {
    iceServers = UA.configuration_check.optional.turn_servers(turn_servers);
    if (!iceServers) {
      throw new TypeError('Invalid turn_servers: ' + turn_servers);
    } else {
      turn_servers = iceServers;
    }
  }

  if (target === undefined) {
    throw new TypeError('Not enough arguments');
  }

  // Check WebRTC support
  if (!WebRTC.isSupported) {
    throw new Exceptions.NotSupportedError('WebRTC not supported');
  }

  // Check target validity
  target = this.ua.normalizeTarget(target);
  if (!target) {
    throw new TypeError('Invalid target: ' + originalTarget);
  }

  // Check Session Status
  if (this.status !== C.STATUS_NULL) {
    throw new Exceptions.InvalidStateError(this.status);
  }

  // Set event handlers
  for (event in eventHandlers) {
    this.on(event, eventHandlers[event]);
  }

  // Session parameter initialization
  this.from_tag = Utils.newTag();

  // Set anonymous property
  this.anonymous = options.anonymous || false;

  // OutgoingSession specific parameters
  this.isCanceled = false;

  requestParams = {
    from_tag: this.from_tag
  };

  this.contact = this.ua.contact.toString({
    anonymous: this.anonymous,
    outbound: true
  });

  if (this.anonymous) {
    requestParams.from_display_name = 'Anonymous';
    requestParams.from_uri = 'sip:anonymous@anonymous.invalid';

    extraHeaders.push('P-Preferred-Identity: ' + this.ua.configuration.uri.toString());
    extraHeaders.push('Privacy: id');
  }

  extraHeaders.push('Contact: ' + this.contact);
  extraHeaders.push('Allow: ' + Utils.getAllowedMethods(this.ua));

  this.request = new SIPMessage.OutgoingRequest(method, target, this.ua, requestParams, extraHeaders);

  this.id = this.request.call_id + this.from_tag;

  this.logger = this.ua.getLogger('rtcsession', this.id);

  //Save the session into the ua sessions collection.
  this.ua.sessions[this.id] = this;

  this.newRTCSession('local', this.request);

  return new RequestSender(this, this.ua);

};

RTCSession.prototype.sendReferRequest = function(sessionToTransfer, options) {
  this.sessionToTransfer = sessionToTransfer;
  options = options || {};
  options.status = C.STATUS_REFER_SENT;
  options.target = sessionToTransfer.dialog.remote_target;
  this.sendRequest(ExSIP_C.REFER, options);
};

RTCSession.prototype.sendNotifyRequest = function(options, successCallback, failureCallback) {
  options = options || {};
  var extraHeaders = ['Content-Type: message/sipfrag',
    'Subscription-State: ' + (options.subscriptionState || "active;expires=60"),
    'Event: refer'
  ];
  options = Utils.merge_options({
    extraHeaders: extraHeaders
  }, options);
  this.sendRequest(ExSIP_C.NOTIFY, options, {
    success: successCallback,
    failure: failureCallback
  });
};

RTCSession.prototype.isStarted = function() {
  return this.start_time !== null;
};

RTCSession.prototype.isHeld = function() {
  return this.isOnHold;
};

RTCSession.prototype.iceConnected = function(originator, message) {
  var session = this,
    event_name = 'iceconnected';

  session.emit(event_name, session, {
    originator: originator,
    response: message || null
  });
};

RTCSession.prototype.iceCompleted = function(originator, message) {
  var session = this,
    event_name = 'icecompleted';

  session.emit(event_name, session, {
    originator: originator,
    response: message || null
  });
};

RTCSession.prototype.iceClosed = function(originator, message) {
  var session = this,
    event_name = 'iceclosed';

  session.emit(event_name, session, {
    originator: originator,
    response: message || null
  });
};

RTCSession.prototype.held = function() {
  this.isOnHold = true;
  this.emit('held', this);
};

RTCSession.prototype.resumed = function() {
  this.isOnHold = false;
  this.emit('resumed', this);
};

RTCSession.prototype.hold = function(inviteSuccessCallback, inviteFailureCallback) {
  var self = this;
  this.changeSession({
      audioMode: ExSIP_C.INACTIVE,
      audioPort: "0",
      videoMode: ExSIP_C.INACTIVE,
      videoPort: "0"
    }, function() {
      self.held();
      if (inviteSuccessCallback) {
        inviteSuccessCallback();
      }
    },
    inviteFailureCallback);
};

RTCSession.prototype.unhold = function(inviteSuccessCallback, inviteFailureCallback) {
  var self = this;
  this.changeSession({
      audioMode: ExSIP_C.SENDRECV,
      videoMode: ExSIP_C.SENDRECV
    }, function() {
      self.resumed();
      if (inviteSuccessCallback) {
        inviteSuccessCallback();
      }
    },
    inviteFailureCallback);
};

RTCSession.prototype.changeSession = function(sdpOptions, inviteSuccessCallback, inviteFailureCallback) {
  var self = this;
  this.logger.debug('changeSession : ' + JSON.stringify(sdpOptions));
  this.reconnectRtcMediaHandler(function() {
    self.logger.debug('changeSession : reconnectRtcMediaHandler : success');
    self.receiveResponse = self.receiveReinviteResponse;
    self.reinviteSucceeded = inviteSuccessCallback;
    self.reinviteFailed = inviteFailureCallback;
    self.sendInviteRequest(undefined, undefined);
  }, function() {
    self.logger.error("Could not change local mode");
  }, sdpOptions);
};

/**
 * Reception of Response for Initial INVITE
 */
RTCSession.prototype.receiveInviteResponse = function(response) {
  var cause, dialog,
    session = this;

  // Handle 2XX retransmissions and responses from forked requests
  if (this.dialog && (response.status_code >= 200 && response.status_code <= 299)) {

    /*
     * If it is a retransmission from the endpoint that established
     * the dialog, send an ACK
     */
    if (this.dialog.id.call_id === response.call_id &&
      this.dialog.id.local_tag === response.from_tag &&
      this.dialog.id.remote_tag === response.to_tag) {
      this.sendRequest(ExSIP_C.ACK);
      return;
    }

    // If not, send an ACK  and terminate
    else {
      dialog = new Dialog(this, response, 'UAC');

      if (dialog.error !== undefined) {
        this.logger.error(dialog.error);
        return;
      }

      dialog.sendRequest({
        owner: {
          status: C.STATUS_TERMINATED
        },
        onRequestTimeout: function() {},
        onTransportError: function() {},
        onDialogError: function() {},
        receiveResponse: function() {}
      }, ExSIP_C.ACK);

      dialog.sendRequest({
        owner: {
          status: C.STATUS_TERMINATED
        },
        onRequestTimeout: function() {},
        onTransportError: function() {},
        onDialogError: function() {},
        receiveResponse: function() {}
      }, ExSIP_C.BYE);
      return;
    }

  }

  // Proceed to cancellation if the user requested.
  if (this.isCanceled) {
    // Remove the flag. We are done.
    this.isCanceled = false;

    if (response.status_code >= 100 && response.status_code < 200) {
      this.request.cancel(this.cancelReason);
    } else if (response.status_code >= 200 && response.status_code < 299) {
      this.acceptAndTerminate(response);
    }
    return;
  }

  if (this.status !== C.STATUS_INVITE_SENT && this.status !== C.STATUS_1XX_RECEIVED) {
    return;
  }

  switch (true) {
    case /^100$/.test(response.status_code):
      this.received_100 = true;
      break;
    case /^1[0-9]{2}$/.test(response.status_code):
      this.received_100 = true;
      if (this.status !== C.STATUS_INVITE_SENT && this.status !== C.STATUS_1XX_RECEIVED) {
        break;
      }

      // Do nothing with 1xx responses without To tag.
      if (!response.to_tag) {
        this.logger.warn('1xx response received without to tag');
        break;
      }

      // Create Early Dialog if 1XX comes with contact
      if (response.hasHeader('contact')) {
        // An error on dialog creation will fire 'failed' event
        if (!this.createDialog(response, 'UAC', true)) {
          break;
        }
      }

      this.setStatus(C.STATUS_1XX_RECEIVED);
      this.progress('remote', response);

      if (!response.body) {
        break;
      }

      this.rtcMediaHandler.onMessage(
        'pranswer',
        response.body,
        /*
         * OnSuccess.
         * SDP Answer fits with Offer.
         */
        function() {},
        /*
         * OnFailure.
         * SDP Answer does not fit with Offer.
         */
        function(e) {
          session.logger.warn(e);
          session.earlyDialogs[response.call_id + response.from_tag + response.to_tag].terminate();
        }
      );
      break;
    case /^2[0-9]{2}$/.test(response.status_code):
      this.setStatus(C.STATUS_CONFIRMED);

      if (!response.body) {
        this.acceptAndTerminate(response, 400, ExSIP_C.causes.MISSING_SDP);
        this.failed('remote', response, ExSIP_C.causes.BAD_MEDIA_DESCRIPTION);
        break;
      }

      // An error on dialog creation will fire 'failed' event
      if (!this.createDialog(response, 'UAC')) {
        break;
      }

      this.rtcMediaHandler.onMessage(
        'answer',
        response.body,
        /*
         * onSuccess
         * SDP Answer fits with Offer. Media will start
         */
        function() {
          session.accepted('remote', response);
          session.started('remote', response);
          session.sendRequest(ExSIP_C.ACK);
          session.confirmed('local', null);
        },
        /*
         * onFailure
         * SDP Answer does not fit the Offer. Accept the call and Terminate.
         */
        function(e) {
          session.logger.warn(e);
          session.acceptAndTerminate(response, 488, 'Not Acceptable Here');
          session.failed('remote', response, ExSIP_C.causes.BAD_MEDIA_DESCRIPTION);
        }
      );
      break;
    default:
      cause = Utils.sipErrorCause(response.status_code);
      this.failed('remote', response, cause);
  }
};

/**
 * Dialog Management
 */
RTCSession.prototype.createDialog = function(message, type, early) {
  var dialog, early_dialog,
    local_tag = (type === 'UAS') ? message.to_tag : message.from_tag,
    remote_tag = (type === 'UAS') ? message.from_tag : message.to_tag,
    id = message.call_id + local_tag + remote_tag;

  early_dialog = this.earlyDialogs[id];

  // Early Dialog
  if (early) {
    if (early_dialog) {
      return true;
    } else {
      early_dialog = new Dialog(this, message, type, Dialog.C.STATUS_EARLY);

      // Dialog has been successfully created.
      if (early_dialog.error) {
        this.logger.error(dialog.error);
        this.failed('remote', message, ExSIP_C.causes.INTERNAL_ERROR);
        return false;
      } else {
        this.earlyDialogs[id] = early_dialog;
        return true;
      }
    }
  }

  // Confirmed Dialog
  else {
    // In case the dialog is in _early_ state, update it
    if (early_dialog) {
      early_dialog.update(message, type);
      this.dialog = early_dialog;
      delete this.earlyDialogs[id];
      return true;
    }

    // Otherwise, create a _confirmed_ dialog
    dialog = new Dialog(this, message, type);

    if (dialog.error) {
      this.logger.error(dialog.error);
      this.failed('remote', message, ExSIP_C.causes.INTERNAL_ERROR);
      return false;
    } else {
      this.to_tag = message.to_tag;
      this.dialog = dialog;
      return true;
    }
  }
};

/**
 * In dialog INVITE Reception
 */

RTCSession.prototype.receiveReinvite = function(request) {
  var
    sdp, idx, direction,
    self = this,
    contentType = request.getHeader('Content-Type'),
    hold = false,

    createSdp = function(onSuccess, onFailure) {
      if (self.late_sdp) {
        self.rtcMediaHandler.createOffer(onSuccess, onFailure);
      } else {
        self.rtcMediaHandler.createAnswer(onSuccess, onFailure);
      }
    },

    answer = function() {
      createSdp(
        // onSuccess
        function(body) {
          request.reply(200, null, ['Contact: ' + self.contact], body,
            function() {
              self.setStatus(C.STATUS_WAITING_FOR_ACK);
              self.setInvite2xxTimer(request, body);
              self.setACKTimer();

              if (self.remote_hold === true && hold === false) {
                self.onunhold('remote');
              } else if (self.remote_hold === false && hold === true) {
                self.onhold('remote');
              }
            }
          );
        },
        // onFailure
        function() {
          request.reply(500);
        }
      );
    };


  if (request.body) {
    if (contentType !== 'application/sdp') {
      this.logger.warn('invalid Content-Type');
      request.reply(415);
      return;
    }

    sdp = Parser.parseSDP(request.body);

    for (idx = 0; idx < sdp.media.length; idx++) {
      direction = sdp.direction || sdp.media[idx].direction || 'sendrecv';

      if (direction === 'sendonly' || direction === 'inactive') {
        hold = true;
      }
    }

    this.rtcMediaHandler.onMessage(
      'offer',
      request.body,
      /*
       * onSuccess
       * SDP Offer is valid
       */
      answer,
      /*
       * onFailure
       * Bad media description
       */
      function(e) {
        self.logger.error(e);
        request.reply(488);
      }
    );
  } else {
    this.late_sdp = true;
    answer();
  }
};

/**
 * In dialog UPDATE Reception
 */

RTCSession.prototype.receiveUpdate = function(request) {
  var
    sdp, idx, direction,
    self = this,
    contentType = request.getHeader('Content-Type'),
    hold = true;

  if (!request.body) {
    request.reply(200);
    return;
  }

  if (contentType !== 'application/sdp') {
    this.logger.warn('invalid Content-Type');
    request.reply(415);
    return;
  }

  sdp = Parser.parseSDP(request.body);

  for (idx = 0; idx < sdp.media.length; idx++) {
    direction = sdp.direction || sdp.media[idx].direction || 'sendrecv';

    if (direction !== 'sendonly' && direction !== 'inactive') {
      hold = false;
    }
  }

  this.rtcMediaHandler.onMessage(
    'offer',
    request.body,
    /*
     * onSuccess
     * SDP Offer is valid
     */
    function() {
      self.rtcMediaHandler.createAnswer(
        function(body) {
          request.reply(200, null, ['Contact: ' + self.contact], body,
            function() {
              if (self.remote_hold === true && hold === false) {
                self.onunhold('remote');
              } else if (self.remote_hold === false && hold === true) {
                self.onhold('remote');
              }
            }
          );
        },
        function() {
          request.reply(500);
        }
      );
    },
    /*
     * onFailure
     * Bad media description
     */
    function(e) {
      self.logger.error(e);
      request.reply(488);
    }
  );
};

/**
 * In dialog Request Reception
 */
RTCSession.prototype.receiveRequest = function(request) {
  var contentType,
    self = this;

  if (request.method === ExSIP_C.CANCEL) {
    /* RFC3261 15 States that a UAS may have accepted an invitation while a CANCEL
     * was in progress and that the UAC MAY continue with the session established by
     * any 2xx response, or MAY terminate with BYE. ExSIP does continue with the
     * established session. So the CANCEL is processed only if the session is not yet
     * established.
     */

    /*
     * Terminate the whole session in case the user didn't accept (or yet send the answer)
     * nor reject the request opening the session.
     */
    if (this.status === C.STATUS_WAITING_FOR_ANSWER || this.status === C.STATUS_ANSWERED) {
      this.setStatus(C.STATUS_CANCELED);
      this.request.reply(487);
      this.failed('remote', request, ExSIP_C.causes.CANCELED);
    }
  } else {
    // Requests arriving here are in-dialog requests.
    switch (request.method) {
      case ExSIP_C.ACK:
        if (this.status === C.STATUS_WAITING_FOR_ACK) {
          clearTimeout(this.timers.ackTimer);
          clearTimeout(this.timers.invite2xxTimer);
          this.setStatus(C.STATUS_CONFIRMED);
          if (request.body.length > 0) {
            this.logger.log('set remoteDescription for late offer ACK');
            this.rtcMediaHandler.onMessage(self.rtcMediaHandler.getSetRemoteLocationType(), request.body, function() {
              self.logger.log('late offer remoteDescription success');
              self.started('local', undefined, true);
            }, function() {
              self.logger.log('late offer remoteDescription failure');
            });
          }
        }
        break;
      case ExSIP_C.BYE:
        if (this.status === C.STATUS_CONFIRMED || this.status === C.STATUS_REFER_SENT) {
          request.reply(200);
          this.ended('remote', request, ExSIP_C.causes.BYE);
        } else if (this.status === C.STATUS_INVITE_RECEIVED) {
          request.reply(200);
          this.request.reply(487, 'BYE Received');
          this.ended('remote', request, ExSIP_C.causes.BYE);
        } else {
          request.reply(403, 'Wrong Status');
        }
        break;
      case ExSIP_C.INVITE:
        if (this.status === C.STATUS_CONFIRMED) {
          this.logger.debug('re-INVITE received');
          this.request = request;
          // accept empty reinvites
          if (!request.body || request.body.length === 0) {
            this.acceptReInvite();
            return;
          }

          var description = new WebRTC.RTCSessionDescription({
            type: "offer",
            sdp: request.body
          });
          var oldDescription = this.rtcMediaHandler.peerConnection.remoteDescription;
          var audioAdd = description.hasActiveAudio() && (!oldDescription || !oldDescription.hasActiveAudio());
          var videoAdd = description.hasActiveVideo() && (!oldDescription || !oldDescription.hasActiveVideo());
          if (audioAdd || videoAdd) {
            this.ua.emit("onReInvite", this.ua, {
              session: this,
              request: request,
              audioAdd: audioAdd,
              videoAdd: videoAdd
            });
          } else {
            this.acceptReInvite();
          }
        } else {
          request.reply(403, 'Wrong Status');
        }
        break;
      case ExSIP_C.INFO:
        if (this.status === C.STATUS_CONFIRMED || this.status === C.STATUS_WAITING_FOR_ACK || this.status === C.STATUS_INVITE_RECEIVED || this.status === C.STATUS_ANSWERED) {
          contentType = request.getHeader('content-type');
          if (contentType && (contentType.match(/^application\/dtmf-relay/i))) {
            new RTCSession_DTMF(this).init_incoming(request);
          } else if (contentType && (contentType.match(/^application\/media_control\+xml/i))) {
            request.reply(200);
            this.started('local', undefined, true);
          } else {
            request.reply(415);
          }
        } else {
          this.logger.debug('Wrong Status : ' + this.status);
          request.reply(403, 'Wrong Status');
        }
        break;
      case ExSIP_C.UPDATE:
        if (this.status === C.STATUS_CONFIRMED) {
          this.logger.debug('UPDATE received');
          this.receiveUpdate(request);
        } else {
          request.reply(403, 'Wrong Status');
        }
        break;
      case ExSIP_C.REFER:
        if (this.status === C.STATUS_CONFIRMED) {
          this.ua.processRefer(this, request);
        }
        break;
      case ExSIP_C.NOTIFY:
        if (this.status === C.STATUS_REFER_SENT) {
          request.reply(200);
          this.logger.log('received NOTIFY with body : ' + request.body);
          var status = parseInt(request.body.match(/SIP\/2.0\s(.*)\s/)[1], 10);
          this.logger.log('NOTIFY status : ' + status);

          if (!this.sessionToTransfer) {
            this.logger.warn('no transferred session for REFER session : ' + this.id);
            return;
          }

          if (status >= 200 && status <= 299) {
            this.logger.log('terminate transferred session : ' + this.sessionToTransfer.id);
            this.sessionToTransfer.terminate();
          } else if (status >= 400 && status <= 699) {
            this.logger.warn('resuming session : ' + this.sessionToTransfer.id);
            this.sessionToTransfer.unhold(function() {
              self.logger.log('resumed session : ' + self.sessionToTransfer.id);
            });
          }
        }
        break;
      default:
        request.reply(501);
    }
  }
};


RTCSession.prototype.setStatus = function(status) {
  if (this.logger) {
    this.logger.debug('setStatus : ' + Object.keys(C)[status]);
  }
  this.status = status;
};

RTCSession.prototype.supports = function(name) {
  var supported = this.request.getHeader("Supported");
  return supported !== undefined && supported.indexOf(name) !== -1;
};

/**
 * @private
 */
RTCSession.prototype.sendACK = function() {
  this.sendRequest(ExSIP_C.ACK);
};

/**
 * @private
 */
RTCSession.prototype.sendBye = function(options) {
  var self = this;
  options = options || {};
  options.extraHeaders = options.extraHeaders || [];

  var reason,
    status_code = options.status_code,
    reason_phrase = options.reason_phrase || ExSIP_C.REASON_PHRASE[status_code] || '',
    body = options.body;

  if (status_code && (status_code < 200 || status_code >= 700)) {
    throw new TypeError('Invalid status_code: ' + status_code);
  } else if (status_code) {
    reason = 'SIP ;cause=' + status_code + '; text="' + reason_phrase + '"';
    options.extraHeaders.push('Reason: ' + reason);
  }

  options.sdp = body;
  options.status = C.STATUS_BYE_SENT;
  var callbacks = {
    success: function() {
      self.sendACK();
      self.ended('local', null, ExSIP_C.causes.BYE);
    }
  };
  this.logger.log('sendBye : ' + callbacks);
  this.sendRequest(ExSIP_C.BYE, options, callbacks);
};


/**
 * @private
 */
RTCSession.prototype.sendRequest = function(method, options, requestCallbacks) {
  var request_sender;
  options = options || {};
  if (this.dialog) {
    this.logger.debug('sendRequest : dialog : ' + method);
    request_sender = this.dialog.createRequestSender(this, method, options);
  } else {
    this.logger.debug('sendRequest : createOutgoingRequestSender : ' + method + ', ' + JSON.stringify(options));
    request_sender = this.createOutgoingRequestSender(options.target, method, options);
  }

  if (!request_sender) {
    return;
  }

  if (options.status) {
    this.setStatus(options.status);
  }
  request_sender.request.body = options.sdp;

  var hasSdp = request_sender.request.body && request_sender.request.body.length > 0;
  if (!Utils.containsHeader(request_sender.request.extraHeaders, "Content-Type") && hasSdp) {
    request_sender.request.extraHeaders.push('Content-Type: application/sdp');
  }
  this.logger.debug('request_sender.request.extraHeaders : ' + Utils.toString(request_sender.request.extraHeaders));

  request_sender.send(requestCallbacks);
};

/**
 * Session 1009s
 */

/**
 * Callback to be called from UA instance when TransportError occurs
 * @private
 */
RTCSession.prototype.onTransportError = function() {
  if (this.status !== C.STATUS_TERMINATED) {
    if (this.status === C.STATUS_CONFIRMED) {
      this.ended('system', null, ExSIP_C.causes.CONNECTION_ERROR);
    } else {
      this.failed('system', null, ExSIP_C.causes.CONNECTION_ERROR);
    }
  }
};

/**
 * Initial Request Sender
 */
RTCSession.prototype.connectLocalMedia = function(target, options, success, failure) {
  var
    self = this;

  // // User media succeeded
  // userMediaSucceeded = function(stream) {
  //   self.rtcMediaHandler.addStream(
  //     stream,
  //     streamAdditionSucceeded,
  //     streamAdditionFailed
  //   );
  // },

  // // User media failed
  // userMediaFailed = function() {
  //   if (self.status === C.STATUS_TERMINATED) {
  //     return;
  //   }

  //   self.failed('local', null, ExSIP_C.causes.USER_DENIED_MEDIA_ACCESS);
  // },

  // // rtcMediaHandler.addStream successfully added
  // streamAdditionSucceeded = function() {
  //   self.connecting(self.request);

  //   if (self.status === C.STATUS_TERMINATED) {
  //     return;
  //   }

  //   self.rtcMediaHandler.createOffer(
  //     offerCreationSucceeded,
  //     offerCreationFailed,
  //     RTCOfferConstraints
  //   );
  // },

  // // rtcMediaHandler.addStream failed
  // streamAdditionFailed = function() {
  //   if (self.status === C.STATUS_TERMINATED) {
  //     return;
  //   }

  //   self.failed('system', null, ExSIP_C.causes.WEBRTC_ERROR);
  // },

  // // rtcMediaHandler.createOffer succeeded
  // offerCreationSucceeded = function(offer) {
  //   if (self.isCanceled || self.status === C.STATUS_TERMINATED) {
  //     return;
  //   }

  //   self.request.body = offer;
  //   self.status = C.STATUS_INVITE_SENT;
  //   request_sender.send();
  // },

  // // rtcMediaHandler.createOffer failed
  // offerCreationFailed = function() {
  //   if (self.status === C.STATUS_TERMINATED) {
  //     return;
  //   }

  //   self.failed('system', null, ExSIP_C.causes.WEBRTC_ERROR);
  // };

  this.receiveResponse = this.receiveInviteResponse;
  var mediaConstraints = options.mediaConstraints || {
    audio: true,
    video: true
  };

  this.getUserMedia(mediaConstraints, function() {
    self.logger.log('getUserMedia succeeded');
    success();
  }, function() {
    self.logger.log('getUserMedia failed');
    self.failed('local', null, ExSIP_C.causes.WEBRTC_ERROR);
    failure();
  }, options);

  // if (mediaStream) {
  //   userMediaSucceeded(mediaStream);
  // } else {
  //   this.getUserMedia(
  //     mediaConstraints,
  //     userMediaSucceeded,
  //     userMediaFailed
  //   );
  // }
};

/**
 * Send Re-INVITE
 */
RTCSession.prototype.sendReinvite = function(options) {
  options = options || {};

  var
    self = this,
    extraHeaders = options.extraHeaders || [],
    eventHandlers = options.eventHandlers || {},
    mangle = options.mangle || null;

  if (eventHandlers.succeeded) {
    this.reinviteSucceeded = eventHandlers.succeeded;
  } else {
    this.reinviteSucceeded = function() {};
  }
  if (eventHandlers.failed) {
    this.reinviteFailed = eventHandlers.failed;
  } else {
    this.reinviteFailed = function() {};
  }

  extraHeaders.push('Contact: ' + this.contact);
  extraHeaders.push('Content-Type: application/sdp');

  this.receiveResponse = this.receiveReinviteResponse;

  this.rtcMediaHandler.createOffer(
    function(body) {
      if (mangle) {
        body = mangle(body);
      }

      self.dialog.sendRequest(self, ExSIP_C.INVITE, {
        extraHeaders: extraHeaders,
        body: body
      });
    },
    function() {
      if (self.isReadyToReinvite()) {
        self.onReadyToReinvite();
      }
      self.reinviteFailed();
    }
  );
};


/**
 * Reception of Response for in-dialog INVITE
 */
RTCSession.prototype.receiveReinviteResponse = function(response) {
  var
    self = this,
    contentType = response.getHeader('Content-Type');

  if (this.status === C.STATUS_TERMINATED) {
    return;
  }

  switch (true) {
    case /^1[0-9]{2}$/.test(response.status_code):
      break;
    case /^2[0-9]{2}$/.test(response.status_code):
      if(this.status !== C.STATUS_CONFIRMED) {
        this.setStatus(C.STATUS_CONFIRMED);
        this.sendRequest(ExSIP_C.ACK);

        if (!response.body) {
          this.reinviteFailed();
          break;
        } else if (contentType !== 'application/sdp') {
          this.reinviteFailed();
          break;
        }

        this.rtcMediaHandler.onMessage(
          'answer',
          response.body,
          /*
           * onSuccess
           * SDP Answer fits with Offer.
           */
          function() {
            if (self.reinviteSucceeded) {
              self.reinviteSucceeded();
            }
          },
          /*
           * onFailure
           * SDP Answer does not fit the Offer.
           */
          function() {
            if (self.reinviteFailed) {
              self.reinviteFailed();
            }
          }
        );

      }
      break;
    default:
      if (this.reinviteFailed) {
        this.reinviteFailed();
      }
  }
};



RTCSession.prototype.acceptAndTerminate = function(response, status_code, reason_phrase) {
  var extraHeaders = [];

  if (status_code) {
    reason_phrase = reason_phrase || ExSIP_C.REASON_PHRASE[status_code] || '';
    extraHeaders.push('Reason: SIP ;cause=' + status_code + '; text="' + reason_phrase + '"');
  }

  // An error on dialog creation will fire 'failed' event
  if (this.dialog || this.createDialog(response, 'UAC')) {
    this.sendRequest(ExSIP_C.ACK);
    this.sendBye();
    // this.sendRequest(ExSIP_C.BYE, {
    //   extraHeaders: extraHeaders
    // });
  }

  // Update session status.
  this.setStatus(C.STATUS_TERMINATED);
};


RTCSession.prototype.toogleMuteAudio = function(mute) {
  var streamIdx, trackIdx, tracks,
    localStreams = this.getLocalStreams();

  for (streamIdx in localStreams) {
    tracks = localStreams[streamIdx].getAudioTracks();
    for (trackIdx in tracks) {
      tracks[trackIdx].enabled = !mute;
    }
  }
};

RTCSession.prototype.toogleMuteVideo = function(mute) {
  var streamIdx, trackIdx, tracks,
    localStreams = this.getLocalStreams();

  for (streamIdx in localStreams) {
    tracks = localStreams[streamIdx].getVideoTracks();
    for (trackIdx in tracks) {
      tracks[trackIdx].enabled = !mute;
    }
  }
};

/**
 * Session Callbacks
 */

RTCSession.prototype.onTransportError = function() {
  if (this.status !== C.STATUS_TERMINATED) {
    if (this.status === C.STATUS_CONFIRMED) {
      this.ended('system', null, ExSIP_C.causes.CONNECTION_ERROR);
    } else {
      this.failed('system', null, ExSIP_C.causes.CONNECTION_ERROR);
    }
  }
};

/**
 * Callback to be called from UA instance when RequestTimeout occurs
 * @private
 */
RTCSession.prototype.onRequestTimeout = function() {
  if (this.status !== C.STATUS_TERMINATED) {
    if (this.status === C.STATUS_CONFIRMED) {
      this.ended('system', null, ExSIP_C.causes.REQUEST_TIMEOUT);
    } else {
      this.ua.reconnect();
      this.failed('system', null, ExSIP_C.causes.CONNECTION_ERROR);
    }
  }
};

RTCSession.prototype.onDialogError = function(response) {
  if (this.status !== C.STATUS_TERMINATED) {
    if (this.status === C.STATUS_CONFIRMED) {
      this.ended('remote', response, ExSIP_C.causes.DIALOG_ERROR);
    } else {
      this.failed('remote', response, ExSIP_C.causes.DIALOG_ERROR);
    }
  }
};

/**
 * Internal Callbacks
 */

RTCSession.prototype.newRTCSession = function(originator, request) {
  var session = this,
    event_name = 'newRTCSession';

  if (originator === 'remote') {
    session.direction = 'incoming';
    session.local_identity = request.to;
    session.remote_identity = request.from;
  } else if (originator === 'local') {
    session.direction = 'outgoing';
    session.local_identity = request.from;
    session.remote_identity = request.to;
  }

  session.ua.emit(event_name, session.ua, {
    originator: originator,
    session: session,
    request: request
  });
};

RTCSession.prototype.connecting = function(request) {
  var session = this,
    event_name = 'connecting';

  session.emit(event_name, session, {
    request: request
  });
};

RTCSession.prototype.progress = function(originator, response) {
  var session = this,
    event_name = 'progress';

  session.emit(event_name, session, {
    originator: originator,
    response: response || null
  });
};

RTCSession.prototype.accepted = function(originator, message) {
  var session = this,
    event_name = 'accepted';

  session.start_time = new Date();

  session.emit(event_name, session, {
    originator: originator,
    response: message || null
  });
};

RTCSession.prototype.started = function(originator, message, isReconnect) {
  var session = this,
    event_name = 'started';

  session.start_time = new Date();

  session.emit(event_name, session, {
    originator: originator,
    response: message || null,
    isReconnect: isReconnect
  });
};

RTCSession.prototype.confirmed = function(originator, ack) {
  var session = this,
    event_name = 'confirmed';

  this.is_confirmed = true;

  session.emit(event_name, session, {
    originator: originator,
    ack: ack || null
  });
};

RTCSession.prototype.ended = function(originator, message, cause) {
  var session = this,
    event_name = 'ended';

  session.end_time = new Date();

  session.close();
  session.emit(event_name, session, {
    originator: originator,
    message: message || null,
    cause: cause
  });
};

RTCSession.prototype.failed = function(originator, message, cause) {
  var session = this,
    event_name = 'failed';

  session.close();
  session.emit(event_name, session, {
    originator: originator,
    message: message || null,
    cause: cause
  });
};

RTCSession.prototype.onhold = function(originator) {
  if (originator === 'local') {
    this.local_hold = true;
  } else {
    this.remote_hold = true;
  }

  this.emit('hold', this, {
    originator: originator
  });
};

RTCSession.prototype.onunhold = function(originator) {
  if (originator === 'local') {
    this.local_hold = false;
  } else {
    this.remote_hold = false;
  }

  this.emit('unhold', this, {
    originator: originator
  });
};

RTCSession.prototype.onmute = function(options) {
  this.emit('muted', this, {
    audio: options.audio,
    video: options.video
  });
};

RTCSession.prototype.onunmute = function(options) {
  this.emit('unmuted', this, {
    audio: options.audio,
    video: options.video
  });
};

RTCSession.prototype.onReadyToReinvite = function() {
  var action = (this.pending_actions.length() > 0) ? this.pending_actions.shift() : null;

  if (!action) {
    return;
  }

  if (action.name === 'hold') {
    this.hold();
  } else if (action.name === 'unhold') {
    this.unhold();
  }
};
},{"./Constants":7,"./Dialog":8,"./EventEmitter":11,"./Exceptions":13,"./Parser":19,"./RTCSession/DTMF":21,"./RTCSession/RTCMediaHandler":23,"./RequestSender":25,"./SIPMessage":26,"./Timers":27,"./UA":30,"./Utils":32,"./WebRTC":33}],21:[function(require,module,exports){
module.exports = DTMF;


var C = {
  MIN_DURATION:            70,
  MAX_DURATION:            6000,
  DEFAULT_DURATION:        100,
  MIN_INTER_TONE_GAP:      50,
  DEFAULT_INTER_TONE_GAP:  500
};

/**
 * Expose C object.
 */
DTMF.C = C;


/**
 * Dependencies.
 */
var EventEmitter = require('../EventEmitter');
var Exceptions = require('../Exceptions');
var RTCSession = require('../RTCSession');
var Utils = require('../Utils');


function DTMF(session) {
  var events = [
  'succeeded',
  'failed'
  ];

  this.sendTimeoutId = null;
  this.queuedDTMFs = [];
  this.session = session;
  this.direction = null;
  this.tone = null;
  this.duration = null;
  this.interToneGap = null;
  this.dtmfSender = null;

  this.logger = this.session.ua.getLogger('rtcsession.dtmf', session.id);

  this.initEvents(events);
}

DTMF.prototype = new EventEmitter();

DTMF.prototype.send = function(tone, options) {
  var event, eventHandlers, extraHeaders;

  if (tone === undefined) {
    throw new TypeError('Not enough arguments');
  }

  this.direction = 'outgoing';

  // Check RTCSession Status
  if (this.session.status !== RTCSession.C.STATUS_CONFIRMED && this.session.status !== RTCSession.C.STATUS_WAITING_FOR_ACK) {
    throw new Exceptions.InvalidStateError(this.session.status);
  }

  // Get DTMF options
  options = options || {};
  extraHeaders = options.extraHeaders ? options.extraHeaders.slice() : [];
  eventHandlers = options.eventHandlers || {};

  // Check tone type
  if (typeof tone === 'string' ) {
    tone = tone.toUpperCase();
  } else if (typeof tone === 'number') {
    tone = tone.toString();
  } else {
    throw new TypeError('Invalid tone: '+ tone);
  }

  // Check tone value
  if (!tone.match(/^[0-9A-D#*,]+$/i)) {
    throw new TypeError('Invalid tone: '+ tone);
  } else {
    this.tone = tone;
  }

  // Set event handlers
  for (event in eventHandlers) {
    this.on(event, eventHandlers[event]);
  }

  this.queueTone(this.tone, options.duration, options.interToneGap);
};

DTMF.prototype.processQueuedDTMFs = function() {
  var self = this;
  if(this.queuedDTMFs.length === 0) {
    return;
  }
  if(!this.dtmfSender.canInsertDTMF) {
    this.logger.log("DTMF Sender cannot insert DTMF - trying again after timeout", this.session.ua);
    this.sendTimeoutId = setTimeout(function(){
      self.processQueuedDTMFs();
    }, 1000);
    return;
  }
  var tones = "";
  var durationSum = 0;
  var interToneGapSum = 0;
  for(var i=0; i < this.queuedDTMFs.length; i++) {
    var dtmf = this.queuedDTMFs[i];
    tones += dtmf.tone;
    durationSum += dtmf.duration;
    interToneGapSum += dtmf.interToneGap;
  }
  var duration = durationSum / this.queuedDTMFs.length;
  var interToneGap = interToneGapSum / this.queuedDTMFs.length;

  this.logger.log("sending DTMF with tones "+tones+", duration "+duration+", gap "+interToneGap);
  this.dtmfSender.insertDTMF(tones, duration, interToneGap);
};

DTMF.prototype.queueTone = function(tone, duration, interToneGap) {
  this.logger.log("Queue tone : "+tone);
  clearTimeout(this.sendTimeoutId);
  this.queuedDTMFs.push({tone: tone, duration: duration, interToneGap: interToneGap});
  var self = this;
  this.sendTimeoutId = setTimeout(function(){
    self.processQueuedDTMFs();
  }, 2 * duration);
};

DTMF.prototype.onDTMFSent = function(tone) {
  if (!tone) {
    return;
  }

  this.logger.log("Sent Dtmf tone: " + tone.tone);
  for(var i=0; i < this.queuedDTMFs.length; i++) {
    var dtmf = this.queuedDTMFs[i];
    if(tone.tone === dtmf.tone) {
      this.queuedDTMFs.splice(i, 1);
      this.logger.log("removing from queued tones - remaining queue: \t" + Utils.toString(this.queuedDTMFs));
      break;
    } else if(dtmf.tone.indexOf(tone.tone) !== -1) {
      dtmf.tone = dtmf.tone.replace(tone.tone, '');
      this.queuedDTMFs[i] = dtmf;
      this.logger.log("removing from queued tones as contained - remaining queue: \t" + Utils.toString(this.queuedDTMFs));
      break;
    }
  }
  this.session.emit('newDTMF', this.session, {
    originator: 'local',
    dtmf: this,
    tone: tone.tone
  });
};

DTMF.prototype.enableDtmfSender = function(localstream, peerConnection) {
  var self = this;
  this.logger.debug('enableDtmfSender : '+localstream);
  if (localstream !== null) {
    var local_audio_track = localstream.getAudioTracks()[0];
    this.dtmfSender = peerConnection.createDTMFSender(local_audio_track);
    this.logger.log("Created DTMF Sender with canInsertDTMF : "+this.dtmfSender.canInsertDTMF);

    this.dtmfSender.ontonechange = function(tone) {
      self.onDTMFSent(tone);
    };

    this.processQueuedDTMFs();
  }
  else {
    this.logger.error("No Local Stream to create DTMF Sender");
  }
};

/**
* @private
*/
DTMF.prototype.receiveResponse = function(response) {
  var cause;

  switch(true) {
    case /^1[0-9]{2}$/.test(response.status_code):
      // Ignore provisional responses.
      break;

    case /^2[0-9]{2}$/.test(response.status_code):
      this.emit('succeeded', this, {
        originator: 'remote',
        response: response
      });
      break;

    default:
      cause = Utils.sipErrorCause(response.status_code);
      this.emit('failed', this, {
        originator: 'remote',
        response: response,
        cause: cause
      });
      break;
  }
};

/**
 * @private
 */
DTMF.prototype.onRequestTimeout = function() {
  this.emit('failed', this, {
    originator: 'system',
    cause: C.causes.REQUEST_TIMEOUT
  });
};

/**
 * @private
 */
DTMF.prototype.onTransportError = function() {
  this.emit('failed', this, {
    originator: 'system',
    cause: C.causes.CONNECTION_ERROR
  });
};

/**
 * @private
 */
DTMF.prototype.init_incoming = function(request) {
  var body,
    reg_tone = /^(Signal\s*?=\s*?)([0-9A-D#*]{1})(\s)?.*/,
    reg_duration = /^(Duration\s?=\s?)([0-9]{1,4})(\s)?.*/;

  this.direction = 'incoming';
  this.request = request;

  request.reply(200);

  if (request.body) {
    body = request.body.split('\r\n');
    if (body.length === 2) {
      if (reg_tone.test(body[0])) {
        this.tone = body[0].replace(reg_tone,"$2");
      }
      if (reg_duration.test(body[1])) {
        this.duration = parseInt(body[1].replace(reg_duration,"$2"), 10);
      }
    }
  }

  if (!this.tone || !this.duration) {
    this.logger.warn('invalid INFO DTMF received, discarded');
  } else {
    this.session.emit('newDTMF', this.session, {
      originator: 'remote',
      dtmf: this,
      request: request
    });
  }
};
},{"../EventEmitter":11,"../Exceptions":13,"../RTCSession":20,"../Utils":32}],22:[function(require,module,exports){
module.exports = DataChannel;

var EventEmitter = require('../EventEmitter');
/**
 * Dependencies.
 */
function DataChannel(session, peerConnection) {

  this.session = session;
  this.peerConnection = peerConnection;
  this.sendChannel = null;
  this.receiveChannel = null;
  this.chunkLength = 60000;
  this.dataReceived = [];

  this.logger = session.ua.getLogger('ExSIP.rtcsession.datachannel', session.id);

  this.initSendChannel();
}

DataChannel.prototype = new EventEmitter();

DataChannel.prototype.isDebug = function() {
  return this.session.ua.isDebug();
};

DataChannel.prototype.close = function() {
  if(this.sendChannel) {
    this.sendChannel.close();
  }
  if(this.receiveChannel) {
    this.receiveChannel.close();
  }
};

DataChannel.prototype.send = function(data) {
  this.sendInChunks(data);
  this.logger.log('Sent Data: ' + data, this.session.ua);
  this.session.emit('dataSent', this, { data: data });
};

DataChannel.prototype.sendInChunks = function(data) {
  var text = null, last = false, self = this;
  if (data.length > this.chunkLength) {
    text = data.slice(0, this.chunkLength); // getting chunk using predefined chunk length
  } else {
    text = data;
    last = true;
  }

  this.sendChannel.send(text + (last ? "\n" : "")); // use JSON.stringify for chrome!

  if (!last) {
    var remainingDataURL = data.slice(text.length);
    window.setTimeout(function () {
      self.sendInChunks(remainingDataURL); // continue transmitting
    }, 50);
  }
};

DataChannel.prototype.initSendChannel = function() {
  var self = this;
  try {
    // Data Channel api supported from Chrome M25.
    // You might need to start chrome with  --enable-data-channels flag.
    this.sendChannel = this.peerConnection.createDataChannel("sendDataChannel", null);
    this.logger.log('Created send data channel', this.session.ua);

    var onSendChannelStateChange = function() {
      var readyState = self.sendChannel.readyState;
      self.logger.log('Send channel state is: ' + readyState, self.session.ua);
    };

    this.sendChannel.onopen = onSendChannelStateChange;
    this.sendChannel.onclose = onSendChannelStateChange;

    var receiveChannelCallback = function(event) {
      self.logger.log('Receive Channel Callback', self.session.ua);
      self.receiveChannel = event.channel;

      var onReceiveChannelStateChange = function() {
        var readyState = self.receiveChannel.readyState;
        self.logger.log('Receive channel state is: ' + readyState, self.session.ua);
      };

      var onReceiveMessageCallback = function(event) {
        self.logger.log('Received Message : '+event.data, self.session.ua);

        if(event.data.indexOf('\n') !== -1) {
          self.dataReceived.push(event.data.replace('\n', ''));
          var data = self.dataReceived.join('');
          self.dataReceived = [];
          self.session.emit('dataReceived', self, { data: data });
        } else {
          self.dataReceived.push(event.data);
        }
      };

      self.receiveChannel.onmessage = onReceiveMessageCallback;
      self.receiveChannel.onopen = onReceiveChannelStateChange;
      self.receiveChannel.onclose = onReceiveChannelStateChange;
    };

    this.peerConnection.ondatachannel = receiveChannelCallback;
  } catch (e) {
    this.emit('failed', this, {
      cause: 'Failed to create data channel'
    });
    self.logger.error('Create Data channel failed with exception: ' + e.message);
  }
};
},{"../EventEmitter":11}],23:[function(require,module,exports){
module.exports = RTCMediaHandler;

/**
 * Dependencies.
 */
var ExSIP_C = require('../Constants');
var WebRTC = require('../WebRTC');
var Utils = require('../Utils');
var DataChannel = require('./DataChannel');


/* RTCMediaHandler
 * -class PeerConnection helper Class.
 * -param {RTCSession} session
 * -param {Object} [contraints]
 */
function RTCMediaHandler(session, constraints) {
  constraints = constraints || {};
  this.logger = session.ua.getLogger('ExSIP.rtcsession.rtcmediahandler', session.id);

  this.logger.log('constraints : '+Utils.toString(constraints), session.ua);
  this.session = session;
  this.localMedia = null;
  this.peerConnection = null;
  this.createOfferConstraints = null;
  this.dataChannel = null;
  this.ready = true;

  this.init(constraints);
}


RTCMediaHandler.prototype = {
  isReady: function() {
    return this.ready;
  },

  copy: function(rtcMediaHandler) {
    var self = this;

    var streamAdditionSucceeded = function() {
    };
    var streamAdditionFailed = function() {
      if (self.session.status === ExSIP_C.STATUS_TERMINATED) {
        return;
      }

      self.session.failed('local', null, ExSIP_C.causes.WEBRTC_ERROR);
    };

    var description = new WebRTC.RTCSessionDescription({type: this.getSetLocalDescriptionType(), sdp: rtcMediaHandler.peerConnection.localDescription.sdp});
    this.setLocalDescription(description);

    this.addStream(rtcMediaHandler.localMedia, streamAdditionSucceeded, streamAdditionFailed);
  },

  connect: function(stream, connectSucceeded, connectFailed, options) {
    var self = this;
    options = options || {};
    this.logger.log('connect with isAnswer : '+options.isAnswer+" and remoteSdp : "+options.remoteSdp, self.session.ua);

    var setLocalDescription = function(callback) {
      self.setLocalDescription(options.localDescription, callback || connectSucceeded, connectFailed);
    };

    var setRemoteDescription = function(successCallback) {
      self.onMessage(
        self.getSetRemoteLocationType(),
        options.remoteSdp,
        successCallback || connectSucceeded, function(e){
          self.logger.error("setRemoteDescription failed");
          self.logger.error(Utils.toString(e));
          connectFailed();
        }
      );
    };

    var createAnswer = function(){
      self.createAnswer(connectSucceeded, connectFailed, options.mediaConstraints);
    };

    var createOffer = function(){
      self.createOffer(function(sdp){
        if(options.remoteSdp && options.remoteSdp !== "") {
          setRemoteDescription(connectSucceeded);
        } else {
          connectSucceeded(sdp);
        }
      }, connectFailed, options.createOfferConstraints, options);
    };

    var streamAdditionSucceeded = function() {
      var hasRemoteSdp = options.remoteSdp && options.remoteSdp.length > 0;
      var isRemote = options.isAnswer && hasRemoteSdp;
      self.logger.log("isRemote : "+isRemote+", isAnswer : "+options.isAnswer+", hasRemoteSdp :"+hasRemoteSdp, self.session.ua);
      if(isRemote) {
        if(options.localDescription) {
          setRemoteDescription(setLocalDescription);
        } else {
          setRemoteDescription(createAnswer);
        }
      } else {
        if(options.remoteSdp) {
          setLocalDescription(setRemoteDescription);
        } else {
          createOffer();
        }
      }
    };

    var streamAdditionFailed = function() {
      if (self.session.status === ExSIP_C.STATUS_TERMINATED) {
        return;
      }

      self.session.failed('local', null, ExSIP_C.causes.WEBRTC_ERROR);
      connectFailed();
    };

    this.addStream(
      stream,
      streamAdditionSucceeded,
      streamAdditionFailed
    );
  },

  createOffer: function(onSuccess, onFailure, constraints, options) {
    var self = this;
    options = options || {};

    function onSetLocalDescriptionSuccess() {
      if (self.peerConnection.iceGatheringState === 'complete' && (self.peerConnection.iceConnectionState === 'connected' || self.peerConnection.iceConnectionState === 'completed') ||
          !self.peerConnection.localDescription.isActive()) {
        self.ready = true;
        onSuccess(self.peerConnection.localDescription.sdp);
      } else {
        self.onIceCompleted = function() {
          self.onIceCompleted = undefined;
          self.ready = true;
          onSuccess(self.peerConnection.localDescription.sdp);
        };
      }
    }

    this.ready = false;

    this.createOfferConstraints = constraints;
    this.logger.log("createOffer with createOfferConstraints : "+Utils.toString(this.createOfferConstraints), this.session.ua);
    this.peerConnection.createOffer(
      function(sessionDescription){
        if(options.videoMode) {
          sessionDescription.setVideoMode(options.videoMode);
        }
        if(options.videoPort) {
          sessionDescription.setVideoPort(options.videoPort);
        }
        if(options.audioMode) {
          sessionDescription.setAudioMode(options.audioMode);
        }
        if(options.audioPort) {
          sessionDescription.setAudioPort(options.audioPort);
        }
        self.setLocalDescription(
          sessionDescription,
          onSetLocalDescriptionSuccess,
          function(e) {
            self.ready = true;
            onFailure(e);
          }
        );
      },
      function(e) {
        self.ready = true;
        self.logger.error('unable to create offer');
        self.logger.error(e);
        onFailure(e);
      },
      constraints
    );
  },

  getRemoteDescriptionSdp: function() {
    return this.peerConnection.remoteDescription ? this.peerConnection.remoteDescription.sdp : undefined;
  },

  createAnswer: function(onSuccess, onFailure, constraints) {
    var self = this;

    function onSetLocalDescriptionSuccess() {
      if (self.peerConnection.iceGatheringState === 'complete' && (self.peerConnection.iceConnectionState === 'connected' || self.peerConnection.iceConnectionState === 'completed') ||
          !self.peerConnection.localDescription.isActive()) {
        self.ready = true;
        onSuccess(self.peerConnection.localDescription.sdp);
      } else {
        self.onIceCompleted = function() {
          self.onIceCompleted = undefined;
          self.ready = true;
          onSuccess(self.peerConnection.localDescription.sdp);
        };
      }
    }

    this.ready = false;

    constraints = constraints ||  this.createOfferConstraints;
    this.logger.log("createAnswer with constraints : "+constraints, this.session.ua);
    this.peerConnection.createAnswer(
      function(sessionDescription){
        self.setLocalDescription(
          sessionDescription,
          onSetLocalDescriptionSuccess,
          function(e) {
            self.ready = true;
            onFailure(e);
          }
        );
      },
      function(e) {
        self.ready = true;
        self.logger.error('unable to create answer');
        self.logger.error(e);
        onFailure(e);
      },
      constraints
    );
  },

  setLocalDescription: function(sessionDescription, onSuccess, onFailure) {
    var self = this;

    this.peerConnection.setLocalDescription(
      sessionDescription,
      onSuccess,
      function(e) {
        self.logger.error('unable to set local description');
        self.logger.error(e);
        onFailure(e);
      }
    );
  },

  addStream: function(stream, onSuccess, onFailure, constraints) {
    try {
      this.logger.log("add stream : "+Utils.toString(stream), this.session.ua);
      this.peerConnection.addStream(stream, constraints);
    } catch(e) {
      this.logger.error('error adding stream');
      this.logger.error(e);
      onFailure();
      return;
    }

    onSuccess();
  },

  clearStreams: function() {
    if(!this.localMedia) {
      return;
    }
    if(this.removeStream(this.localMedia)) {
      this.localMedia = null;
    }
    return;
  },

  removeStream: function(stream) {
    try {
      this.logger.log("remove stream : "+Utils.toString(stream), this.session.ua);
      this.peerConnection.removeStream(stream);
    } catch(e) {
      this.logger.error('error removing stream');
      this.logger.error(e);
      return false;
    }

    return true;
  },

  getSetLocalDescriptionType: function(){
    var state = this.peerConnection.signalingState;
    if(state === 'stable' || state === 'have-local-offer') {
      return "offer";
    } else if(state === 'have-remote-offer' || state === 'have-local-pr-answer'){
      return "answer";
    } else {
      this.logger.error("state "+state +" not implemented - returning offer");
      return "offer";
    }
  },

  getSetRemoteLocationType: function(){
    var state = this.peerConnection.signalingState;
    if(state === 'stable' || state === 'have-remote-offer') {
      return "offer";
    } else if(state === 'have-local-offer' || state === 'have-remote-pr-answer'){
      return "answer";
    } else {
      this.logger.error("state "+state +" not implemented - returning offer");
      return "offer";
    }
  },

  sendData: function(data) {
    if(this.dataChannel) {
      this.dataChannel.send(data);
    } else {
      this.logger.error('datachannel is not enabled - see UA.configuration.enable_datachannel');
    }
  },

  /**
  * peerConnection creation.
  */
  init: function(options) {
    options = options || {};

    var idx, length, server,
      self = this,
      servers = [],
      constraints = options.constraints || {},
      stun_servers = options.stun_servers  || null,
      turn_servers = options.turn_servers || null,
      config = this.session.ua.configuration;

    if (!stun_servers) {
      stun_servers = config.stun_servers;
    }

    if (!turn_servers) {
      turn_servers = config.turn_servers;
    }

    /* Change 'url' to 'urls' whenever this issue is solved:
     * https://code.google.com/p/webrtc/issues/detail?id=2096
     */

    if (stun_servers.length > 0) {
      servers.push({'url': stun_servers});
    }

    length = turn_servers.length;
    for (idx = 0; idx < length; idx++) {
      server = turn_servers[idx];
      servers.push({
        'url': server.urls,
        'username': server.username,
        'credential': server.credential
      });
    }

    this.peerConnection = new WebRTC.RTCPeerConnection({'iceServers': servers}, constraints);

    this.peerConnection.onaddstream = function(e) {
      self.logger.debug('stream added: '+ e.stream.id);
    };

    this.peerConnection.onremovestream = function(e) {
      self.logger.debug('stream removed: '+ e.stream.id);
    };

    this.peerConnection.onicecandidate = function(e) {
      if (e.candidate && self.session.ua.rtcMediaHandlerOptions.enableICE) {
        self.logger.debug('ICE candidate received: '+ e.candidate.candidate);
      } else if (self.onIceCompleted !== undefined) {
        self.logger.log('onIceCompleted with ready : '+ self.ready+" and candidate : "+Utils.toString(e.candidate), self.session.ua);
        if(!self.ready && e.candidate) {
          self.onIceCompleted();
        }      
      }
    };

    this.peerConnection.oniceconnectionstatechange = function() {
      self.logger.debug('ICE connection state changed to "'+ this.iceConnectionState +'"');

      if (this.iceConnectionState === 'connected') {
        self.session.iceConnected();
      } else if (this.iceConnectionState === 'completed') {
        self.session.iceCompleted();
      } else if (this.iceConnectionState === 'closed') {
        self.session.iceClosed();
      } else if (this.iceConnectionState === 'failed') {
        self.session.terminate({
          cause: ExSIP_C.causes.RTP_TIMEOUT,
          status_code: 200,
          reason_phrase: ExSIP_C.causes.RTP_TIMEOUT
        });
      }
    };


    this.peerConnection.onstatechange = function() {
      self.logger.debug('PeerConnection state changed to "'+ this.readyState +'"');
    };

    if(self.session.ua.configuration.enable_datachannel) {
      this.dataChannel = new DataChannel(this.session, this.peerConnection);
    }
  },

  close: function(stopLocalMedia) {
    this.logger.debug('closing PeerConnection');
    if(this.peerConnection) {
      if(this.peerConnection.signalingState !== 'closed') {
        this.logger.log('closing PeerConnection', this.session.ua);
        this.peerConnection.close();
      }

      if(stopLocalMedia) {
        if(this.localMedia) {
          this.logger.log('stopping local media '+Utils.toString(this.localMedia), this.session.ua);
          this.localMedia.stop();
        }
      }
    }
  },

  /**
  * -param {Object} mediaConstraints
  * -param {Function} onSuccess
  * -param {Function} onFailure
  */
  getUserMedia: function(onSuccess, onFailure, constraints) {
    var self = this;

    this.logger.debug('requesting access to local media');

    WebRTC.getUserMedia(constraints,
      function(stream) {
        self.logger.debug('got local media stream');
        self.localMedia = stream;
        onSuccess(stream);
      },
      function(e) {
        self.logger.error('unable to get user media');
        self.logger.error(e);
        onFailure();
      }
    );
  },

  /**
  * Message reception.
  * -param {String} type
  * -param {String} sdp
  * -param {Function} onSuccess
  * -param {Function} onFailure
  */
  onMessage: function(type, body, onSuccess, onFailure) {
    var self = this;
    var description = new WebRTC.RTCSessionDescription({type: type, sdp:body});
    if(this.session.ua.rtcMediaHandlerOptions.videoBandwidth) {
      description.setVideoBandwidth(this.session.ua.rtcMediaHandlerOptions.videoBandwidth);
      this.logger.log("Modifying SDP with videoBandwidth : "+this.session.ua.rtcMediaHandlerOptions.videoBandwidth);
    }

    if(this.peerConnection) {
      if(!description.sdp) {
        this.logger.log('empty sdp on setRemoteDescription - calling success');
        onSuccess();
        return;
      }

      var unsupportedMedia = description.removeUnsupportedMedia();
      if(unsupportedMedia) {
        this.logger.log('removed unsupported media : '+unsupportedMedia);
        this.peerConnection.remoteUnsupportedMedia = unsupportedMedia;
      }

      this.logger.log('peerConnection.setRemoteDescription : description : '+Utils.toString(description));
      this.logger.log('peerConnection.setRemoteDescription for type '+description.type+' : '+description.sdp);
      this.peerConnection.setRemoteDescription(
        description,
        onSuccess,
        function(e){
          self.logger.log("----------setRemoteDescription with error : "+JSON.stringify(e));
          onFailure(e);
        }
      );
    }
  }
};
},{"../Constants":7,"../Utils":32,"../WebRTC":33,"./DataChannel":22}],24:[function(require,module,exports){
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

    // if(!this.registered) {
    //   this.logger.debug('already unregistered');
    //   return;
    // }

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

  onTransportConnected: function() {
    this.register();
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
},{"./Constants":7,"./RequestSender":25,"./SIPMessage":26,"./Utils":32}],25:[function(require,module,exports){
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
},{"./Constants":7,"./DigestAuthentication":10,"./Transactions":28,"./UA":30}],26:[function(require,module,exports){
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

  this.logger = ua.getLogger('ExSIP.sipmessage');

  this.logger.debug('OutgoingRequest.extraHeaders : '+method+', '+ruri+', '+extraHeaders);
  // Mandatory parameters check
  if(!method || !ruri || !ua) {
    return null;
  }

  this.ua = ua;
  this.headers = {};
  this.method = method;
  this.ruri = ruri;
  this.body = body;
  this.extraHeaders = extraHeaders && extraHeaders.slice() || [];
this.logger.debug('OutgoingRequest.extraHeaders 2 : '+this.extraHeaders);
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

    msg += this.method + ' ' + (this.ua.configuration.enable_ims && this.ruri.isPhoneNumber() ? this.ruri + ";user=phone" : this.ruri) + ' SIP/2.0\r\n';

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
    if(!this.hasHeader('Allow')) {
      msg += 'Allow: '+ ExSIP_C.ALLOWED_METHODS +'\r\n';      
    }

    if(!this.hasHeader('Supported')) {
      msg += 'Supported: ' +  supported +'\r\n';
    }
    
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
    if(response.indexOf('Content-Type:') === -1) {
      response += 'Content-Type: application/sdp\r\n';      
    }
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

},{"./Constants":7,"./Grammar":14,"./NameAddrHeader":18,"./Utils":32}],27:[function(require,module,exports){
var T1 = 500,
  T2 = 4000,
  T4 = 5000;


var Timers = {
  T1: T1,
  T2: T2,
  T4: T4,
  TIMER_B: 64 * T1,
  TIMER_D: 0  * T1,
  TIMER_F: 64 * T1,
  TIMER_H: 64 * T1,
  TIMER_I: 0  * T1,
  TIMER_J: 0  * T1,
  TIMER_K: 0  * T4,
  TIMER_L: 64 * T1,
  TIMER_M: 64 * T1,
  PROVISIONAL_RESPONSE_INTERVAL: 60000  // See RFC 3261 Section 13.3.1.1
};

module.exports = Timers;

},{}],28:[function(require,module,exports){
module.exports = {
  C: null,
  NonInviteClientTransaction: NonInviteClientTransaction,
  InviteClientTransaction: InviteClientTransaction,
  AckClientTransaction: AckClientTransaction,
  NonInviteServerTransaction: NonInviteServerTransaction,
  InviteServerTransaction: InviteServerTransaction,
  checkTransaction: checkTransaction
};


var C = {
  // Transaction states
  STATUS_TRYING:     1,
  STATUS_PROCEEDING: 2,
  STATUS_CALLING:    3,
  STATUS_ACCEPTED:   4,
  STATUS_COMPLETED:  5,
  STATUS_TERMINATED: 6,
  STATUS_CONFIRMED:  7,

  // Transaction types
  NON_INVITE_CLIENT: 'nict',
  NON_INVITE_SERVER: 'nist',
  INVITE_CLIENT: 'ict',
  INVITE_SERVER: 'ist'
};

/**
 * Expose C object.
 */
module.exports.C = C;


/**
 * Dependencies.
 */
var ExSIP_C = require('./Constants');
var EventEmitter = require('./EventEmitter');
var Timers = require('./Timers');


function NonInviteClientTransaction(request_sender, request, transport) {
  var via,
    via_transport,
    events = ['stateChanged'];

  this.type = C.NON_INVITE_CLIENT;
  this.transport = transport;
  this.id = 'z9hG4bK' + Math.floor(Math.random() * 10000000);
  this.request_sender = request_sender;
  this.request = request;

  this.logger = request_sender.ua.getLogger('ExSIP.transaction.nict', this.id);

  if (request_sender.ua.configuration.hack_via_tcp) {
    via_transport = 'TCP';
  }
  else if (request_sender.ua.configuration.hack_via_ws) {
    via_transport = 'WS';
  }
  else {
    via_transport = transport.server.scheme;
  }

  via = 'SIP/2.0/' + via_transport;
  via += ' ' + request_sender.ua.configuration.via_host + ';branch=' + this.id;

  this.request.setHeader('via', via);

  this.request_sender.ua.newTransaction(this);

  this.initEvents(events);
}


NonInviteClientTransaction.prototype = new EventEmitter();

NonInviteClientTransaction.prototype.stateChanged = function(state) {
  this.state = state;
  this.emit('stateChanged', this);
};

NonInviteClientTransaction.prototype.send = function() {
  var tr = this;

  this.stateChanged(C.STATUS_TRYING);
  this.F = setTimeout(function() {tr.timer_F();}, Timers.TIMER_F);

  if(!this.transport.send(this.request)) {
    this.onTransportError();
  }
};

NonInviteClientTransaction.prototype.onTransportError = function() {
  this.logger.debug('transport error occurred, deleting non-INVITE client transaction ' + this.id);
  clearTimeout(this.F);
  clearTimeout(this.K);
  this.stateChanged(C.STATUS_TERMINATED);
  this.request_sender.ua.destroyTransaction(this);
  this.request_sender.onTransportError();
};

NonInviteClientTransaction.prototype.timer_F = function() {
  this.logger.debug('Timer F expired for non-INVITE client transaction ' + this.id);
  this.stateChanged(C.STATUS_TERMINATED);
  this.request_sender.ua.destroyTransaction(this);
  this.request_sender.onRequestTimeout();
};

NonInviteClientTransaction.prototype.timer_K = function() {
  this.stateChanged(C.STATUS_TERMINATED);
  this.request_sender.ua.destroyTransaction(this);
};

NonInviteClientTransaction.prototype.receiveResponse = function(response) {
  var
    tr = this,
    status_code = response.status_code;
  if(status_code < 200) {
    switch(this.state) {
      case C.STATUS_TRYING:
      case C.STATUS_PROCEEDING:
        this.stateChanged(C.STATUS_PROCEEDING);
        this.request_sender.receiveResponse(response);
        break;
    }
  } else {
    switch(this.state) {
      case C.STATUS_TRYING:
      case C.STATUS_PROCEEDING:
        this.stateChanged(C.STATUS_COMPLETED);
        clearTimeout(this.F);

        if(status_code === 408) {
          this.request_sender.onRequestTimeout();
        } else {
          this.request_sender.receiveResponse(response);
        }

        this.K = setTimeout(function() {tr.timer_K();}, Timers.TIMER_K);
        break;
      case C.STATUS_COMPLETED:
        break;
    }
  }
};


function InviteClientTransaction(request_sender, request, transport) {
  var via,
    tr = this,
    via_transport,
    events = ['stateChanged'];

  this.type = C.INVITE_CLIENT;
  this.transport = transport;
  this.id = 'z9hG4bK' + Math.floor(Math.random() * 10000000);
  this.request_sender = request_sender;
  this.request = request;

  this.logger = request_sender.ua.getLogger('ExSIP.transaction.ict', this.id);

  this.logger.log('******************** request_sender : ' + request_sender);
  if (request_sender.ua.configuration.hack_via_tcp) {
    via_transport = 'TCP';
  }
  else if (request_sender.ua.configuration.hack_via_ws) {
    via_transport = 'WS';
  }
  else {
    via_transport = transport.server.scheme;
  }

  via = 'SIP/2.0/' + via_transport;
  via += ' ' + request_sender.ua.configuration.via_host + ';branch=' + this.id;

  this.request.setHeader('via', via);

  this.request_sender.ua.newTransaction(this);

  // TODO: Adding here the cancel() method is a hack that must be fixed.
  // Add the cancel property to the request.
  //Will be called from the request instance, not the transaction itself.
  this.request.cancel = function(reason) {
    tr.cancel_request(tr, reason);
  };

  this.initEvents(events);
}

InviteClientTransaction.prototype = new EventEmitter();

InviteClientTransaction.prototype.stateChanged = function(state) {
  this.state = state;
  this.emit('stateChanged', this);
};

InviteClientTransaction.prototype.send = function() {
  var tr = this;
  this.stateChanged(C.STATUS_CALLING);
  this.B = setTimeout(function() {
    tr.timer_B();
  }, Timers.TIMER_B);

  if(!this.transport.send(this.request)) {
    this.onTransportError();
  }
};

InviteClientTransaction.prototype.onTransportError = function() {
  this.logger.debug('transport error occurred, deleting INVITE client transaction ' + this.id);
  clearTimeout(this.B);
  clearTimeout(this.D);
  clearTimeout(this.M);
  this.stateChanged(C.STATUS_TERMINATED);
  this.request_sender.ua.destroyTransaction(this);

  if (this.state !== C.STATUS_ACCEPTED) {
    this.request_sender.onTransportError();
  }
};

// RFC 6026 7.2
InviteClientTransaction.prototype.timer_M = function() {
  this.logger.debug('Timer M expired for INVITE client transaction ' + this.id);

  if(this.state === C.STATUS_ACCEPTED) {
    clearTimeout(this.B);
    this.stateChanged(C.STATUS_TERMINATED);
    this.request_sender.ua.destroyTransaction(this);
  }
};

// RFC 3261 17.1.1
InviteClientTransaction.prototype.timer_B = function() {
  this.logger.debug('Timer B expired for INVITE client transaction ' + this.id);
  if(this.state === C.STATUS_CALLING) {
    this.stateChanged(C.STATUS_TERMINATED);
    this.request_sender.ua.destroyTransaction(this);
    this.logger.debug('InviteClientTransaction.timer_B : ' + this.request_sender);
    this.request_sender.onRequestTimeout();
  }
};

InviteClientTransaction.prototype.timer_D = function() {
  this.logger.debug('Timer D expired for INVITE client transaction ' + this.id);
  clearTimeout(this.B);
  this.stateChanged(C.STATUS_TERMINATED);
  this.request_sender.ua.destroyTransaction(this);
};

InviteClientTransaction.prototype.sendACK = function(response) {
  var tr = this;

  this.ack = 'ACK ' + this.request.ruri + ' SIP/2.0\r\n';
  this.ack += 'Via: ' + this.request.headers.Via.toString() + '\r\n';

  if(this.request.headers.Route) {
    this.ack += 'Route: ' + this.request.headers.Route.toString() + '\r\n';
  }

  this.ack += 'To: ' + response.getHeader('to') + '\r\n';
  this.ack += 'From: ' + this.request.headers.From.toString() + '\r\n';
  this.ack += 'Call-ID: ' + this.request.headers['Call-ID'].toString() + '\r\n';
  this.ack += 'CSeq: ' + this.request.headers.CSeq.toString().split(' ')[0];
  this.ack += ' ACK\r\n';
  this.ack += 'Content-Length: 0\r\n\r\n';

  this.D = setTimeout(function() {tr.timer_D();}, Timers.TIMER_D);

  this.transport.send(this.ack);
};

InviteClientTransaction.prototype.cancel_request = function(tr, reason) {
  var request = tr.request;

  this.cancel = ExSIP_C.CANCEL + ' ' + request.ruri + ' SIP/2.0\r\n';
  this.cancel += 'Via: ' + request.headers.Via.toString() + '\r\n';

  if(this.request.headers.Route) {
    this.cancel += 'Route: ' + request.headers.Route.toString() + '\r\n';
  }

  this.cancel += 'To: ' + request.headers.To.toString() + '\r\n';
  this.cancel += 'From: ' + request.headers.From.toString() + '\r\n';
  this.cancel += 'Call-ID: ' + request.headers['Call-ID'].toString() + '\r\n';
  this.cancel += 'CSeq: ' + request.headers.CSeq.toString().split(' ')[0] +
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

InviteClientTransaction.prototype.receiveResponse = function(response) {
  var
  tr = this,
  status_code = response.status_code;

  if(status_code >= 100 && status_code <= 199) {
    this.logger.debug('received 1xx : '+this.state);
    switch(this.state) {
      case C.STATUS_CALLING:
        this.stateChanged(C.STATUS_PROCEEDING);
        this.request_sender.receiveResponse(response);
        break;
      case C.STATUS_PROCEEDING:
        this.request_sender.receiveResponse(response);
        break;
    }
  } else if(status_code >= 200 && status_code <= 299) {
    switch(this.state) {
      case C.STATUS_CALLING:
      case C.STATUS_PROCEEDING:
        this.stateChanged(C.STATUS_ACCEPTED);
        this.M = setTimeout(function() {
          tr.timer_M();
        }, Timers.TIMER_M);
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


function AckClientTransaction(request_sender, request, transport) {
  var via,
    via_transport;

  this.transport = transport;
  this.id = 'z9hG4bK' + Math.floor(Math.random() * 10000000);
  this.request_sender = request_sender;
  this.request = request;

  this.logger = request_sender.ua.getLogger('ExSIP.transaction.nict', this.id);

  if (request_sender.ua.configuration.hack_via_tcp) {
    via_transport = 'TCP';
  }
  else if (request_sender.ua.configuration.hack_via_ws) {
    via_transport = 'WS';
  }
  else {
    via_transport = transport.server.scheme;
  }

  via = 'SIP/2.0/' + via_transport;
  via += ' ' + request_sender.ua.configuration.via_host + ';branch=' + this.id;

  this.request.setHeader('via', via);
}

AckClientTransaction.prototype = new EventEmitter();

AckClientTransaction.prototype.send = function() {
  if(!this.transport.send(this.request)) {
    this.onTransportError();
  }
};

AckClientTransaction.prototype.onTransportError = function() {
  this.logger.debug('transport error occurred, for an ACK client transaction ' + this.id);
  this.request_sender.onTransportError();
};


function NonInviteServerTransaction(request, ua) {
  var events = ['stateChanged'];

  this.type = C.NON_INVITE_SERVER;
  this.id = request.via_branch;
  this.request = request;
  this.transport = request.transport;
  this.ua = ua;
  this.last_response = '';
  request.server_transaction = this;

  this.logger = ua.getLogger('ExSIP.transaction.nist', this.id);

  this.state = C.STATUS_TRYING;

  ua.newTransaction(this);

  this.initEvents(events);
}

NonInviteServerTransaction.prototype = new EventEmitter();

NonInviteServerTransaction.prototype.stateChanged = function(state) {
  this.state = state;
  this.emit('stateChanged', this);
};

NonInviteServerTransaction.prototype.timer_J = function() {
  this.logger.debug('Timer J expired for non-INVITE server transaction ' + this.id);
  this.stateChanged(C.STATUS_TERMINATED);
  this.ua.destroyTransaction(this);
};

NonInviteServerTransaction.prototype.onTransportError = function() {
  if (!this.transportError) {
    this.transportError = true;

    this.logger.debug('transport error occurred, deleting non-INVITE server transaction ' + this.id);

    clearTimeout(this.J);
    this.stateChanged(C.STATUS_TERMINATED);
    this.ua.destroyTransaction(this);
  }
};

NonInviteServerTransaction.prototype.receiveResponse = function(status_code, response, onSuccess, onFailure) {
  var tr = this;

  if(status_code === 100) {
    /* RFC 4320 4.1
     * 'A SIP element MUST NOT
     * send any provisional response with a
     * Status-Code other than 100 to a non-INVITE request.'
     */
    switch(this.state) {
      case C.STATUS_TRYING:
        this.stateChanged(C.STATUS_PROCEEDING);
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
        this.stateChanged(C.STATUS_COMPLETED);
        this.last_response = response;
        if(Timers.TIMER_J === 0) {
            tr.timer_J();
        } else {
          this.J = setTimeout(function() {
            tr.timer_J();
          }, Timers.TIMER_J);
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


function InviteServerTransaction(request, ua) {
  var events = ['stateChanged'];

  this.type = C.INVITE_SERVER;
  this.id = request.via_branch;
  this.request = request;
  this.transport = request.transport;
  this.ua = ua;
  this.last_response = '';
  request.server_transaction = this;

  this.logger = ua.getLogger('ExSIP.transaction.ist', this.id);

  this.state = C.STATUS_PROCEEDING;

  ua.newTransaction(this);

  this.resendProvisionalTimer = null;

  request.reply(100);

  this.initEvents(events);
}

InviteServerTransaction.prototype = new EventEmitter();

InviteServerTransaction.prototype.stateChanged = function(state) {
  this.state = state;
  this.emit('stateChanged', this);
};

InviteServerTransaction.prototype.timer_H = function() {
  this.logger.debug('Timer H expired for INVITE server transaction ' + this.id);

  if(this.state === C.STATUS_COMPLETED) {
    this.logger.log('transactions', 'ACK for INVITE server transaction was never received, call will be terminated');
  }

  this.stateChanged(C.STATUS_TERMINATED);
  this.ua.destroyTransaction(this);
};

InviteServerTransaction.prototype.timer_I = function() {
  this.stateChanged(C.STATUS_TERMINATED);
  this.ua.destroyTransaction(this);
};

// RFC 6026 7.1
InviteServerTransaction.prototype.timer_L = function() {
  this.logger.debug('Timer L expired for INVITE server transaction ' + this.id);

  if(this.state === C.STATUS_ACCEPTED) {
    this.stateChanged(C.STATUS_TERMINATED);
    this.ua.destroyTransaction(this);
  }
};

InviteServerTransaction.prototype.onTransportError = function() {
  if (!this.transportError) {
    this.transportError = true;

    this.logger.debug('transport error occurred, deleting INVITE server transaction ' + this.id);

    if (this.resendProvisionalTimer !== null) {
      clearInterval(this.resendProvisionalTimer);
      this.resendProvisionalTimer = null;
    }

    clearTimeout(this.L);
    clearTimeout(this.H);
    clearTimeout(this.I);

    this.stateChanged(C.STATUS_TERMINATED);
    this.ua.destroyTransaction(this);
  }
};

InviteServerTransaction.prototype.resend_provisional = function() {
  if(!this.transport.send(this.last_response)) {
    this.onTransportError();
  }
};

// INVITE Server Transaction RFC 3261 17.2.1
InviteServerTransaction.prototype.receiveResponse = function(status_code, response, onSuccess, onFailure) {
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
      this.resendProvisionalTimer = setInterval(function() {
        tr.resend_provisional();}, Timers.PROVISIONAL_RESPONSE_INTERVAL);
    }
  } else if(status_code >= 200 && status_code <= 299) {
    switch(this.state) {
      case C.STATUS_PROCEEDING:
        this.stateChanged(C.STATUS_ACCEPTED);
        this.last_response = response;
        this.L = setTimeout(function() {
          tr.timer_L();
        }, Timers.TIMER_L);

        if (this.resendProvisionalTimer !== null) {
          clearInterval(this.resendProvisionalTimer);
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
          clearInterval(this.resendProvisionalTimer);
          this.resendProvisionalTimer = null;
        }

        if(!this.transport.send(response)) {
          this.onTransportError();
          if (onFailure) {
            onFailure();
          }
        } else {
          this.stateChanged(C.STATUS_COMPLETED);
          this.H = setTimeout(function() {
            tr.timer_H();
          }, Timers.TIMER_H);
          if (onSuccess) {
            onSuccess();
          }
        }
        break;
    }
  }
};

/**
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
function checkTransaction(ua, request) {
  var tr;

  switch(request.method) {
    case ExSIP_C.INVITE:
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
        console.log("checkTransaction failed for INVITE request and server transaction in state : "+tr.state);
        return true;
      }
      break;
    case ExSIP_C.ACK:
      tr = ua.transactions.ist[request.via_branch];

      // RFC 6026 7.1
      if(tr) {
        if(tr.state === C.STATUS_ACCEPTED) {
          return false;
        } else if(tr.state === C.STATUS_COMPLETED) {
          tr.state = C.STATUS_CONFIRMED;
          tr.I = setTimeout(function() {tr.timer_I();}, Timers.TIMER_I);
          return true;
        }
      }
      // ACK to 2XX Response.
      else {
        return false;
      }
      break;
    case ExSIP_C.CANCEL:
      tr = ua.transactions.ist[request.via_branch];
      if(tr) {
        request.reply_sl(200);
        if(tr.state === C.STATUS_PROCEEDING) {
          return false;
        } else {
          console.log("checkTransaction failed for CANCEL request and server transaction in state : "+tr.state);
          return true;
        }
      } else {
        request.reply_sl(481);
        console.log("checkTransaction failed for CANCEL request and no server transaction");
        return true;
      }
      break;
    default:

      // Non-INVITE Server Transaction RFC 3261 17.2.2
      console.log('***************** nist : ', Object.keys(ua.transactions.nist));
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
        console.log("checkTransaction failed for non invite server transaction in state : "+tr.state);
        return true;
      }
      break;
  }
}

},{"./Constants":7,"./EventEmitter":11,"./Timers":27}],29:[function(require,module,exports){
(function (global){
module.exports = Transport;


var C = {
  // Transport status codes
  STATUS_READY:        0,
  STATUS_DISCONNECTED: 1,
  STATUS_ERROR:        2
};


/**
 * Expose C object.
 */
Transport.C = C;


/**
 * Dependencies.
 */
var ExSIP_C = require('./Constants');
var Parser = require('./Parser');
var UA = require('./UA');
var SIPMessage = require('./SIPMessage');
var sanityCheck = require('./sanityCheck');
// Conditional module loading.
var WebSocket;  // jshint ignore:line
var isNode = false;
if (global.WebSocket) {
  WebSocket = global.WebSocket;  // jshint ignore:line
}
else {
  WebSocket = require('ws');  // jshint ignore:line
  isNode = true;
}


function Transport(ua, server) {
  this.logger = ua.getLogger('ExSIP.transport');
  this.ua = ua;
  this.ws = null;
  this.server = server;
  this.reconnection_attempts = 0;
  this.closed = false;
  this.connected = false;
  this.reconnectTimer = null;
  this.lastTransportError = {};

  if (isNode) {
    this.ws_options = this.ua.configuration.node_ws_options;
    this.ws_options.protocol = 'sip';
    this.ws_options.headers = {
      'User-Agent': ExSIP_C.USER_AGENT
    };
  }
}

Transport.prototype = {
  /**
   * Send a message.
   */
  send: function(msg) {
    var message = msg.toString();

    if(this.ws && this.readyState() === WebSocket.OPEN) {
      if (this.ua.configuration.trace_sip === true) {
        this.logger.debug('sending WebSocket message:\n\n' + message + '\n');
      }
      this.ws.send(message);
      return true;
    } else {
      this.logger.warn('unable to send message, WebSocket is not open');
      return false;
    }
  },

  readyState: function() {
    return this.ws.readyState;
  },

  /**
  * Disconnect socket.
  */
  disconnect: function() {
    if(this.ws) {
      // Clear reconnectTimer
      clearTimeout(this.reconnectTimer);
      // TODO: should make this.reconnectTimer = null here?

      this.closed = true;
      this.logger.debug('closing WebSocket ' + this.server.ws_uri);
      this.ws.close();
    }

    // TODO: Why this??
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      this.ua.emit('disconnected', this.ua, {
        transport: this,
        code: this.lastTransportError.code,
        reason: this.lastTransportError.reason
      });
    }
  },

  /**
  * Connect socket.
  */
  connect: function() {
    var transport = this;

    if(this.ws && (this.readyState() === WebSocket.OPEN || this.readyState() === WebSocket.CONNECTING)) {
      this.logger.log('WebSocket ' + this.server.ws_uri + ' is already connected');
      return false;
    }

    if(this.ws) {
      this.ws.close();
    }

    this.logger.log('connecting to WebSocket ' + this.server.ws_uri);
    this.ua.onTransportConnecting(this,
      (this.reconnection_attempts === 0)?1:this.reconnection_attempts);

    try {
      if (! isNode) {
        this.ws = new WebSocket(this.server.ws_uri, 'sip');
        this.ws.binaryType = 'arraybuffer';
      }
      else {
        this.ws = new WebSocket(this.server.ws_uri, this.ws_options);
      }
      this.ua.usedServers.push(this.server);

      this.ws.onopen = function() {
        transport.onOpen();
      };

      this.ws.onclose = function(e) {
        transport.onClose(e);
      };

      this.ws.onmessage = function(e) {
        transport.onMessage(e);
      };

      this.ws.onerror = function(e) {
        transport.onError(e);
      };
    } catch(e) {
      this.logger.warn('error connecting to WebSocket ' + this.server.ws_uri + ': ' + e);
      this.lastTransportError.code = null;
      this.lastTransportError.reason = e.message;
      this.ua.onTransportError(this);
    }
  },

  // Transport Event Handlers

  onOpen: function() {
    this.connected = true;

    this.logger.debug('WebSocket ' + this.server.ws_uri + ' connected');
    // Clear reconnectTimer since we are not disconnected
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    // Reset reconnection_attempts
    this.reconnection_attempts = 0;
    // Disable closed
    this.closed = false;
    // Trigger onTransportConnected callback
    this.ua.onTransportConnected(this);
  },

  onClose: function(e) {
    var connected_before = this.connected;

    this.connected = false;
    this.lastTransportError.code = e.code;
    this.lastTransportError.reason = e.reason;
    this.logger.debug('WebSocket disconnected (code: ' + e.code + (e.reason? '| reason: ' + e.reason : '') +')');

    if(e.wasClean === false) {
      this.logger.warn('WebSocket abrupt disconnection');
    }
    // Transport was connected
    if(connected_before === true) {
      this.ua.onTransportClosed(this);
      // Check whether the user requested to close.
      if(!this.closed) {
        this.reConnect();
      } else {
        this.ua.emit('disconnected', this.ua, {
          transport: this,
          code: this.lastTransportError.code,
          reason: this.lastTransportError.reason
        });
      }
    } else {
      // This is the first connection attempt
      // May be a network error (or may be UA.stop() was called)
      this.ua.onTransportError(this);
    }
  },

  onMessage: function(e) {
    var message, transaction,
      data = e.data;

    // CRLF Keep Alive response from server. Ignore it.
    if(data === '\r\n') {
      if (this.ua.configuration.trace_sip === true) {
        this.logger.debug('received WebSocket message with CRLF Keep Alive response');
      }
      return;
    }

    // WebSocket binary message.
    else if (typeof data !== 'string') {
      try {
        data = String.fromCharCode.apply(null, new Uint8Array(data));
      } catch(evt) {
        this.logger.warn('received WebSocket binary message failed to be converted into string, message discarded');
        return;
      }

      if (this.ua.configuration.trace_sip === true) {
        this.logger.debug('received WebSocket binary message:\n\n' + data + '\n');
      }
    }

    // WebSocket text message.
    else {
      this.logger.log('onMessage : '+this.ua.configuration.trace_sip);
      if (this.ua.configuration.trace_sip === true) {
        this.logger.debug('received WebSocket text message:\n\n' + data + '\n');
      }
    }

    message = Parser.parseMessage(data, this.ua);

    if (! message) {
      return;
    }

    if(this.ua.status === UA.C.STATUS_USER_CLOSED && message instanceof SIPMessage.IncomingRequest) {
      return;
    }

    // Do some sanity check
    if(! sanityCheck(message, this.ua, this)) {
      return;
    }

    if(message instanceof SIPMessage.IncomingRequest) {
      message.transport = this;
      this.ua.receiveRequest(message);
    } else if(message instanceof SIPMessage.IncomingResponse) {
      /* Unike stated in 18.1.2, if a response does not match
      * any transaction, it is discarded here and no passed to the core
      * in order to be discarded there.
      */
      switch(message.method) {
        case ExSIP_C.INVITE:
          transaction = this.ua.transactions.ict[message.via_branch];
          if(transaction) {
            transaction.receiveResponse(message);
          }
          break;
        case ExSIP_C.ACK:
          // Just in case ;-)
          break;
        default:
          transaction = this.ua.transactions.nict[message.via_branch];
          if(transaction) {
            transaction.receiveResponse(message);
          }
          break;
      }
    }
  },

  onError: function(e) {
    this.logger.warn('WebSocket connection error: ' + e);
  },

  /**
  * Reconnection attempt logic.
  */
  reConnect: function() {
    var transport = this;

    this.reconnection_attempts += 1;

    if(this.reconnection_attempts > this.ua.configuration.ws_server_max_reconnection) {
      this.logger.warn('maximum reconnection attempts for WebSocket ' + this.server.ws_uri);
      this.ua.onTransportError(this);
    } else {
      this.logger.log('trying to reconnect to WebSocket ' + this.server.ws_uri + ' (reconnection attempt ' + this.reconnection_attempts + ')'+ ' (reconnection timeout '+this.ua.configuration.ws_server_reconnection_timeout+')');

      if(this.ua.configuration.ws_server_reconnection_timeout === 0) {
        transport.connect();
      } else {
        this.reconnectTimer = setTimeout(function() {
          transport.connect();
          transport.reconnectTimer = null;
        }, this.ua.configuration.ws_server_reconnection_timeout * 1000);
      }
    }
  }
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Constants":7,"./Parser":19,"./SIPMessage":26,"./UA":30,"./sanityCheck":34,"ws":5}],30:[function(require,module,exports){
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
},{"./Constants":7,"./EventEmitter":11,"./Exceptions":13,"./Grammar":14,"./LoggerFactory":16,"./Message":17,"./RTCSession":20,"./Registrator":24,"./Transactions":28,"./Transport":29,"./URI":31,"./Utils":32,"./WebRTC":33}],31:[function(require,module,exports){
module.exports = URI;


/**
 * Dependencies.
 */
var ExSIP_C = require('./Constants');
var Utils = require('./Utils');
var Grammar = require('./Grammar');


/**
 * -param {String} [scheme]
 * -param {String} [user]
 * -param {String} host
 * -param {String} [port]
 * -param {Object} [parameters]
 * -param {Object} [headers]
 *
 */
function URI(scheme, user, host, port, parameters, headers) {
  var param, header;

  // Checks
  if(!host) {
    throw new TypeError('missing or invalid "host" parameter');
  }

  // Initialize parameters
  scheme = scheme || ExSIP_C.SIP;
  this.parameters = {};
  this.headers = {};

  for (param in parameters) {
    this.setParam(param, parameters[param]);
  }

  for (header in headers) {
    this.setHeader(header, headers[header]);
  }

  Object.defineProperties(this, {
    scheme: {
      get: function(){ return scheme; },
      set: function(value){
        scheme = value.toLowerCase();
      }
    },

    user: {
      get: function(){ return user; },
      set: function(value){
        user = value;
      }
    },

    host: {
      get: function(){ return host; },
      set: function(value){
        host = value.toLowerCase();
      }
    },

    port: {
      get: function(){ return port; },
      set: function(value){
        port = value === 0 ? value : (parseInt(value,10) || null);
      }
    }
  });
}


URI.prototype = {
  setParam: function(key, value) {
    if(key) {
      this.parameters[key.toLowerCase()] = (typeof value === 'undefined' || value === null) ? null : value.toString().toLowerCase();
    }
  },

  getParam: function(key) {
    if(key) {
      return this.parameters[key.toLowerCase()];
    }
  },

  hasParam: function(key) {
    if(key) {
      return (this.parameters.hasOwnProperty(key.toLowerCase()) && true) || false;
    }
  },

  deleteParam: function(parameter) {
    var value;
    parameter = parameter.toLowerCase();
    if (this.parameters.hasOwnProperty(parameter)) {
      value = this.parameters[parameter];
      delete this.parameters[parameter];
      return value;
    }
  },

  clearParams: function() {
    this.parameters = {};
  },

  setHeader: function(name, value) {
    this.headers[Utils.headerize(name)] = (value instanceof Array) ? value : [value];
  },

  getHeader: function(name) {
    if(name) {
      return this.headers[Utils.headerize(name)];
    }
  },

  hasHeader: function(name) {
    if(name) {
      return (this.headers.hasOwnProperty(Utils.headerize(name)) && true) || false;
    }
  },

  deleteHeader: function(header) {
    var value;
    header = Utils.headerize(header);
    if(this.headers.hasOwnProperty(header)) {
      value = this.headers[header];
      delete this.headers[header];
      return value;
    }
  },

  clearHeaders: function() {
    this.headers = {};
  },

  isPhoneNumber: function() {
    return this.user && this.user.match(/^\+?\d+$/) !== null;
  },

  clone: function() {
    return new URI(
      this.scheme,
      this.user,
      this.host,
      this.port,
      JSON.parse(JSON.stringify(this.parameters)),
      JSON.parse(JSON.stringify(this.headers)));
  },

  toString: function(){
    var header, parameter, idx, uri,
      headers = [];

    uri  = this.scheme + ':';
    if (this.user) {
      uri += Utils.escapeUser(this.user) + '@';
    }
    uri += this.host;
    if (this.port || this.port === 0) {
      uri += ':' + this.port;
    }

    for (parameter in this.parameters) {
      uri += ';' + parameter;

      if (this.parameters[parameter] !== null) {
        uri += '='+ this.parameters[parameter];
      }
    }

    for(header in this.headers) {
      for(idx in this.headers[header]) {
        headers.push(header + '=' + this.headers[header][idx]);
      }
    }

    if (headers.length > 0) {
      uri += '?' + headers.join('&');
    }

    return uri;
  },

  toAor: function(show_port){
      var aor;

      aor  = this.scheme + ':';
      if (this.user) {
        aor += Utils.escapeUser(this.user) + '@';
      }
      aor += this.host;
      if (show_port && (this.port || this.port === 0)) {
        aor += ':' + this.port;
      }

      return aor;
  }
};


/**
  * Parse the given string and returns a ExSIP.URI instance or undefined if
  * it is an invalid URI.
  */
URI.parse = function(uri) {
  uri = Grammar.parse(uri,'SIP_URI');

  if (uri !== -1) {
    return uri;
  } else {
    return undefined;
  }
};
},{"./Constants":7,"./Grammar":14,"./Utils":32}],32:[function(require,module,exports){
var Utils = {};

module.exports = Utils;


/**
 * Dependencies.
 */
var ExSIP_C = require('./Constants');
var URI = require('./URI');
var Grammar = require('./Grammar');

Utils.inArray = function(array, el) {
  for (var i = array.length; i--;) {
    if (array[i] === el) {
      return true;
    }
  }
  return false;
};

Utils.isEqArrays = function(arr1, arr2) {
  if (arr1 === null && arr2 !== null) {
    return false;
  }
  if (arr1 !== null && arr2 === null) {
    return false;
  }
  if (arr1 === null && arr2 === null) {
    return true;
  }
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (var i = arr1.length; i--;) {
    if (!this.inArray(arr2, arr1[i])) {
      return false;
    }
  }
  return true;
};

/**
 * Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
 * @param obj1
 * @param obj2
 * @returns obj3 a new object based on obj1 and obj2
 */
Utils.merge_options = function(obj1, obj2) {
  var obj3 = {};
  for (var attrname1 in obj1) {
    obj3[attrname1] = obj1[attrname1];
  }
  for (var attrname2 in obj2) {
    obj3[attrname2] = obj2[attrname2];
  }
  return obj3;
};

Utils.containsHeader = function(headers, name) {
  for (var i = 0; i < headers.length; i++) {
    if (headers[i].indexOf(name) !== -1) {
      return true;
    }
  }
  return false;
};

Utils.str_utf8_length = function(string) {
  return unescape(encodeURIComponent(string)).length;
};

Utils.toString = function(object) {
  var seen = [];

  return JSON.stringify(object, function(key, val) {
    if (typeof val === "object") {
      if (seen.indexOf(val) >= 0) {
        return;
      }
      seen.push(val);
    }
    return val;
  });
};

Utils.isFunction = function(fn) {
  if (fn !== undefined) {
    return (Object.prototype.toString.call(fn) === '[object Function]') ? true : false;
  } else {
    return false;
  }
};

Utils.isDecimal = function(num) {
  return !isNaN(num) && (parseFloat(num) === parseInt(num, 10));
};

Utils.getHeadersFromQuery = function(query) {
  var headers = [];
  var queryParts = query.split("&");
  for (var i = 0; i < queryParts.length; i++) {
    var parameters = queryParts[i].split("=");
    headers.push(parameters[0] + ": " + decodeURIComponent(parameters[1]));
  }
  return headers;
};

Utils.stripSip = function(address) {
  var match = address.match(/<sip\:(.*)\>/);
  return match ? match[1] : address;
};

Utils.isEmpty = function(value) {
  if (value === null || value === "" || value === undefined || (value instanceof Array && value.length === 0) || (typeof(value) === 'number' && isNaN(value))) {
    return true;
  }
};

Utils.getAllowedMethods = function(ua) {
  var event,
    allowed = ExSIP_C.ALLOWED_METHODS.toString();

  for (event in ExSIP_C.EVENT_METHODS) {
    if (ua.checkEvent(event) && ua.listeners(event).length > 0) {
      allowed += ',' + ExSIP_C.EVENT_METHODS[event];
    }
  }

  return allowed;
};

Utils.createRandomToken = function(size, base) {
  var i, r,
    token = '';

  base = base || 32;

  for (i = 0; i < size; i++) {
    r = Math.random() * base | 0;
    token += r.toString(base);
  }
  return token;
};

Utils.newTag = function() {
  return Utils.createRandomToken(10);
};

// http://stackoverflow.com/users/109538/broofa
Utils.newUUID = function() {
  var UUID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
      v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  return UUID;
};

Utils.hostType = function(host) {
  if (!host) {
    return;
  } else {
    host = Grammar.parse(host, 'host');
    if (host !== -1) {
      return host.host_type;
    }
  }
};

/**
 * Normalize SIP URI.
 * NOTE: It does not allow a SIP URI without username.
 * Accepts 'sip', 'sips' and 'tel' URIs and convert them into 'sip'.
 * Detects the domain part (if given) and properly hex-escapes the user portion.
 * If the user portion has only 'tel' number symbols the user portion is clean of 'tel' visual separators.
 */
Utils.normalizeTarget = function(target, domain) {
  var uri, target_array, target_user, target_domain;

  // If no target is given then raise an error.
  if (!target) {
    return;
    // If a URI instance is given then return it.
  } else if (target instanceof URI) {
    return target;

    // If a string is given split it by '@':
    // - Last fragment is the desired domain.
    // - Otherwise append the given domain argument.
  } else if (typeof target === 'string') {
    target_array = target.split('@');

    switch (target_array.length) {
      case 1:
        if (!domain) {
          return;
        }
        target_user = target;
        target_domain = domain;
        break;
      case 2:
        target_user = target_array[0];
        target_domain = target_array[1];
        break;
      default:
        target_user = target_array.slice(0, target_array.length - 1).join('@');
        target_domain = target_array[target_array.length - 1];
    }

    // Remove the URI scheme (if present).
    target_user = target_user.replace(/^(sips?|tel):/i, '');

    // Remove 'tel' visual separators if the user portion just contains 'tel' number symbols.
    if (/^[\-\.\(\)]*\+?[0-9\-\.\(\)]+$/.test(target_user)) {
      target_user = target_user.replace(/[\-\.\(\)]/g, '');
    }

    // Build the complete SIP URI.
    target = ExSIP_C.SIP + ':' + Utils.escapeUser(target_user) + '@' + target_domain;

    // Finally parse the resulting URI.
    if ((uri = URI.parse(target))) {
      return uri;
    } else {
      return;
    }
  } else {
    return;
  }
};

/**
 * Hex-escape a SIP URI user.
 */
Utils.escapeUser = function(user) {
  // Don't hex-escape ':' (%3A), '+' (%2B), '?' (%3F"), '/' (%2F).
  return encodeURIComponent(decodeURIComponent(user)).replace(/%3A/ig, ':').replace(/%2B/ig, '+').replace(/%3F/ig, '?').replace(/%2F/ig, '/');
};

Utils.headerize = function(string) {
  var exceptions = {
      'Call-Id': 'Call-ID',
      'Cseq': 'CSeq',
      'Www-Authenticate': 'WWW-Authenticate'
    },
    name = string.toLowerCase().replace(/_/g, '-').split('-'),
    hname = '',
    parts = name.length,
    part;

  for (part = 0; part < parts; part++) {
    if (part !== 0) {
      hname += '-';
    }
    hname += name[part].charAt(0).toUpperCase() + name[part].substring(1);
  }
  if (exceptions[hname]) {
    hname = exceptions[hname];
  }
  return hname;
};

Utils.sipErrorCause = function(status_code) {
  var cause;

  for (cause in ExSIP_C.SIP_ERROR_CAUSES) {
    if (ExSIP_C.SIP_ERROR_CAUSES[cause].indexOf(status_code) !== -1) {
      return ExSIP_C.causes[cause];
    }
  }

  return ExSIP_C.causes.SIP_FAILURE_CODE;
};

/**
 * Generate a random Test-Net IP (http://tools.ietf.org/html/rfc5735)
 */
Utils.getRandomTestNetIP = function() {
  function getOctet(from, to) {
    return Math.floor(Math.random() * (to - from + 1) + from);
  }
  return '192.0.2.' + getOctet(1, 254);
};

// MD5 (Message-Digest Algorithm) http://www.webtoolkit.info
Utils.calculateMD5 = function(string) {
  function rotateLeft(lValue, iShiftBits) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }

  function addUnsigned(lX, lY) {
    var lX4, lY4, lX8, lY8, lResult;
    lX8 = (lX & 0x80000000);
    lY8 = (lY & 0x80000000);
    lX4 = (lX & 0x40000000);
    lY4 = (lY & 0x40000000);
    lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
    if (lX4 & lY4) {
      return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
    }
    if (lX4 | lY4) {
      if (lResult & 0x40000000) {
        return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
      } else {
        return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
      }
    } else {
      return (lResult ^ lX8 ^ lY8);
    }
  }

  function doF(x, y, z) {
    return (x & y) | ((~x) & z);
  }

  function doG(x, y, z) {
    return (x & z) | (y & (~z));
  }

  function doH(x, y, z) {
    return (x ^ y ^ z);
  }

  function doI(x, y, z) {
    return (y ^ (x | (~z)));
  }

  function doFF(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(doF(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function doGG(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(doG(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function doHH(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(doH(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function doII(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(doI(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function convertToWordArray(string) {
    var lWordCount;
    var lMessageLength = string.length;
    var lNumberOfWords_temp1 = lMessageLength + 8;
    var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    var lWordArray = new Array(lNumberOfWords - 1);
    var lBytePosition = 0;
    var lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }

  function wordToHex(lValue) {
    var wordToHexValue = "",
      wordToHexValue_temp = "",
      lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      wordToHexValue_temp = "0" + lByte.toString(16);
      wordToHexValue = wordToHexValue + wordToHexValue_temp.substr(wordToHexValue_temp.length - 2, 2);
    }
    return wordToHexValue;
  }

  function utf8Encode(string) {
    string = string.replace(/\r\n/g, "\n");
    var utftext = "";

    for (var n = 0; n < string.length; n++) {
      var c = string.charCodeAt(n);

      if (c < 128) {
        utftext += String.fromCharCode(c);
      } else if ((c > 127) && (c < 2048)) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      } else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }
    }
    return utftext;
  }

  var x = [];
  var k, AA, BB, CC, DD, a, b, c, d;
  var S11 = 7,
    S12 = 12,
    S13 = 17,
    S14 = 22;
  var S21 = 5,
    S22 = 9,
    S23 = 14,
    S24 = 20;
  var S31 = 4,
    S32 = 11,
    S33 = 16,
    S34 = 23;
  var S41 = 6,
    S42 = 10,
    S43 = 15,
    S44 = 21;

  string = utf8Encode(string);

  x = convertToWordArray(string);

  a = 0x67452301;
  b = 0xEFCDAB89;
  c = 0x98BADCFE;
  d = 0x10325476;

  for (k = 0; k < x.length; k += 16) {
    AA = a;
    BB = b;
    CC = c;
    DD = d;
    a = doFF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
    d = doFF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
    c = doFF(c, d, a, b, x[k + 2], S13, 0x242070DB);
    b = doFF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
    a = doFF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
    d = doFF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
    c = doFF(c, d, a, b, x[k + 6], S13, 0xA8304613);
    b = doFF(b, c, d, a, x[k + 7], S14, 0xFD469501);
    a = doFF(a, b, c, d, x[k + 8], S11, 0x698098D8);
    d = doFF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
    c = doFF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
    b = doFF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
    a = doFF(a, b, c, d, x[k + 12], S11, 0x6B901122);
    d = doFF(d, a, b, c, x[k + 13], S12, 0xFD987193);
    c = doFF(c, d, a, b, x[k + 14], S13, 0xA679438E);
    b = doFF(b, c, d, a, x[k + 15], S14, 0x49B40821);
    a = doGG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
    d = doGG(d, a, b, c, x[k + 6], S22, 0xC040B340);
    c = doGG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
    b = doGG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
    a = doGG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
    d = doGG(d, a, b, c, x[k + 10], S22, 0x2441453);
    c = doGG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
    b = doGG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
    a = doGG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
    d = doGG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
    c = doGG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
    b = doGG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
    a = doGG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
    d = doGG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
    c = doGG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
    b = doGG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
    a = doHH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
    d = doHH(d, a, b, c, x[k + 8], S32, 0x8771F681);
    c = doHH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
    b = doHH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
    a = doHH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
    d = doHH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
    c = doHH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
    b = doHH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
    a = doHH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
    d = doHH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
    c = doHH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
    b = doHH(b, c, d, a, x[k + 6], S34, 0x4881D05);
    a = doHH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
    d = doHH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
    c = doHH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
    b = doHH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
    a = doII(a, b, c, d, x[k + 0], S41, 0xF4292244);
    d = doII(d, a, b, c, x[k + 7], S42, 0x432AFF97);
    c = doII(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
    b = doII(b, c, d, a, x[k + 5], S44, 0xFC93A039);
    a = doII(a, b, c, d, x[k + 12], S41, 0x655B59C3);
    d = doII(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
    c = doII(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
    b = doII(b, c, d, a, x[k + 1], S44, 0x85845DD1);
    a = doII(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
    d = doII(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
    c = doII(c, d, a, b, x[k + 6], S43, 0xA3014314);
    b = doII(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
    a = doII(a, b, c, d, x[k + 4], S41, 0xF7537E82);
    d = doII(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
    c = doII(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
    b = doII(b, c, d, a, x[k + 9], S44, 0xEB86D391);
    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }

  var temp = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);

  return temp.toLowerCase();
};
},{"./Constants":7,"./Grammar":14,"./URI":31}],33:[function(require,module,exports){
var WebRTC = {};

module.exports = WebRTC;

var ExSIP_C = require('./Constants');
var Utils = require('./Utils');

// getUserMedia
if (typeof navigator !== 'undefined' && navigator.webkitGetUserMedia) {
  WebRTC.getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
}
else if (typeof navigator !== 'undefined' && navigator.mozGetUserMedia) {
  WebRTC.getUserMedia = navigator.mozGetUserMedia.bind(navigator);
}
else if (typeof navigator !== 'undefined' && navigator.getUserMedia) {
  WebRTC.getUserMedia = navigator.getUserMedia.bind(navigator);
}

// RTCPeerConnection
if (typeof webkitRTCPeerConnection !== 'undefined') {
  WebRTC.RTCPeerConnection = webkitRTCPeerConnection;
}
else if (typeof mozRTCPeerConnection !== 'undefined') {
  WebRTC.RTCPeerConnection = mozRTCPeerConnection;
}
else if (typeof RTCPeerConnection !== 'undefined') {
  WebRTC.RTCPeerConnection = RTCPeerConnection;
}
else {
  console.log("WebRTC.RTCPeerConnection undefined");
  WebRTC.RTCPeerConnection = function(options, constraints){
    this.options = options;
    this.constraints = constraints;
  };
}

// RTCIceCandidate
if (typeof RTCIceCandidate !== 'undefined') {
  WebRTC.RTCIceCandidate = RTCIceCandidate;
}
else {
  console.log("WebRTC.RTCIceCandidate undefined");
  WebRTC.RTCIceCandidate = function(){};
}

// RTCSessionDescription
if (typeof webkitRTCSessionDescription !== 'undefined') {
  WebRTC.RTCSessionDescription = webkitRTCSessionDescription;
}
else if (typeof mozRTCSessionDescription !== 'undefined') {
  WebRTC.RTCSessionDescription = mozRTCSessionDescription;
}
else if (typeof RTCSessionDescription !== 'undefined') {
  WebRTC.RTCSessionDescription = RTCSessionDescription;
}
else {
  console.log("WebRTC.RTCSessionDescription undefined");
  WebRTC.RTCSessionDescription = function(options){
    options = options || {};
    this.sdp = options.sdp;
    this.type = options.type;
  };
}

WebRTC.RTCSessionDescription.prototype.getSdp = function(options){
  options = options || {};
  var sdp = this.sdp;
  if(options.additionalSdp) {
    sdp += options.additionalSdp;
  }
  return sdp;
};
WebRTC.RTCSessionDescription.prototype.getUnsupportedMedias = function(){
  var slideMedias = this.getSlidesMedias();
  var inactiveApplicationMedias = this.getApplicationMedias('0 RTP/SAVPF');
  var unsupportedMedias = slideMedias.concat(inactiveApplicationMedias);
  return unsupportedMedias;
};
WebRTC.RTCSessionDescription.prototype.removeUnsupportedMedia = function(){
  var unsupportedMedias = this.getUnsupportedMedias();
  for(var i = 0; i < unsupportedMedias.length; i++) {
    this.sdp = this.sdp.replace(unsupportedMedias[i], '');
    console.warn('removing unsupported media from sdp : '+unsupportedMedias[i]);
  }
  return unsupportedMedias.join('');
};
WebRTC.RTCSessionDescription.prototype.getSlidesMedias = function(){
  var slideMedia = this.getVideoMedias('a=content:slides');
  return slideMedia;
};
WebRTC.RTCSessionDescription.prototype.getVideoMedias = function(filter){
  return this.getMedias('video', filter);
};
WebRTC.RTCSessionDescription.prototype.getApplicationMedias = function(filter){
  return this.getMedias('application', filter);
};
WebRTC.RTCSessionDescription.prototype.getMedias = function(type, filter){
  var regex = new RegExp("(m="+type+"(?:(?!m=)[\\s\\S])*)", "mig");
  var match;
  var results = [];
  while((match = regex.exec(this.sdp)) !== null) {
    var media = match.pop();
    if(!filter || media.indexOf(filter) !== -1) {
      results.push(media);
    }
  }
  return results;
};
WebRTC.RTCSessionDescription.prototype.getAudioIcePwd = function(){
  var match = this.sdp.match(/m=audio(?:(?!m=)[\s\S])*a=ice-pwd:(.*)/mi);
  return match !== null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getVideoIcePwd = function(){
  var match = this.sdp.match(/m=video(?:(?!m=)[\s\S])*a=ice-pwd:(.*)/mi);
  return match !== null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getAudioIceUfrag = function(){
  var match = this.sdp.match(/m=audio(?:(?!m=)[\s\S])*a=ice-ufrag:(.*)/mi);
  return match !== null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getVideoIceUfrag = function(){
  var match = this.sdp.match(/m=video(?:(?!m=)[\s\S])*a=ice-ufrag:(.*)/mi);
  return match !== null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getCandidates = function(media){
  var regex = new RegExp("a=candidate:(.*)", "ig");
  var matches;
  var result = [];
  while ((matches = regex.exec(media)) !== null)
  {
    result.push(matches[matches.length-1]);
  }
  return result;
};
WebRTC.RTCSessionDescription.prototype.getAudioCandidates = function(){
  var audio = this.getAudio();
  return audio ? this.getCandidates(audio) : null;
};
WebRTC.RTCSessionDescription.prototype.getVideoCandidates = function(){
  var video = this.getVideo();
  return video ? this.getCandidates(video) : null;
};
WebRTC.RTCSessionDescription.prototype.getConnection = function(){
  var match = this.sdp.match(/v=(?:(?!m=)[\s\S])*c=(.*)/mi);
  return match !== null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getAudio = function(){
  var match = this.sdp.match(/m=audio(?:(?!m=)[\s\S])*/mi);
  return match !== null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getVideo = function(){
  var match = this.sdp.match(/m=video(?:(?!m=)[\s\S])*/mi);
  return match !== null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getAudioConnection = function(){
  var match = this.sdp.match(/m=audio(?:(?!m=)[\s\S])*c=(.*)/mi);
  return match !== null ? match[match.length-1] : this.getConnection();
};
WebRTC.RTCSessionDescription.prototype.getVideoConnection = function(){
  var match = this.sdp.match(/m=video(?:(?!m=)[\s\S])*c=(.*)/mi);
  return match !== null ? match[match.length-1] : this.getConnection();
};
WebRTC.RTCSessionDescription.prototype.hasVideo = function(){
  return this.sdp.match(/m=video/) !== null;
};
WebRTC.RTCSessionDescription.prototype.hasAudio = function(){
  return this.sdp.match(/m=audio/) !== null;
};
WebRTC.RTCSessionDescription.prototype.videoPort = function(){
  var match = this.sdp.match(/m=video\s(\d*)\s/);
  return  match !== null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.audioPort = function(){
  var match = this.sdp.match(/m=audio\s(\d*)\s/);
  return  match !== null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getAudioMedia = function(){
  var match = this.sdp.match(/m=audio\s(.*)/);
  return  match !== null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getVideoMedia = function(){
  var match = this.sdp.match(/m=video\s(.*)/);
  return  match !== null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getAudioCodecs = function(){
  var audioMedia = this.getAudioMedia();
  return this.getCodecs(audioMedia);
};
WebRTC.RTCSessionDescription.prototype.getVideoCodecs = function(){
  var videoMedia = this.getVideoMedia();
  return this.getCodecs(videoMedia);
};
WebRTC.RTCSessionDescription.prototype.getCodecs = function(media){
  if(!media) {
    return null;
  }
  var mediaParts = media.split(" ");
  return mediaParts.splice(2);
};
WebRTC.RTCSessionDescription.prototype.getAudioCodecRtpmap = function(codec){
  var regex = new RegExp("m=audio(?:(?!m=)[\\s\\S])*a=rtpmap:"+codec+"(.*)", "mi");
  var match = this.sdp.match(regex);
  return match !== null ? match[match.length-1].trim() : null;
};
WebRTC.RTCSessionDescription.prototype.getVideoCodecRtpmap = function(codec){
  var regex = new RegExp("m=video(?:(?!m=)[\\s\\S])*a=rtpmap:"+codec+"(.*)", "mi");
  var match = this.sdp.match(regex);
  return match !== null ? match[match.length-1].trim() : null;
};
WebRTC.RTCSessionDescription.prototype.getAudioCodecFmtp = function(codec){
  var regex = new RegExp("m=audio(?:(?!m=)[\\s\\S])*a=fmtp:"+codec+"(.*)", "mi");
  var match = this.sdp.match(regex);
  return match !== null ? match[match.length-1].trim() : null;
};
WebRTC.RTCSessionDescription.prototype.getVideoCodecFmtp = function(codec){
  var regex = new RegExp("m=video(?:(?!m=)[\\s\\S])*a=fmtp:"+codec+"(.*)", "mi");
  var match = this.sdp.match(regex);
  return match !== null ? match[match.length-1].trim() : null;
};
WebRTC.RTCSessionDescription.prototype.getAudioFingerprint = function(){
  var match = this.sdp.match(/m=audio(?:(?!m=)[\s\S])*a=fingerprint:(.*)/mi);
  return match !== null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getVideoFingerprint = function(){
  var match = this.sdp.match(/m=video(?:(?!m=)[\s\S])*a=fingerprint:(.*)/mi);
  return match !== null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getAudioRtcp = function(){
  var match = this.sdp.match(/m=audio(?:(?!m=)[\s\S])*a=rtcp:(.*)/mi);
  return match !== null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getVideoRtcp = function(){
  var match = this.sdp.match(/m=video(?:(?!m=)[\s\S])*a=rtcp:(.*)/mi);
  return match !== null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.removeVideoFingerprint = function(){
  if(this.getVideoFingerprint()) {
    this.sdp = this.sdp.replace(/(m=video(?:(?!m=)[\s\S])*)(a=fingerprint:.*\r\n)/mi, "$1");
  }
};
WebRTC.RTCSessionDescription.prototype.removeAudioFingerprint = function(){
  if(this.getAudioFingerprint()) {
    this.sdp = this.sdp.replace(/(m=audio(?:(?!m=)[\s\S])*)(a=fingerprint:.*\r\n)/mi, "$1");
  }
};
WebRTC.RTCSessionDescription.prototype.hasActiveVideo = function(){
  var videoPort = this.videoPort() || 0;
  var videoConnection = this.getVideoConnection() || "";
  return this.hasVideo() && videoPort > 0 && videoConnection.indexOf('0.0.0.0') === -1;
};
WebRTC.RTCSessionDescription.prototype.hasActiveAudio = function(){
  var audioPort = this.audioPort() || 0;
  var audioConnection = this.getAudioConnection() || "";
  return this.hasAudio() && audioPort > 0 && audioConnection.indexOf('0.0.0.0') === -1;
};
WebRTC.RTCSessionDescription.prototype.getVideoBandwidth = function(){
  var match = this.sdp.match(/m=video(?:(?!m=)[\s\S])*b=.*:(.*)/mi);
  return match !== null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.setVideoBandwidth = function(videoBandwidth){
  if(this.getVideoBandwidth()) {
    this.sdp = this.sdp.replace(/(m=video(?:(?!m=)[\s\S])*)(b=.*)/mi, "$1b=AS:" + videoBandwidth);
  } else {
    this.sdp = this.sdp.replace(/(m=video.*((?!m=)[\s\S]*c=IN\s+IP4.*)?)/, "$1\r\nb=AS:" + videoBandwidth);
  }
};
WebRTC.RTCSessionDescription.prototype.setVideoMode = function(mode){
  if(this.getVideoMode()) {
    this.sdp = this.sdp.replace(/(m=video(?:(?!m=)[\s\S])*)(a=(sendrecv|sendonly|recvonly|inactive))/mi, "$1a=" + mode);
  } else {
    this.sdp = this.sdp.replace(/(m=video.*((?!m=)[\s\S]*c=IN\s+IP4.*)?)/, "$1\r\na=" + mode);
  }
};
WebRTC.RTCSessionDescription.prototype.setVideoPort = function(port){
  this.sdp = this.sdp.replace(/(m=video\s)(\d*)(\s)/i, "$1"+port+"$3");
};
WebRTC.RTCSessionDescription.prototype.getVideoMode = function(){
  var match = this.sdp.match(/m=video(?:(?!m=)[\s\S])*a=(sendrecv|sendonly|recvonly|inactive)/mi);
  return match !== null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.setAudioMode = function(mode){
  if(this.getAudioMode()) {
    this.sdp = this.sdp.replace(/(m=audio(?:(?!m=)[\s\S])*)(a=(sendrecv|sendonly|recvonly|inactive))/mi, "$1a=" + mode);
  } else {
    this.sdp = this.sdp.replace(/(m=audio.*(:?(?!m=)[\s\S])*(c=IN\s+IP4.*)?)/, "$1\r\na=" + mode);
  }
};
WebRTC.RTCSessionDescription.prototype.setAudioPort = function(port){
  this.sdp = this.sdp.replace(/(m=audio\s)(\d*)(\s)/i, "$1"+port+"$3");
};
WebRTC.RTCSessionDescription.prototype.setAudioConnection = function(audioConnection){
  if(this.getAudioConnection()) {
    this.sdp = this.sdp.replace(/(m=audio(?:(?!m=)[\s\S])*)(c=.*)/mi, "$1c=" + audioConnection);
  } else {
    this.sdp = this.sdp.replace(/(m=audio.*((?!m=)[\s\S]*c=IN\s+IP4.*)?)/, "$1\r\nc=" + audioConnection);
  }
};
WebRTC.RTCSessionDescription.prototype.setVideoConnection = function(videoConnection){
  if(this.getVideoConnection()) {
    this.sdp = this.sdp.replace(/(m=video(?:(?!m=)[\s\S])*)(c=.*)/mi, "$1c=" + videoConnection);
  } else {
    this.sdp = this.sdp.replace(/(m=video.*((?!m=)[\s\S]*c=IN\s+IP4.*)?)/, "$1\r\nc=" + videoConnection);
  }
};
WebRTC.RTCSessionDescription.prototype.setAudioRtcp = function(audioRtcp){
  if(this.getAudioRtcp()) {
    this.sdp = this.sdp.replace(/(m=audio(?:(?!m=)[\s\S])*)(a=rtcp:.*)/mi, "$1a=rtcp:" + audioRtcp);
  } else {
    this.sdp = this.sdp.replace(/(m=audio.*((?!m=)[\s\S]*c=IN\s+IP4.*)?)/, "$1\r\na=rtcp:" + audioRtcp);
  }
};
WebRTC.RTCSessionDescription.prototype.setVideoRtcp = function(videoRtcp){
  if(this.getVideoRtcp()) {
    this.sdp = this.sdp.replace(/(m=video(?:(?!m=)[\s\S])*)(a=rtcp:.*)/mi, "$1a=rtcp:" + videoRtcp);
  } else {
    this.sdp = this.sdp.replace(/(m=video.*((?!m=)[\s\S]*c=IN\s+IP4.*)?)/, "$1\r\na=rtcp:" + videoRtcp);
  }
};
WebRTC.RTCSessionDescription.prototype.getAudioMode = function(){
  var match = this.sdp.match(/m=audio(?:(?!m=)[\s\S])*a=(sendrecv|sendonly|recvonly|inactive)/mi);
  return match !== null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.isActive = function(){
  if(this.hasAudio() && this.audioPort() !== "0" && this.getAudioMode() !== ExSIP_C.INACTIVE) {
    return true;
  }
  if(this.hasVideo() && this.videoPort() !== "0" && this.getVideoMode() !== ExSIP_C.INACTIVE) {
    return true;
  }
  return false;
};
WebRTC.RTCSessionDescription.prototype.mediaChanges = function(otherSdp){
  var mediaChanges = [];
  if(this.hasAudio() !== otherSdp.hasAudio()) {
    mediaChanges.push("audio has changed");
  }
  if(this.hasVideo() !== otherSdp.hasVideo()) {
    mediaChanges.push("video has changed");
  }
  if(this.audioPort() !== otherSdp.audioPort()) {
    mediaChanges.push("audio port has changed : "+this.audioPort()+" - " + otherSdp.audioPort());
  }
  if(this.videoPort() !== otherSdp.videoPort()) {
    mediaChanges.push("video port has changed : "+this.videoPort()+" - " + otherSdp.videoPort());
  }
  if(this.getAudioConnection() !== otherSdp.getAudioConnection()) {
    mediaChanges.push("audio connection has changed : "+this.getAudioConnection()+" - " + otherSdp.getAudioConnection());
  }
  if(this.getVideoConnection() !== otherSdp.getVideoConnection()) {
    mediaChanges.push("video connection has changed : "+this.getVideoConnection()+" - " + otherSdp.getVideoConnection());
  }
  var audioCodecs = this.getAudioCodecs();
  if(!Utils.isEqArrays(audioCodecs, otherSdp.getAudioCodecs())) {
    mediaChanges.push("audio codecs has changed : "+audioCodecs+" - " + otherSdp.getAudioCodecs());
  }
  var videoCodecs = this.getVideoCodecs();
  if(!Utils.isEqArrays(videoCodecs, otherSdp.getVideoCodecs())) {
    mediaChanges.push("video codecs has changed : "+videoCodecs+" - " + otherSdp.getVideoCodecs());
  }

  if(audioCodecs) {
    for(var i = 0; i < audioCodecs.length; i++) {
      if(this.getAudioCodecRtpmap(audioCodecs[i]) !== otherSdp.getAudioCodecRtpmap(audioCodecs[i])) {
        mediaChanges.push("audio codec rtpmap for "+audioCodecs[i]+" has changed : "+this.getAudioCodecRtpmap(audioCodecs[i])+" - " + otherSdp.getAudioCodecRtpmap(audioCodecs[i]));
      }
//      if(this.getAudioCodecFmtp(audioCodecs[i]) !== otherSdp.getAudioCodecFmtp(audioCodecs[i])) {
//        mediaChanges.push("audio codec fmtp for "+audioCodecs[i]+" has changed : "+this.getAudioCodecFmtp(audioCodecs[i])+" - " + otherSdp.getAudioCodecFmtp(audioCodecs[i]));
//      }
    }
  }
  if(videoCodecs) {
    for(var j = 0; j < videoCodecs.length; j++) {
      if(this.getVideoCodecRtpmap(videoCodecs[j]) !== otherSdp.getVideoCodecRtpmap(videoCodecs[j])) {
        mediaChanges.push("video codec rtpmap for "+videoCodecs[j]+" has changed : "+this.getVideoCodecRtpmap(videoCodecs[j])+" - " + otherSdp.getVideoCodecRtpmap(videoCodecs[j]));
      }
//      if(this.getVideoCodecFmtp(videoCodecs[j]) !== otherSdp.getVideoCodecFmtp(videoCodecs[j])) {
//        mediaChanges.push("video codec fmtp for "+videoCodecs[j]+" has changed : "+this.getVideoCodecFmtp(videoCodecs[j])+" - " + otherSdp.getVideoCodecFmtp(videoCodecs[j]));
//      }
    }
  }

  return mediaChanges;
};

// New syntax for getting streams in Chrome M26.
if (WebRTC.RTCPeerConnection && WebRTC.RTCPeerConnection.prototype) {
  if (! WebRTC.RTCPeerConnection.prototype.getLocalStreams) {
    WebRTC.RTCPeerConnection.prototype.getLocalStreams = function() {
      return this.localStreams;
    };
    WebRTC.RTCPeerConnection.prototype.getRemoteStreams = function() {
      return this.remoteStreams;
    };
  }
  WebRTC.RTCPeerConnection.prototype.isIceCandidateReady = function(candidate) {
    // if(mozRTCPeerConnection && !candidate) {
    //   return true;
    // }
    // if(!mozRTCPeerConnection && candidate) {
    //   return true;
    // }
    return candidate;
  };
}

// isSupported attribute.
if (WebRTC.getUserMedia && WebRTC.RTCPeerConnection && WebRTC.RTCSessionDescription) {
  WebRTC.isSupported = true;
}
else {
  WebRTC.isSupported = false;
}

},{"./Constants":7,"./Utils":32}],34:[function(require,module,exports){
module.exports = sanityCheck;


/**
 * Dependencies.
 */
var ExSIP_C = require('./Constants');
var SIPMessage = require('./SIPMessage');
var Utils = require('./Utils');


var logger,
  message, ua, transport,
  requests = [],
  responses = [],
  all = [];


requests.push(rfc3261_8_2_2_1);
requests.push(rfc3261_16_3_4);
requests.push(rfc3261_18_3_request);
requests.push(rfc3261_8_2_2_2);

responses.push(rfc3261_8_1_3_3);
responses.push(rfc3261_18_3_response);

all.push(minimumHeaders);


function sanityCheck(m, u, t) {
  var len, pass;

  message = m;
  ua = u;
  transport = t;

  logger = ua.getLogger('ExSIP.sanitycheck');

  len = all.length;
  while(len--) {
    pass = all[len](message);
    if(pass === false) {
      return false;
    }
  }

  if(message instanceof SIPMessage.IncomingRequest) {
    len = requests.length;
    while(len--) {
      pass = requests[len](message);
      if(pass === false) {
        return false;
      }
    }
  }

  else if(message instanceof SIPMessage.IncomingResponse) {
    len = responses.length;
    while(len--) {
      pass = responses[len](message);
      if(pass === false) {
        return false;
      }
    }
  }

  //Everything is OK
  return true;
}


/*
 * Sanity Check for incoming Messages
 *
 * Requests:
 *  - _rfc3261_8_2_2_1_ Receive a Request with a non supported URI scheme
 *  - _rfc3261_16_3_4_ Receive a Request already sent by us
 *   Does not look at via sent-by but at exsip_id, which is inserted as
 *   a prefix in all initial requests generated by the ua
 *  - _rfc3261_18_3_request_ Body Content-Length
 *  - _rfc3261_8_2_2_2_ Merged Requests
 *
 * Responses:
 *  - _rfc3261_8_1_3_3_ Multiple Via headers
 *  - _rfc3261_18_3_response_ Body Content-Length
 *
 * All:
 *  - Minimum headers in a SIP message
 */

// Sanity Check functions for requests
function rfc3261_8_2_2_1() {
  if(message.s('to').uri.scheme !== 'sip') {
    logger.warn('Scheme ('+message.s('to').uri.scheme+') is not sip. Dropping the request', ua);
    reply(416);
    return false;
  }
}

function rfc3261_16_3_4() {
  if(!message.to_tag) {
    if(message.call_id.substr(0, 5) === ua.configuration.exsip_id) {
      logger.warn('Call_id ('+message.call_id+') is same as exsip ('+ua.configuration.exsip_id+'). Dropping the request', ua);
      reply(482);
      return false;
    }
  }
}

function rfc3261_18_3_request() {
  var len = Utils.str_utf8_length(message.body),
  contentLength = message.getHeader('content-length');

  if(len < contentLength) {
    logger.warn('Message body length ('+len+') is lower than the value in Content-Length header field ('+contentLength+'). Dropping the request', ua);
    reply(400);
    return false;
  }
}

function rfc3261_8_2_2_2() {
  var tr, idx,
    fromTag = message.from_tag,
    call_id = message.call_id,
    cseq = message.cseq;

  // Accept any in-dialog request.
  if(message.to_tag) {
    return;
  }

  // INVITE request.
  if (message.method === ExSIP_C.INVITE) {
    // If the branch matches the key of any IST then assume it is a retransmission
    // and ignore the INVITE.
    // TODO: we should reply the last response.
    if (ua.transactions.ist[message.via_branch]) {
      return false;
    }
    // Otherwise check whether it is a merged request.
    else {
      for(idx in ua.transactions.ist) {
        tr = ua.transactions.ist[idx];
        if(tr.request.from_tag === fromTag && tr.request.call_id === call_id && tr.request.cseq === cseq) {
          reply(482);
          return false;
        }
      }
    }
  }
  // Non INVITE request.
  else {
    // If the branch matches the key of any NIST then assume it is a retransmission
    // and ignore the request.
    // TODO: we should reply the last response.
    if (ua.transactions.nist[message.via_branch]) {
      return false;
    }
    // Otherwise check whether it is a merged request.
    else {
      for(idx in ua.transactions.nist) {
        tr = ua.transactions.nist[idx];
        if(tr.request.from_tag === fromTag && tr.request.call_id === call_id && tr.request.cseq === cseq) {
          reply(482);
          return false;
        }
      }
    }
  }
}

// Sanity Check functions for responses
function rfc3261_8_1_3_3() {
  if(message.getHeaders('via').length > 1) {
    logger.warn('More than one Via header field present in the response. Dropping the response');
    return false;
  }
}

function rfc3261_18_3_response() {
  var
    len = Utils.str_utf8_length(message.body),
    contentLength = message.getHeader('content-length');

    if(len < contentLength) {
      logger.warn('Message body length is lower than the value in Content-Length header field. Dropping the response');
      return false;
    }
}

// Sanity Check functions for requests and responses
function minimumHeaders() {
  var
    mandatoryHeaders = ['from', 'to', 'call_id', 'cseq', 'via'],
    idx = mandatoryHeaders.length;

  while(idx--) {
    if(!message.hasHeader(mandatoryHeaders[idx])) {
      logger.warn('Missing mandatory header field : '+ mandatoryHeaders[idx] +'. Dropping the response');
      return false;
    }
  }
}

// Reply
function reply(status_code) {
  var to,
    response = "SIP/2.0 " + status_code + " " + ExSIP_C.REASON_PHRASE[status_code] + "\r\n",
    vias = message.getHeaders('via'),
    length = vias.length,
    idx = 0;

  for(idx; idx < length; idx++) {
    response += "Via: " + vias[idx] + "\r\n";
  }

  to = message.getHeader('To');

  if(!message.to_tag) {
    to += ';tag=' + Utils.newTag();
  }

  response += "To: " + to + "\r\n";
  response += "From: " + message.getHeader('From') + "\r\n";
  response += "Call-ID: " + message.call_id + "\r\n";
  response += "CSeq: " + message.cseq + " " + message.method + "\r\n";
  response += "\r\n";

  transport.send(response);
}
},{"./Constants":7,"./SIPMessage":26,"./Utils":32}]},{},[12])(12)
});