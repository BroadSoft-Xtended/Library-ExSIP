module( "ExSIP.WebRTC.RTCSessionDescription", {
  setup: function() {
    createDescription();
  }, teardown: function() {
  }
});

test('getCodecs', function() {
  deepEqual(description.getAudioCodecs(), ["9", "126"]);
  deepEqual(description.getVideoCodecs(), ["99", "109", "34"]);
});
test('getCodecs without video', function() {
  createDescription({withoutVideo: true});
  deepEqual(description.getVideoCodecs(), null);
});
test('getCodecs without audio', function() {
  createDescription({withoutAudio: true});
  deepEqual(description.getAudioCodecs(), null);
});

test('getIceUfrag', function() {
  deepEqual(description.getAudioIceUfrag(), "pXHmklEbg7WBL95R");
  deepEqual(description.getVideoIceUfrag(), "Q8QVGvJo7iPUnNoG");
});
test('getIceUfrag without video', function() {
  createDescription({withoutVideoIceUfrag: true});
  deepEqual(description.getVideoIceUfrag(), null);
});
test('getIceUfrag without audio', function() {
  createDescription({withoutAudioIceUfrag: true});
  deepEqual(description.getAudioIceUfrag(), null);
});

test('getIcePwd', function() {
  deepEqual(description.getAudioIcePwd(), "KJa5PdOffxkQ7NtyroEPwzZY");
  deepEqual(description.getVideoIcePwd(), "Tnws80Vq98O3THLRXLqjWnOf");
});
test('getIceUfrag without video', function() {
  createDescription({withoutVideoIcePwd: true});
  deepEqual(description.getVideoIcePwd(), null);
});
test('getIceUfrag without audio', function() {
  createDescription({withoutAudioIcePwd: true});
  deepEqual(description.getAudioIcePwd(), null);
});

test('getCodecRtpmap', function() {
  deepEqual(description.getAudioCodecRtpmap("9"), "G722/8000");
  deepEqual(description.getAudioCodecRtpmap("126"), "telephone-event/8000");
  deepEqual(description.getVideoCodecRtpmap("99"), "H264/90000");
  deepEqual(description.getVideoCodecRtpmap("109"), "H264/90000");
  deepEqual(description.getVideoCodecRtpmap("34"), "H263/90000");
});
test('getCodecRtpmap without video', function() {
  createDescription({withoutVideoCodecRtpmap: true});
  deepEqual(description.getVideoCodecRtpmap("99"), null);
});
test('getCodecRtpmap without audio', function() {
  createDescription({withoutAudioCodecRtpmap: true});
  deepEqual(description.getAudioCodecRtpmap("9"), null);
});

test('getCodecFmtp', function() {
  deepEqual(description.getAudioCodecFmtp("9"), null);
  deepEqual(description.getAudioCodecFmtp("126"), "0-15");
  deepEqual(description.getVideoCodecFmtp("99"), "profile-level-id=42801E; packetization-mode=0");
  deepEqual(description.getVideoCodecFmtp("109"), "profile-level-id=42801E; packetization-mode=0");
  deepEqual(description.getVideoCodecFmtp("34"), "CIF=1;QCIF=1;SQCIF=1");
});
test('getCodecFmtp without video', function() {
  createDescription({withoutVideoCodecFmtp: true});
  deepEqual(description.getVideoCodecFmtp("99"), null);
});
test('getCodecFmtp without audio', function() {
  createDescription({withoutAudioCodecFmtp: true});
  deepEqual(description.getAudioCodecFmtp("9"), null);
});

test('getConnections', function() {
  strictEqual(description.getConnection(), "IN IP4 10.48.1.13");
  strictEqual(description.getAudioConnection(), "IN IP4 10.48.1.23");
  strictEqual(description.getVideoConnection(), "IN IP4 10.48.1.33");
});
test('getConnections without video connection', function() {
  createDescription({withoutVideoConnection: true});
  strictEqual(description.getConnection(), "IN IP4 10.48.1.13");
  strictEqual(description.getAudioConnection(), "IN IP4 10.48.1.23");
  strictEqual(description.getVideoConnection(), "IN IP4 10.48.1.13");
});
test('getConnections without audio connection', function() {
  createDescription({withoutAudioConnection: true});
  strictEqual(description.getConnection(), "IN IP4 10.48.1.13");
  strictEqual(description.getAudioConnection(), "IN IP4 10.48.1.13");
  strictEqual(description.getVideoConnection(), "IN IP4 10.48.1.33");
});
test('getConnections without audio and video connection', function() {
  createDescription({withoutAudioConnection: true, withoutVideoConnection: true});
  strictEqual(description.getConnection(), "IN IP4 10.48.1.13");
  strictEqual(description.getAudioConnection(), "IN IP4 10.48.1.13");
  strictEqual(description.getVideoConnection(), "IN IP4 10.48.1.13");
});

test('setConnections', function() {
  description.setAudioConnection("IN IP4 10.48.1.43");
  description.setVideoConnection("IN IP4 10.48.1.53");
  strictEqual(description.getConnection(), "IN IP4 10.48.1.13");
  strictEqual(description.getAudioConnection(), "IN IP4 10.48.1.43");
  strictEqual(description.getVideoConnection(), "IN IP4 10.48.1.53");
});

test('setRtcp', function() {
  strictEqual(description.getAudioRtcp(), "55761 IN IP4 181.189.138.18");
  strictEqual(description.getVideoRtcp(), "55762 IN IP4 181.189.138.18");
  description.setAudioRtcp("12345 IN IP4 10.0.1.2");
  description.setVideoRtcp("23456 IN IP4 11.1.2.3");
  strictEqual(description.getAudioRtcp(), "12345 IN IP4 10.0.1.2");
  strictEqual(description.getVideoRtcp(), "23456 IN IP4 11.1.2.3");
});

test('getCandidates', function() {
  deepEqual(description.getAudioCandidates(), ["3355351182 1 udp 2113937151 10.0.2.1 59436 typ host generation 0",
                                               "3355351182 2 udp 2113937151 10.0.2.1 59436 typ host generation 0"]);
});

test('hasActiveVideo', function() {
  ok(description.hasActiveVideo());
});
test('hasActiveVideo without m=video', function() {
  createDescription({withoutVideo: true});
  ok(!description.hasActiveVideo());
});
test('hasActiveVideo with 0 video port', function() {
  createDescription({videoPort: "0"});
  ok(!description.hasActiveVideo());
});
test('hasActiveVideo with 0.0.0.0 video IP', function() {
  createDescription({videoIP: "0.0.0.0"});
  ok(!description.hasActiveVideo());
});

test('hasActiveAudio', function() {
  ok(description.hasActiveAudio());
});
test('hasActiveAudio without m=audio', function() {
  createDescription({withoutAudio: true});
  ok(!description.hasActiveAudio());
});
test('hasActiveAudio with 0 audio port', function() {
  createDescription({audioPort: "0"});
  ok(!description.hasActiveAudio());
});
test('hasActiveAudio with 0.0.0.0 audio IP', function() {
  createDescription({audioIP: "0.0.0.0"});
  ok(!description.hasActiveAudio());
});

test('setVideoBandwidth', function() {
  description.setVideoBandwidth("123");
  strictEqual(description.getVideoBandwidth(), "123");
});
test('setVideoPort', function() {
  strictEqual(description.videoPort(), "16930");
  description.setVideoPort("0");
  strictEqual(description.videoPort(), "0");
});
test('setVideoBandwidth without video bandwidth', function() {
  createDescription({withoutVideoBandwidth: true});
  description.setVideoBandwidth("123");
  strictEqual(description.getVideoBandwidth(), "123");
});
test('setVideoBandwidth without video bandwidth', function() {
  createDescription({withoutVideoBandwidth: true});
  description.setVideoBandwidth("123");
  strictEqual(description.getVideoBandwidth(), "123");
});
test('setVideoBandwidth without video connection', function() {
  createDescription({withoutVideoConnection: true});
  description.setVideoBandwidth("123");
  strictEqual(description.getVideoBandwidth(), "123");
  ok(description.sdp.indexOf('m=video 16930 RTP/AVP 99 109 34\r\nb=AS:123\r\n') !== -1);
});

test('getVideoMode', function() {
  strictEqual(description.getVideoMode(), ExSIP.C.SENDRECV);
});
test('getVideoMode without video mode', function() {
  createDescription({withoutVideoMode: true});
  strictEqual(description.getVideoMode(), null);
});
test('getVideoMode with video mode inactive', function() {
  createDescription({videoMode: ExSIP.C.INACTIVE});
  strictEqual(description.getVideoMode(), ExSIP.C.INACTIVE);
});
test('getVideoMode with video mode recvonly', function() {
  createDescription({videoMode: ExSIP.C.RECVONLY});
  strictEqual(description.getVideoMode(), ExSIP.C.RECVONLY);
});
test('getVideoMode with video mode sendonly', function() {
  createDescription({videoMode: ExSIP.C.INACTIVE});
  strictEqual(description.getVideoMode(), ExSIP.C.INACTIVE);
});

test('setVideoMode', function() {
  createDescription({videoMode: ExSIP.C.SENDRECV});
  description.setVideoMode(ExSIP.C.INACTIVE);
  strictEqual(description.getVideoMode(), ExSIP.C.INACTIVE);
  strictEqual(description.getAudioMode(), ExSIP.C.SENDRECV);
});
test('setVideoMode without video mode', function() {
  createDescription({withoutVideoMode: true});
  description.setVideoMode(ExSIP.C.INACTIVE);
  strictEqual(description.getVideoMode(), ExSIP.C.INACTIVE);
  strictEqual(description.getAudioMode(), ExSIP.C.SENDRECV);
});
test('setVideoMode without video mode and withoutVideoConnection', function() {
  createDescription({withoutVideoMode: true, withoutVideoConnection: true});
  description.setVideoMode(ExSIP.C.INACTIVE);
  strictEqual(description.getVideoMode(), ExSIP.C.INACTIVE);
  strictEqual(description.getAudioMode(), ExSIP.C.SENDRECV);
});

test('getAudioMode', function() {
  strictEqual(description.getAudioMode(), ExSIP.C.SENDRECV);
});
test('getAudioMode without audio mode', function() {
  createDescription({withoutAudioMode: true});
  strictEqual(description.getAudioMode(), null);
});
test('getAudioMode with audio mode inactive', function() {
  createDescription({audioMode: ExSIP.C.INACTIVE});
  strictEqual(description.getAudioMode(), ExSIP.C.INACTIVE);
});
test('getAudioMode with audio mode recvonly', function() {
  createDescription({audioMode: ExSIP.C.RECVONLY});
  strictEqual(description.getAudioMode(), ExSIP.C.RECVONLY);
});
test('getAudioMode with audio mode sendonly', function() {
  createDescription({audioMode: ExSIP.C.SENDONLY});
  strictEqual(description.getAudioMode(), ExSIP.C.SENDONLY);
});

test('setAudioPort', function() {
  strictEqual(description.audioPort(), "16550");
  description.setAudioPort("0");
  strictEqual(description.audioPort(), "0");
});
test('setAudioMode', function() {
  createDescription({videoMode: ExSIP.C.SENDRECV});
  description.setAudioMode(ExSIP.C.INACTIVE);
  strictEqual(description.getAudioMode(), ExSIP.C.INACTIVE);
  strictEqual(description.getVideoMode(), ExSIP.C.SENDRECV);
});
test('setAudioMode without audio mode', function() {
  createDescription({withoutAudioMode: true});
  description.setAudioMode(ExSIP.C.INACTIVE);
  strictEqual(description.getAudioMode(), ExSIP.C.INACTIVE);
  strictEqual(description.getVideoMode(), ExSIP.C.SENDRECV);
});
test('setAudioMode without audio mode and withoutAudioConnection', function() {
  createDescription({withoutAudioMode: true, withoutAudioConnection: true});
  description.setAudioMode(ExSIP.C.INACTIVE);
  strictEqual(description.getAudioMode(), ExSIP.C.INACTIVE);
  strictEqual(description.getVideoMode(), ExSIP.C.SENDRECV);
});

test('getAudioFingerprint', function() {
  strictEqual(description.getAudioFingerprint(), "sha-256 B1:1D:38:90:8F:72:85:60:AD:10:9F:BB:F5:78:47:AB:A8:DF:01:FA:50:D3:73:C9:20:3D:B4:C0:36:C2:08:29");
});
test('getVideoFingerprint', function() {
  strictEqual(description.getVideoFingerprint(), "sha-256 B1:1D:38:90:8F:72:85:60:AD:10:9F:BB:F5:78:47:AB:A8:DF:01:FA:50:D3:73:C9:20:3D:B4:C0:36:C2:08:30");
});

test('removeVideoFingerprint', function() {
  description.removeVideoFingerprint();
  strictEqual(description.getAudioFingerprint(), "sha-256 B1:1D:38:90:8F:72:85:60:AD:10:9F:BB:F5:78:47:AB:A8:DF:01:FA:50:D3:73:C9:20:3D:B4:C0:36:C2:08:29");
  strictEqual(description.getVideoFingerprint(), null);
  strictEqual(description.sdp.indexOf('\r\n\r\n'), -1, "should not generate empty sdp lines");
});
test('removeAudioFingerprint', function() {
  description.removeAudioFingerprint();
  strictEqual(description.getAudioFingerprint(), null);
  strictEqual(description.getVideoFingerprint(), "sha-256 B1:1D:38:90:8F:72:85:60:AD:10:9F:BB:F5:78:47:AB:A8:DF:01:FA:50:D3:73:C9:20:3D:B4:C0:36:C2:08:30");
  strictEqual(description.sdp.indexOf('\r\n\r\n'), -1, "should not generate empty sdp lines");
});

test('mediaChanges with same sdp', function() {
  var otherSdp = TestExSIP.Helpers.createDescription();
  deepEqual(description.mediaChanges(otherSdp), []);
});
test('mediaChanges without video', function() {
  var otherSdp = TestExSIP.Helpers.createDescription({withoutVideo: true});
  deepEqual(description.mediaChanges(otherSdp), ["video has changed",
    "video port has changed : 16930 - null",
    "video connection has changed : IN IP4 10.48.1.33 - IN IP4 10.48.1.13",
    "video codecs has changed : 99,109,34 - null",
    "video codec rtpmap for 99 has changed : H264/90000 - null",
    "video codec rtpmap for 109 has changed : H264/90000 - null",
    "video codec rtpmap for 34 has changed : H263/90000 - null",
    ]);
});
test('mediaChanges without audio', function() {
  var otherSdp = TestExSIP.Helpers.createDescription({withoutAudio: true});
  deepEqual(description.mediaChanges(otherSdp), ["audio has changed",
    "audio port has changed : 16550 - null",
    "audio connection has changed : IN IP4 10.48.1.23 - IN IP4 10.48.1.13",
    "audio codecs has changed : 9,126 - null",
    "audio codec rtpmap for 9 has changed : G722/8000 - null",
    "audio codec rtpmap for 126 has changed : telephone-event/8000 - null"
    ]);
});
test('mediaChanges with different audio port ', function() {
  var otherSdp = TestExSIP.Helpers.createDescription({audioPort: "123"});
  deepEqual(description.mediaChanges(otherSdp), ["audio port has changed : 16550 - 123"]);
});
test('mediaChanges with different video port ', function() {
  var otherSdp = TestExSIP.Helpers.createDescription({videoPort: "123"});
  deepEqual(description.mediaChanges(otherSdp), ["video port has changed : 16930 - 123"]);
});
test('mediaChanges with different audio connection', function() {
  var otherSdp = TestExSIP.Helpers.createDescription({audioIP: "1.2.3.4"});
  deepEqual(description.mediaChanges(otherSdp), ["audio connection has changed : IN IP4 10.48.1.23 - IN IP4 1.2.3.4"]);
});
test('mediaChanges with different video connection', function() {
  var otherSdp = TestExSIP.Helpers.createDescription({videoIP: "1.2.3.4"});
  deepEqual(description.mediaChanges(otherSdp), ["video connection has changed : IN IP4 10.48.1.33 - IN IP4 1.2.3.4"]);
});
test('mediaChanges with different audio mode', function() {
  var otherSdp = TestExSIP.Helpers.createDescription({audioMode: ExSIP.C.RECVONLY});
  deepEqual(description.mediaChanges(otherSdp), []);
});
test('mediaChanges with different video mode', function() {
  var otherSdp = TestExSIP.Helpers.createDescription({videoMode: ExSIP.C.RECVONLY});
  deepEqual(description.mediaChanges(otherSdp), []);
});
test('mediaChanges with same audio codecs in different order', function() {
  var otherSdp = TestExSIP.Helpers.createDescription({audioCodecs: "126 9"});
  deepEqual(description.mediaChanges(otherSdp), []);
});
test('mediaChanges with different audio codecs', function() {
  var otherSdp = TestExSIP.Helpers.createDescription({audioCodecs: "1 2 3 4"});
  deepEqual(description.mediaChanges(otherSdp), ["audio codecs has changed : 9,126 - 1,2,3,4"]);
});
test('mediaChanges with same video codecs in different order', function() {
  var otherSdp = TestExSIP.Helpers.createDescription({videoCodecs: "34 99 109"});
  deepEqual(description.mediaChanges(otherSdp), []);
});
test('mediaChanges with different video codecs', function() {
  var otherSdp = TestExSIP.Helpers.createDescription({videoCodecs: "1 2 3 4"});
  deepEqual(description.mediaChanges(otherSdp), ["video codecs has changed : 99,109,34 - 1,2,3,4"]);
});
test('mediaChanges with different audio codec rtpmap', function() {
  var otherSdp = TestExSIP.Helpers.createDescription({audioCodec9Rtpmap: "difference"});
  deepEqual(description.mediaChanges(otherSdp), ["audio codec rtpmap for 9 has changed : G722/8000 - difference"]);
});
test('mediaChanges with different video codec rtpmap', function() {
  var otherSdp = TestExSIP.Helpers.createDescription({videoCodec99Rtpmap: "difference"});
  deepEqual(description.mediaChanges(otherSdp), ["video codec rtpmap for 99 has changed : H264/90000 - difference"]);
});
test('mediaChanges with different audio codec fmtp', function() {
  var otherSdp = TestExSIP.Helpers.createDescription({audioCodec126Fmtp: "difference"});
  deepEqual(description.mediaChanges(otherSdp), []);
});
test('mediaChanges with different video codec fmtp', function() {
  var otherSdp = TestExSIP.Helpers.createDescription({videoCodec99Fmtp: "difference"});
  deepEqual(description.mediaChanges(otherSdp), []);
});
test('same media in sdps', function() {
  var sdp1 = new ExSIP.WebRTC.RTCSessionDescription({type: "answer",
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

  var sdp2 = new ExSIP.WebRTC.RTCSessionDescription({type: "answer",
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

  deepEqual(sdp1.mediaChanges(sdp2), []);

});
test('remove unsupported media', function() {
  var sdp = new ExSIP.WebRTC.RTCSessionDescription({type: "answer",
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
  strictEqual(sdp.sdp, expectedSdp);

});

function createDescription(options){
  description = TestExSIP.Helpers.createDescription(options);
}