/**
 * @fileoverview DataChannel
 */

/**
 * @class DataChannel
 * @param {ExSIP.RTCSession} session
 */
(function(ExSIP) {

var DataChannel,
  logger = new ExSIP.Logger(ExSIP.name +' | '+ 'DataChannel');

DataChannel = function(session, peerConnection) {
  var events = [
  'received',
  'sent',
  'failed'
  ];

  this.session = session;
  this.peerConnection = peerConnection;
  this.sendChannel = null;
  this.receiveChannel = null;
  this.chunkLength = 1000;
  this.dataReceived = [];

  this.initEvents(events);

  var self = this;
  try {
    // Data Channel api supported from Chrome M25.
    // You might need to start chrome with  --enable-data-channels flag.
    this.sendChannel = peerConnection.createDataChannel("sendDataChannel", null);
    logger.log('Created send data channel', session.ua);

    var onSendChannelStateChange = function() {
      var readyState = self.sendChannel.readyState;
      logger.log('Send channel state is: ' + readyState, self.session.ua);
    };

    this.sendChannel.onopen = onSendChannelStateChange;
    this.sendChannel.onclose = onSendChannelStateChange;

    this.peerConnection.ondatachannel = this.receiveChannelCallback;
  } catch (e) {
    this.emit('failed', this, {
      cause: 'Failed to create data channel'
    });
    logger.error('Create Data channel failed with exception: ' + e.message);
  }
};
DataChannel.prototype = new ExSIP.EventEmitter();

DataChannel.prototype.isDebug = function() {
  return this.session.ua.isDebug();
};

DataChannel.prototype.send = function(data) {
  this.sendInChunks(data);
  logger.log('Sent Data: ' + data, this.session.ua);
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

  this.sendChannel.send(data + (last ? "\n" : "")); // use JSON.stringify for chrome!

  if (!last) {
    var remainingDataURL = data.slice(text.length);
    window.setTimeout(function () {
      self.sendInChunks(remainingDataURL); // continue transmitting
    }, 500);
  }
};

DataChannel.prototype.receiveChannelCallback = function(event) {
  var self = this;
  logger.log('Receive Channel Callback', this.session.ua);
  this.receiveChannel = event.channel;

  var onReceiveChannelStateChange = function() {
    var readyState = self.receiveChannel.readyState;
    logger.log('Receive channel state is: ' + readyState, self.session.ua);
  };

  var onReceiveMessageCallback = function(event) {
    logger.log('Received Message : '+event.data, self.session.ua);

    if(event.data.contains('\n')) {
      self.dataReceived.push(event.data.replace('\n', ''));
      var data = self.dataReceived.join('');
      self.session.emit('dataReceived', self, { data: data });
    } else {
      self.dataReceived.push(event.data);
    }
  };

  this.receiveChannel.onmessage = onReceiveMessageCallback;
  this.receiveChannel.onopen = onReceiveChannelStateChange;
  this.receiveChannel.onclose = onReceiveChannelStateChange;
};

  return DataChannel;
}(ExSIP));
