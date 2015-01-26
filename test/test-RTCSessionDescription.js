require('./include/common');
var testUA = require('./include/testUA');
var ExSIP = require('../');
var WebRTC = require('../src/WebRTC');
var ExSIP_C = require('../src/Constants');

module.exports = {

setUp: function(callback) {
  createDescription();
  callback();
},

'getCodecs': function(test) {
  test.deepEqual(description.getAudioCodecs(), ["9", "126"]);
  test.deepEqual(description.getVideoCodecs(), ["99", "109", "34"]);
  test.done();
},
'getCodecs without video': function(test) {
  createDescription({withoutVideo: true});
  test.deepEqual(description.getVideoCodecs(), null);
  test.done();
},
'getCodecs without audio': function(test) {
  createDescription({withoutAudio: true});
  test.deepEqual(description.getAudioCodecs(), null);
  test.done();
},

'getIceUfrag': function(test) {
  test.deepEqual(description.getAudioIceUfrag(), "pXHmklEbg7WBL95R");
  test.deepEqual(description.getVideoIceUfrag(), "Q8QVGvJo7iPUnNoG");
  test.done();
},
'getIceUfrag without video': function(test) {
  createDescription({withoutVideoIceUfrag: true});
  test.deepEqual(description.getVideoIceUfrag(), null);
  test.done();
},
'getIceUfrag without audio': function(test) {
  createDescription({withoutAudioIceUfrag: true});
  test.deepEqual(description.getAudioIceUfrag(), null);
  test.done();
},

'getIcePwd': function(test) {
  test.deepEqual(description.getAudioIcePwd(), "KJa5PdOffxkQ7NtyroEPwzZY");
  test.deepEqual(description.getVideoIcePwd(), "Tnws80Vq98O3THLRXLqjWnOf");
  test.done();
},
'getIceUfrag without video': function(test) {
  createDescription({withoutVideoIcePwd: true});
  test.deepEqual(description.getVideoIcePwd(), null);
  test.done();
},
'getIceUfrag without audio': function(test) {
  createDescription({withoutAudioIcePwd: true});
  test.deepEqual(description.getAudioIcePwd(), null);
  test.done();
},

'getCodecRtpmap': function(test) {
  test.deepEqual(description.getAudioCodecRtpmap("9"), "G722/8000");
  test.deepEqual(description.getAudioCodecRtpmap("126"), "telephone-event/8000");
  test.deepEqual(description.getVideoCodecRtpmap("99"), "H264/90000");
  test.deepEqual(description.getVideoCodecRtpmap("109"), "H264/90000");
  test.deepEqual(description.getVideoCodecRtpmap("34"), "H263/90000");
  test.done();
},
'getCodecRtpmap without video': function(test) {
  createDescription({withoutVideoCodecRtpmap: true});
  test.deepEqual(description.getVideoCodecRtpmap("99"), null);
  test.done();
},
'getCodecRtpmap without audio': function(test) {
  createDescription({withoutAudioCodecRtpmap: true});
  test.deepEqual(description.getAudioCodecRtpmap("9"), null);
  test.done();
},

'getCodecFmtp': function(test) {
  test.deepEqual(description.getAudioCodecFmtp("9"), null);
  test.deepEqual(description.getAudioCodecFmtp("126"), "0-15");
  test.deepEqual(description.getVideoCodecFmtp("99"), "profile-level-id=42801E; packetization-mode=0");
  test.deepEqual(description.getVideoCodecFmtp("109"), "profile-level-id=42801E; packetization-mode=0");
  test.deepEqual(description.getVideoCodecFmtp("34"), "CIF=1;QCIF=1;SQCIF=1");
  test.done();
},
'getCodecFmtp without video': function(test) {
  createDescription({withoutVideoCodecFmtp: true});
  test.deepEqual(description.getVideoCodecFmtp("99"), null);
  test.done();
},
'getCodecFmtp without audio': function(test) {
  createDescription({withoutAudioCodecFmtp: true});
  test.deepEqual(description.getAudioCodecFmtp("9"), null);
  test.done();
},

'getConnections': function(test) {
  test.strictEqual(description.getConnection(), "IN IP4 10.48.1.13");
  test.strictEqual(description.getAudioConnection(), "IN IP4 10.48.1.23");
  test.strictEqual(description.getVideoConnection(), "IN IP4 10.48.1.33");
  test.done();
},
'getConnections without video connection': function(test) {
  createDescription({withoutVideoConnection: true});
  test.strictEqual(description.getConnection(), "IN IP4 10.48.1.13");
  test.strictEqual(description.getAudioConnection(), "IN IP4 10.48.1.23");
  test.strictEqual(description.getVideoConnection(), "IN IP4 10.48.1.13");
  test.done();
},
'getConnections without audio connection': function(test) {
  createDescription({withoutAudioConnection: true});
  test.strictEqual(description.getConnection(), "IN IP4 10.48.1.13");
  test.strictEqual(description.getAudioConnection(), "IN IP4 10.48.1.13");
  test.strictEqual(description.getVideoConnection(), "IN IP4 10.48.1.33");
  test.done();
},
'getConnections without audio and video connection': function(test) {
  createDescription({withoutAudioConnection: true, withoutVideoConnection: true});
  test.strictEqual(description.getConnection(), "IN IP4 10.48.1.13");
  test.strictEqual(description.getAudioConnection(), "IN IP4 10.48.1.13");
  test.strictEqual(description.getVideoConnection(), "IN IP4 10.48.1.13");
  test.done();
},

'setConnections': function(test) {
  description.setAudioConnection("IN IP4 10.48.1.43");
  description.setVideoConnection("IN IP4 10.48.1.53");
  test.strictEqual(description.getConnection(), "IN IP4 10.48.1.13");
  test.strictEqual(description.getAudioConnection(), "IN IP4 10.48.1.43");
  test.strictEqual(description.getVideoConnection(), "IN IP4 10.48.1.53");
  test.done();
},

'setRtcp': function(test) {
  test.strictEqual(description.getAudioRtcp(), "55761 IN IP4 181.189.138.18");
  test.strictEqual(description.getVideoRtcp(), "55762 IN IP4 181.189.138.18");
  description.setAudioRtcp("12345 IN IP4 10.0.1.2");
  description.setVideoRtcp("23456 IN IP4 11.1.2.3");
  test.strictEqual(description.getAudioRtcp(), "12345 IN IP4 10.0.1.2");
  test.strictEqual(description.getVideoRtcp(), "23456 IN IP4 11.1.2.3");
  test.done();
},

'getCandidates': function(test) {
  test.deepEqual(description.getAudioCandidates(), ["3355351182 1 udp 2113937151 10.0.2.1 59436 typ host generation 0",
                                               "3355351182 2 udp 2113937151 10.0.2.1 59436 typ host generation 0"]);
  test.done();
},

'hasActiveVideo': function(test) {
  test.ok(description.hasActiveVideo());
  test.done();
},
'hasActiveVideo without m=video': function(test) {
  createDescription({withoutVideo: true});
  test.ok(!description.hasActiveVideo());
  test.done();
},
'hasActiveVideo with 0 video port': function(test) {
  createDescription({videoPort: "0"});
  test.ok(!description.hasActiveVideo());
  test.done();
},
'hasActiveVideo with 0.0.0.0 video IP': function(test) {
  createDescription({videoIP: "0.0.0.0"});
  test.ok(!description.hasActiveVideo());
  test.done();
},

'hasActiveAudio': function(test) {
  test.ok(description.hasActiveAudio());
  test.done();
},
'hasActiveAudio without m=audio': function(test) {
  createDescription({withoutAudio: true});
  test.ok(!description.hasActiveAudio());
  test.done();
},
'hasActiveAudio with 0 audio port': function(test) {
  createDescription({audioPort: "0"});
  test.ok(!description.hasActiveAudio());
  test.done();
},
'hasActiveAudio with 0.0.0.0 audio IP': function(test) {
  createDescription({audioIP: "0.0.0.0"});
  test.ok(!description.hasActiveAudio());
  test.done();
},

'setVideoBandwidth': function(test) {
  description.setVideoBandwidth("123");
  test.strictEqual(description.getVideoBandwidth(), "123");
  test.done();
},
'setVideoPort': function(test) {
  test.strictEqual(description.videoPort(), "16930");
  description.setVideoPort("0");
  test.strictEqual(description.videoPort(), "0");
  test.done();
},
'setVideoBandwidth without video bandwidth': function(test) {
  createDescription({withoutVideoBandwidth: true});
  description.setVideoBandwidth("123");
  test.strictEqual(description.getVideoBandwidth(), "123");
  test.done();
},
'setVideoBandwidth without video bandwidth': function(test) {
  createDescription({withoutVideoBandwidth: true});
  description.setVideoBandwidth("123");
  test.strictEqual(description.getVideoBandwidth(), "123");
  test.done();
},
'setVideoBandwidth without video connection': function(test) {
  createDescription({withoutVideoConnection: true});
  description.setVideoBandwidth("123");
  test.strictEqual(description.getVideoBandwidth(), "123");
  test.ok(description.sdp.indexOf('m=video 16930 RTP/AVP 99 109 34\r\nb=AS:123\r\n') !== -1);
  test.done();
},

'getVideoMode': function(test) {
  test.strictEqual(description.getVideoMode(), ExSIP_C.SENDRECV);
  test.done();
},
'getVideoMode without video mode': function(test) {
  createDescription({withoutVideoMode: true});
  test.strictEqual(description.getVideoMode(), null);
  test.done();
},
'getVideoMode with video mode inactive': function(test) {
  createDescription({videoMode: ExSIP_C.INACTIVE});
  test.strictEqual(description.getVideoMode(), ExSIP_C.INACTIVE);
  test.done();
},
'getVideoMode with video mode recvonly': function(test) {
  createDescription({videoMode: ExSIP_C.RECVONLY});
  test.strictEqual(description.getVideoMode(), ExSIP_C.RECVONLY);
  test.done();
},
'getVideoMode with video mode sendonly': function(test) {
  createDescription({videoMode: ExSIP_C.INACTIVE});
  test.strictEqual(description.getVideoMode(), ExSIP_C.INACTIVE);
  test.done();
},

'setVideoMode': function(test) {
  createDescription({videoMode: ExSIP_C.SENDRECV});
  description.setVideoMode(ExSIP_C.INACTIVE);
  test.strictEqual(description.getVideoMode(), ExSIP_C.INACTIVE);
  test.strictEqual(description.getAudioMode(), ExSIP_C.SENDRECV);
  test.done();
},
'setVideoMode without video mode': function(test) {
  createDescription({withoutVideoMode: true});
  description.setVideoMode(ExSIP_C.INACTIVE);
  test.strictEqual(description.getVideoMode(), ExSIP_C.INACTIVE);
  test.strictEqual(description.getAudioMode(), ExSIP_C.SENDRECV);
  test.done();
},
'setVideoMode without video mode and withoutVideoConnection': function(test) {
  createDescription({withoutVideoMode: true, withoutVideoConnection: true});
  description.setVideoMode(ExSIP_C.INACTIVE);
  test.strictEqual(description.getVideoMode(), ExSIP_C.INACTIVE);
  test.strictEqual(description.getAudioMode(), ExSIP_C.SENDRECV);
  test.done();
},

'getAudioMode': function(test) {
  test.strictEqual(description.getAudioMode(), ExSIP_C.SENDRECV);
  test.done();
},
'getAudioMode without audio mode': function(test) {
  createDescription({withoutAudioMode: true});
  test.strictEqual(description.getAudioMode(), null);
  test.done();
},
'getAudioMode with audio mode inactive': function(test) {
  createDescription({audioMode: ExSIP_C.INACTIVE});
  test.strictEqual(description.getAudioMode(), ExSIP_C.INACTIVE);
  test.done();
},
'getAudioMode with audio mode recvonly': function(test) {
  createDescription({audioMode: ExSIP_C.RECVONLY});
  test.strictEqual(description.getAudioMode(), ExSIP_C.RECVONLY);
  test.done();
},
'getAudioMode with audio mode sendonly': function(test) {
  createDescription({audioMode: ExSIP_C.SENDONLY});
  test.strictEqual(description.getAudioMode(), ExSIP_C.SENDONLY);
  test.done();
},

'setAudioPort': function(test) {
  test.strictEqual(description.audioPort(), "16550");
  description.setAudioPort("0");
  test.strictEqual(description.audioPort(), "0");
  test.done();
},
'setAudioMode': function(test) {
  createDescription({videoMode: ExSIP_C.SENDRECV});
  description.setAudioMode(ExSIP_C.INACTIVE);
  test.strictEqual(description.getAudioMode(), ExSIP_C.INACTIVE);
  test.strictEqual(description.getVideoMode(), ExSIP_C.SENDRECV);
  test.done();
},
'setAudioMode without audio mode': function(test) {
  createDescription({withoutAudioMode: true});
  description.setAudioMode(ExSIP_C.INACTIVE);
  test.strictEqual(description.getAudioMode(), ExSIP_C.INACTIVE);
  test.strictEqual(description.getVideoMode(), ExSIP_C.SENDRECV);
  test.done();
},
'setAudioMode without audio mode and withoutAudioConnection': function(test) {
  createDescription({withoutAudioMode: true, withoutAudioConnection: true});
  description.setAudioMode(ExSIP_C.INACTIVE);
  test.strictEqual(description.getAudioMode(), ExSIP_C.INACTIVE);
  test.strictEqual(description.getVideoMode(), ExSIP_C.SENDRECV);
  test.done();
},

'getAudioFingerprint': function(test) {
  test.strictEqual(description.getAudioFingerprint(), "sha-256 B1:1D:38:90:8F:72:85:60:AD:10:9F:BB:F5:78:47:AB:A8:DF:01:FA:50:D3:73:C9:20:3D:B4:C0:36:C2:08:29");
  test.done();
},
'getVideoFingerprint': function(test) {
  test.strictEqual(description.getVideoFingerprint(), "sha-256 B1:1D:38:90:8F:72:85:60:AD:10:9F:BB:F5:78:47:AB:A8:DF:01:FA:50:D3:73:C9:20:3D:B4:C0:36:C2:08:30");
  test.done();
},

'removeVideoFingerprint': function(test) {
  description.removeVideoFingerprint();
  test.strictEqual(description.getAudioFingerprint(), "sha-256 B1:1D:38:90:8F:72:85:60:AD:10:9F:BB:F5:78:47:AB:A8:DF:01:FA:50:D3:73:C9:20:3D:B4:C0:36:C2:08:29");
  test.strictEqual(description.getVideoFingerprint(), null);
  test.strictEqual(description.sdp.indexOf('\r\n\r\n'), -1, "should not generate empty sdp lines");
  test.done();
},
'removeAudioFingerprint': function(test) {
  description.removeAudioFingerprint();
  test.strictEqual(description.getAudioFingerprint(), null);
  test.strictEqual(description.getVideoFingerprint(), "sha-256 B1:1D:38:90:8F:72:85:60:AD:10:9F:BB:F5:78:47:AB:A8:DF:01:FA:50:D3:73:C9:20:3D:B4:C0:36:C2:08:30");
  test.strictEqual(description.sdp.indexOf('\r\n\r\n'), -1, "should not generate empty sdp lines");
  test.done();
},

'mediaChanges with same sdp': function(test) {
  var otherSdp = testUA.createDescription();
  test.deepEqual(description.mediaChanges(otherSdp), []);
  test.done();
},
'mediaChanges without video': function(test) {
  var otherSdp = testUA.createDescription({withoutVideo: true});
  test.deepEqual(description.mediaChanges(otherSdp), ["video has changed",
    "video port has changed : 16930 - null",
    "video connection has changed : IN IP4 10.48.1.33 - IN IP4 10.48.1.13",
    "video codecs has changed : 99,109,34 - null",
    "video codec rtpmap for 99 has changed : H264/90000 - null",
    "video codec rtpmap for 109 has changed : H264/90000 - null",
    "video codec rtpmap for 34 has changed : H263/90000 - null",
    ]);
  test.done();
},
'mediaChanges without audio': function(test) {
  var otherSdp = testUA.createDescription({withoutAudio: true});
  test.deepEqual(description.mediaChanges(otherSdp), ["audio has changed",
    "audio port has changed : 16550 - null",
    "audio connection has changed : IN IP4 10.48.1.23 - IN IP4 10.48.1.13",
    "audio codecs has changed : 9,126 - null",
    "audio codec rtpmap for 9 has changed : G722/8000 - null",
    "audio codec rtpmap for 126 has changed : telephone-event/8000 - null"
    ]);
  test.done();
},
'mediaChanges with different audio port ': function(test) {
  var otherSdp = testUA.createDescription({audioPort: "123"});
  test.deepEqual(description.mediaChanges(otherSdp), ["audio port has changed : 16550 - 123"]);
  test.done();
},
'mediaChanges with different video port ': function(test) {
  var otherSdp = testUA.createDescription({videoPort: "123"});
  test.deepEqual(description.mediaChanges(otherSdp), ["video port has changed : 16930 - 123"]);
  test.done();
},
'mediaChanges with different audio connection': function(test) {
  var otherSdp = testUA.createDescription({audioIP: "1.2.3.4"});
  test.deepEqual(description.mediaChanges(otherSdp), ["audio connection has changed : IN IP4 10.48.1.23 - IN IP4 1.2.3.4"]);
  test.done();
},
'mediaChanges with different video connection': function(test) {
  var otherSdp = testUA.createDescription({videoIP: "1.2.3.4"});
  test.deepEqual(description.mediaChanges(otherSdp), ["video connection has changed : IN IP4 10.48.1.33 - IN IP4 1.2.3.4"]);
  test.done();
},
'mediaChanges with different audio mode': function(test) {
  var otherSdp = testUA.createDescription({audioMode: ExSIP_C.RECVONLY});
  test.deepEqual(description.mediaChanges(otherSdp), []);
  test.done();
},
'mediaChanges with different video mode': function(test) {
  var otherSdp = testUA.createDescription({videoMode: ExSIP_C.RECVONLY});
  test.deepEqual(description.mediaChanges(otherSdp), []);
  test.done();
},
'mediaChanges with same audio codecs in different order': function(test) {
  var otherSdp = testUA.createDescription({audioCodecs: "126 9"});
  test.deepEqual(description.mediaChanges(otherSdp), []);
  test.done();
},
'mediaChanges with different audio codecs': function(test) {
  var otherSdp = testUA.createDescription({audioCodecs: "1 2 3 4"});
  test.deepEqual(description.mediaChanges(otherSdp), ["audio codecs has changed : 9,126 - 1,2,3,4"]);
  test.done();
},
'mediaChanges with same video codecs in different order': function(test) {
  var otherSdp = testUA.createDescription({videoCodecs: "34 99 109"});
  test.deepEqual(description.mediaChanges(otherSdp), []);
  test.done();
},
'mediaChanges with different video codecs': function(test) {
  var otherSdp = testUA.createDescription({videoCodecs: "1 2 3 4"});
  test.deepEqual(description.mediaChanges(otherSdp), ["video codecs has changed : 99,109,34 - 1,2,3,4"]);
  test.done();
},
'mediaChanges with different audio codec rtpmap': function(test) {
  var otherSdp = testUA.createDescription({audioCodec9Rtpmap: "difference"});
  test.deepEqual(description.mediaChanges(otherSdp), ["audio codec rtpmap for 9 has changed : G722/8000 - difference"]);
  test.done();
},
'mediaChanges with different video codec rtpmap': function(test) {
  var otherSdp = testUA.createDescription({videoCodec99Rtpmap: "difference"});
  test.deepEqual(description.mediaChanges(otherSdp), ["video codec rtpmap for 99 has changed : H264/90000 - difference"]);
  test.done();
},
'mediaChanges with different audio codec fmtp': function(test) {
  var otherSdp = testUA.createDescription({audioCodec126Fmtp: "difference"});
  test.deepEqual(description.mediaChanges(otherSdp), []);
  test.done();
},
'mediaChanges with different video codec fmtp': function(test) {
  var otherSdp = testUA.createDescription({videoCodec99Fmtp: "difference"});
  test.deepEqual(description.mediaChanges(otherSdp), []);
  test.done();
},
'same media in sdps': function(test) {
  var sdp1 = new WebRTC.RTCSessionDescription({type: "answer",
    sdp: "v=0\r\n"+
    "o=- 1391106329 1 IN IP4 127.0.0.1\r\n"+
      "s=-\r\n"+
    "t=0 0\r\n"+
      "a=msid-semantic: WMS default\r\n"+
    "m=audio 1024 RTP/SAVPF 0 126\r\n"+
      "c=IN IP4 204.117.64.113\r\n"+
    "a=rtcp:1 IN IP4 0.0.0.0\r\n"+
      "a=candidate:0 1 udp 2113929216 204.117.64.113 1024 typ host generation 0\r\n"+
    "a=ice-ufrag:J4KnaxVSyoj3Ye8g\r\n"+
      "a=ice-pwd:mB7bsodVNN4S8P4HjlNjIVle\r\n"+
    "a=mid:audio\r\n"+
      "a=sendrecv\r\n"+
    "a=rtcp-mux\r\n"+
      "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:GLhvp8wuIH+XAHlg5bZnexJF1lJOBT6KaCm/aajs\r\n"+
    "a=rtpmap:0 PCMU/8000\r\n"+
      "a=rtpmap:126 telephone-event/8000\r\n"+
    "a=ssrc:1876041 cname:xv7WdxHDi0PZpBlq\r\n"+
      "a=ssrc:1876041 msid:default 0ywDK3S2\r\n"+
    "a=ssrc:1876041 mslabel:default\r\n"+
      "a=ssrc:1876041 label:0ywDK3S2\r\n"+
    "m=video 1026 RTP/SAVPF 100\r\n"+
      "c=IN IP4 204.117.64.113\r\n"+
    "a=rtcp:1 IN IP4 0.0.0.0\r\n"+
      "a=candidate:0 1 udp 2113929216 204.117.64.113 1026 typ host generation 0\r\n"+
    "a=ice-ufrag:YB6Uixe4rl7bnwZe\r\n"+
      "a=ice-pwd:6i470lUgbIBuYK96x2CjDLr2\r\n"+
    "a=mid:video\r\n"+
      "a=sendrecv\r\n"+
    "b=AS:128\r\n"+
      "a=rtcp-mux\r\n"+
    "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:GLhvp8wuIH+XAHlg5bZnexJF1lJOBT6KaCm/aajs\r\n"+
      "a=rtpmap:100 VP8/90000\r\n"+
    "a=rtcp-fb:100 ccm fir\r\n"+
      "a=rtcp-fb:100 nack\r\n"+
    "a=rtcp-fb:100 nack pli\r\n"+
      "a=rtcp-fb:100 goog-remb\r\n"+
    "a=ssrc:4282520567 cname:hxYyi5gkOW8LOWfk\r\n"+
      "a=ssrc:4282520567 msid:default Lf9OhWbx\r\n"+
    "a=ssrc:4282520567 mslabel:default\r\n"+
      "a=ssrc:4282520567 label:Lf9OhWbx"});

  var sdp2 = new WebRTC.RTCSessionDescription({type: "answer",
    sdp: "v=0\r\n"+
      "o=BroadWorks 1391106387 2 IN IP4 204.117.64.113\r\n"+
  "s=V79Z4YK9HdshXdoMNcHW\r\n"+
  "c=IN IP4 204.117.64.113\r\n"+
  "t=0 0\r\n"+
  "m=audio 1024 RTP/SAVPF 0 126\r\n"+
  "c=IN IP4 204.117.64.113\r\n"+
  "a=rtpmap:0 PCMU/8000\r\n"+
  "a=rtpmap:126 telephone-event/8000\r\n"+
  "a=fmtp:126 0-15\r\n"+
  "a=rtcp-mux\r\n"+
  "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:COC/s3LiY4fOUr1uvCwcIZZRsdf6a2fVGYDWmwzk\r\n"+
  "a=ice-ufrag:Gr0TLKM0XWO6a2sH\r\n"+
  "a=ice-pwd:LK6mcpBHRDcFBVhruyX6aFHQ\r\n"+
  "a=ssrc:4287743560 cname:FLjBfoMD5Dl33c8V\r\n"+
  "a=candidate:0 1 udp 2113929216 204.117.64.113 1024 typ host\r\n"+
  "m=video 1026 RTP/SAVPF 100\r\n"+
  "c=IN IP4 204.117.64.113\r\n"+
  "a=rtpmap:100 VP8/90000\r\n"+
  "a=rtcp-mux\r\n"+
  "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:COC/s3LiY4fOUr1uvCwcIZZRsdf6a2fVGYDWmwzk\r\n"+
  "a=rtcp-fb:100 ccm fir\r\n"+
  "a=rtcp-fb:100 nack\r\n"+
  "a=rtcp-fb:100 nack pli\r\n"+
  "a=rtcp-fb:100 goog-remb\r\n"+
  "a=ice-ufrag:96oqSyZa9NhvyR0g\r\n"+
  "a=ice-pwd:yJfvsLYkntfA8jNjsk2BvWYo\r\n"+
  "a=ssrc:3321204 cname:r30iaTYBSwATl21r\r\n"+
  "a=candidate:0 1 udp 2113929216 204.117.64.113 1026 typ host"
  });

  test.deepEqual(sdp1.mediaChanges(sdp2), []);

  test.done();
},
'remove unsupported media': function(test) {
  var sdp = new WebRTC.RTCSessionDescription({type: "answer",
    sdp: "v=0\r\n"+
      "o=BroadWorks 1403000323 2 IN IP4 50.205.128.35\r\n"+
  "s=3QZDfXi3npfdoo8JD5cK\r\n"+
  "t=0 0\r\n"+
  "a=fingerprint:sha-256 78:AB:95:B1:71:11:0D:F8:19:71:CD:A3:34:AC:1C:1C:04:EA:B0:75:F4:AA:D2:A7:13:46:37:18:E4:0F:82:20\r\n"+
  "m=audio 20000 RTP/SAVPF 0 126\r\n"+
  "c=IN IP4 50.205.128.35\r\n"+
  "a=rtpmap:0 PCMU/8000\r\n"+
  "a=rtpmap:126 telephone-event/8000\r\n"+
  "a=fmtp:126 0-15\r\n"+
  "a=rtcp-mux\r\n"+
  "a=ice-ufrag:ooodxqdXNM4vpoHm\r\n"+
  "a=ice-pwd:wdlhcIeZTxLcAXu8ECFhyYrv\r\n"+
  "a=ssrc:4293493217 cname:kwDMSaVkunDgcnI7\r\n"+
  "a=candidate:0 1 udp 2113929216 50.205.128.35 20000 typ host\r\n"+
  "m=video 20002 RTP/SAVPF 100\r\n"+
  "c=IN IP4 50.205.128.35\r\n"+
  "b=AS:512\r\n"+
  "a=rtpmap:100 VP8/90000\r\n"+
  "a=rtcp-mux\r\n"+
  "a=content:main\r\n"+
  "a=rtcp-fb:100 ccm fir\r\n"+
  "a=rtcp-fb:100 nack\r\n"+
  "a=rtcp-fb:100 nack pli\r\n"+
  "a=rtcp-fb:100 goog-remb\r\n"+
  "a=ice-ufrag:sS1wdXoLV0Cza48E\r\n"+
  "a=ice-pwd:6c8UAuWsUR9tY3l2Luz68F7T\r\n"+
  "a=ssrc:11284924 cname:6DR4CBW98sFko1D2\r\n"+
  "a=candidate:0 1 udp 2113929216 50.205.128.35 20002 typ host\r\n"+
  "m=video 0 RTP/SAVPF 99\r\n"+
  "a=rtpmap:99 H264/90000\r\n"+
  "a=inactive\r\n"+
  "a=content:slides\r\n"+
  "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:Gi8HeSTpye8o7zuO9h8X9gXawqULMLewfxMO0S69\r\n"+
  "m=application 0 RTP/SAVPF\r\n"+
  "a=inactive\r\n"+
  "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:Gi8HeSTpye8o7zuO9h8X9gXawqULMLewfxMO0S69\r\n"+
  "m=application 0 RTP/SAVPF\r\n"+
  "a=inactive\r\n"+
  "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:Gi8HeSTpye8o7zuO9h8X9gXawqULMLewfxMO0S69"});

  var expectedSdp = "v=0\r\n"+
      "o=BroadWorks 1403000323 2 IN IP4 50.205.128.35\r\n"+
      "s=3QZDfXi3npfdoo8JD5cK\r\n"+
      "t=0 0\r\n"+
      "a=fingerprint:sha-256 78:AB:95:B1:71:11:0D:F8:19:71:CD:A3:34:AC:1C:1C:04:EA:B0:75:F4:AA:D2:A7:13:46:37:18:E4:0F:82:20\r\n"+
      "m=audio 20000 RTP/SAVPF 0 126\r\n"+
      "c=IN IP4 50.205.128.35\r\n"+
      "a=rtpmap:0 PCMU/8000\r\n"+
      "a=rtpmap:126 telephone-event/8000\r\n"+
      "a=fmtp:126 0-15\r\n"+
      "a=rtcp-mux\r\n"+
      "a=ice-ufrag:ooodxqdXNM4vpoHm\r\n"+
      "a=ice-pwd:wdlhcIeZTxLcAXu8ECFhyYrv\r\n"+
      "a=ssrc:4293493217 cname:kwDMSaVkunDgcnI7\r\n"+
      "a=candidate:0 1 udp 2113929216 50.205.128.35 20000 typ host\r\n"+
      "m=video 20002 RTP/SAVPF 100\r\n"+
      "c=IN IP4 50.205.128.35\r\n"+
      "b=AS:512\r\n"+
      "a=rtpmap:100 VP8/90000\r\n"+
      "a=rtcp-mux\r\n"+
      "a=content:main\r\n"+
      "a=rtcp-fb:100 ccm fir\r\n"+
      "a=rtcp-fb:100 nack\r\n"+
      "a=rtcp-fb:100 nack pli\r\n"+
      "a=rtcp-fb:100 goog-remb\r\n"+
      "a=ice-ufrag:sS1wdXoLV0Cza48E\r\n"+
      "a=ice-pwd:6c8UAuWsUR9tY3l2Luz68F7T\r\n"+
      "a=ssrc:11284924 cname:6DR4CBW98sFko1D2\r\n"+
      "a=candidate:0 1 udp 2113929216 50.205.128.35 20002 typ host\r\n";

  sdp.removeUnsupportedMedia();
  test.strictEqual(sdp.sdp, expectedSdp);

  test.done();
}
}

function createDescription(options){
  description = testUA.createDescription(options);
}
