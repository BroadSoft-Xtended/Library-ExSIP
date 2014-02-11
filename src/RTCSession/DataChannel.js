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

  try {
    // Data Channel api supported from Chrome M25.
    // You might need to start chrome with  --enable-data-channels flag.
    this.sendChannel = peerConnection.createDataChannel("sendDataChannel", null);
    logger.log('Created send data channel', session.ua);

    this.sendChannel.onopen = this.onSendChannelStateChange;
    this.sendChannel.onclose = this.onSendChannelStateChange;

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
  logger.log('Receive Channel Callback', this.session.ua);
  this.receiveChannel = event.channel;
  this.receiveChannel.onmessage = this.onReceiveMessageCallback;
  this.receiveChannel.onopen = this.onReceiveChannelStateChange;
  this.receiveChannel.onclose = this.onReceiveChannelStateChange;
};

DataChannel.prototype.onReceiveMessageCallback = function(event) {
  logger.log('Received Message : '+event.data, this.session.ua);

  if(event.data.contains('\n')) {
    this.dataReceived.push(event.data.replace('\n', ''));
    var data = this.dataReceived.join('');
    this.session.emit('dataReceived', this, { data: data });
  } else {
    this.dataReceived.push(event.data);
  }
};

DataChannel.prototype.onReceiveChannelStateChange = function() {
  var readyState = this.receiveChannel.readyState;
  logger.log('Receive channel state is: ' + readyState, this.session.ua);
};

DataChannel.prototype.onSendChannelStateChange = function() {
  var readyState = this.sendChannel.readyState;
  logger.log('Send channel state is: ' + readyState, this.session.ua);
};

  return DataChannel;
}(ExSIP));
