<p align="center"><a href="http://jssip.net"><img src="http://jssip.net/images/jssip-banner-new.png"/></a></p>

[![Build Status](https://travis-ci.org/versatica/JsSIP.png?branch=new-design)](https://travis-ci.org/versatica/JsSIP)

## Overview

* Runs in the browser and Node.js.
* SIP over [WebSocket](http://jssip.net/documentation/misc/sip_websocket/) (use real SIP in your web apps)
* Audio/video calls ([WebRTC](http://jssip.net/documentation/misc/webrtc)), instant messaging and presence
* Lightweight! (~140KB)
* Easy to use and powerful user API
* Works with OverSIP, Kamailio, Asterisk. Mobicents and repro (reSIProcate) servers ([more info](http://jssip.net/documentation/misc/interoperability))
* Written by the authors of [RFC 7118 "The WebSocket Protocol as a Transport for SIP"](http://tools.ietf.org/html/rfc7118) and [OverSIP](http://oversip.net)


## Getting Started

The following simple JavaScript code creates a JsSIP User Agent instance and makes a SIP call:

```javascript
// Create our JsSIP instance and run it:

var configuration = {
  'ws_servers': 'ws://sip-ws.example.com',
  'uri': 'sip:alice@example.com',
  'password': 'superpassword'
};

var coolPhone = new JsSIP.UA(configuration);

coolPhone.start();


// Make an audio/video call:

// HTML5 <video> elements in which local and remote video will be shown
var selfView =   document.getElementById('my-video');
var remoteView =  document.getElementById('peer-video');

// Register callbacks to desired call events
var eventHandlers = {
  'progress': function(e){
    console.log('call is in progress');
  },
  'failed': function(e){
    console.log('call failed with cause: '+ e.data.cause);
  },
  'ended': function(e){
    console.log('call ended with cause: '+ e.data.cause);
  },
  'confirmed': function(e){
    var rtcSession = e.sender;

    console.log('call confirmed');

    // Attach local stream to selfView
    if (rtcSession.getLocalStreams().length > 0) {
      selfView.src = window.URL.createObjectURL(rtcSession.getLocalStreams()[0]);
    }

    // Attach remote stream to remoteView
    if (rtcSession.getRemoteStreams().length > 0) {
      remoteView.src = window.URL.createObjectURL(rtcSession.getRemoteStreams()[0]);
    }
  }
};

var options = {
  'eventHandlers': eventHandlers,
  'mediaConstraints': {'audio': true, 'video': true}
};


coolPhone.call('sip:bob@example.com', options);
```

Want to see more? Check the full [Getting Started](http://jssip.net/documentation/0.3.x/getting_started/) section in the project website.


## Online Demo

Check our **Tryit JsSIP** online demo:

* [tryit.jssip.net](http://tryit.jssip.net)


## Website and Documentation

* [jssip.net](http://jssip.net/)


## Download

* As Node module: `$ npm install jssip`
* As Bower module: `$ bower install jssip`
* Manually: [jssip.net/download](http://jssip.net/download/)


## Authors

#### José Luis Millán

* Main author. Core Designer and Developer.
* <jmillan@aliax.net> (Github [@jmillan](https://github.com/jmillan))

#### Iñaki Baz Castillo

* Core Designer and Developer.
* <ibc@aliax.net> (Github [@ibc](https://github.com/ibc))

#### Saúl Ibarra Corretgé

* Core Designer.
* <saghul@gmail.com> (Github [@saghul](https://github.com/saghul))


## License

JsSIP is released under the [MIT license](http://jssip.net/license).
