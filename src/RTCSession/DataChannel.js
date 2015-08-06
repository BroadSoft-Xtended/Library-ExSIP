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