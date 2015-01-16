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
var ExSIP_C = require('../Constants');
var EventEmitter = require('../EventEmitter');
var Exceptions = require('../Exceptions');
var RTCSession = require('../RTCSession');
var Utils = require('../Utils');


function DTMF(session) {
  this.sendTimeoutId = null;
  this.queuedDTMFs = [];
  this.session = session;
  this.logger = session.ua.getLogger('ExSIP.rtcsession.dtmf', session.id);
  this.owner = session;
}
DTMF.prototype = new EventEmitter();

DTMF.prototype.isDebug = function() {
  return this.session.ua.isDebug();
};

DTMF.prototype.send = function(tone, options) {
  var event, eventHandlers, extraHeaders;

  if (tone === undefined) {
    throw new TypeError('Not enough arguments');
  }

  this.direction = 'outgoing';

  // Check RTCSession Status
  if (this.owner.status !== RTCSession.C.STATUS_CONFIRMED &&
    this.owner.status !== RTCSession.C.STATUS_WAITING_FOR_ACK) {
    throw new Exceptions.InvalidStateError(this.owner.status);
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
    this.sendTimeoutId = window.setTimeout(function(){
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

  this.logger.log("sending DTMF with tones "+tones+", duration "+duration+", gap "+interToneGap, this.session.ua);
  this.dtmfSender.insertDTMF(tones, duration, interToneGap);
};

DTMF.prototype.queueTone = function(tone, duration, interToneGap) {
  this.logger.log("Queue tone : "+tone, this.session.ua);
  window.clearTimeout(this.sendTimeoutId);
  this.queuedDTMFs.push({tone: tone, duration: duration, interToneGap: interToneGap});
  var self = this;
  this.sendTimeoutId = window.setTimeout(function(){
    self.processQueuedDTMFs();
  }, 2 * duration);
};

DTMF.prototype.onDTMFSent = function(tone) {
  if (!tone) {
    return;
  }

  this.logger.log("Sent Dtmf tone: " + tone.tone, this.session.ua);
  for(var i=0; i < this.queuedDTMFs.length; i++) {
    var dtmf = this.queuedDTMFs[i];
    if(tone.tone === dtmf.tone) {
      this.queuedDTMFs.splice(i, 1);
      this.logger.log("removing from queued tones - remaining queue: \t" + Utils.toString(this.queuedDTMFs), this.session.ua);
      break;
    } else if(dtmf.tone.indexOf(tone.tone) !== -1) {
      dtmf.tone = dtmf.tone.replace(tone.tone, '');
      this.queuedDTMFs[i] = dtmf;
      this.logger.log("removing from queued tones as contained - remaining queue: \t" + Utils.toString(this.queuedDTMFs), this.session.ua);
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
  if (localstream !== null) {
    var local_audio_track = localstream.getAudioTracks()[0];
    this.dtmfSender = peerConnection.createDTMFSender(local_audio_track);
    this.logger.log("Created DTMF Sender with canInsertDTMF : "+this.dtmfSender.canInsertDTMF, this.session.ua);

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

DTMF.prototype.onRequestTimeout = function() {
  this.emit('failed', this, {
    originator: 'system',
    cause: ExSIP_C.causes.REQUEST_TIMEOUT
  });
  this.owner.onRequestTimeout();
};

DTMF.prototype.onTransportError = function() {
  this.emit('failed', this, {
    originator: 'system',
    cause: ExSIP_C.causes.CONNECTION_ERROR
  });
  this.owner.onTransportError();
};

DTMF.prototype.onDialogError = function(response) {
  this.emit('failed', this, {
    originator: 'remote',
    response: response,
    cause: ExSIP_C.causes.DIALOG_ERROR
  });
  this.owner.onDialogError(response);
};

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
    this.owner.emit('newDTMF', this.owner, {
      originator: 'remote',
      dtmf: this,
      request: request
    });
  }
};