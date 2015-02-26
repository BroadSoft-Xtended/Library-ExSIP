require('./include/common');
var testUA = require('./include/testUA');
var ExSIP = require('../');
var WebRTC = require('../src/WebRTC');
var ExSIP_C = require('../src/Constants');

describe('RTCSessionDescription', function() {

  beforeEach(function() {
    createDescription();
  });

  it('getCodecs', function() {
    expect(description.getAudioCodecs()).toEqual(["9", "126"]);
    expect(description.getVideoCodecs()).toEqual(["99", "109", "34"]);

  });
  it('getCodecs without video', function() {
    createDescription({
      withoutVideo: true
    });
    expect(description.getVideoCodecs()).toEqual(null);

  });
  it('getCodecs without audio', function() {
    createDescription({
      withoutAudio: true
    });
    expect(description.getAudioCodecs()).toEqual(null);

  });

  it('getIceUfrag', function() {
    expect(description.getAudioIceUfrag()).toEqual("pXHmklEbg7WBL95R");
    expect(description.getVideoIceUfrag()).toEqual("Q8QVGvJo7iPUnNoG");

  });
  it('getIceUfrag without video', function() {
    createDescription({
      withoutVideoIceUfrag: true
    });
    expect(description.getVideoIceUfrag()).toEqual(null);

  });
  it('getIceUfrag without audio', function() {
    createDescription({
      withoutAudioIceUfrag: true
    });
    expect(description.getAudioIceUfrag()).toEqual(null);

  });

  it('getIcePwd', function() {
    expect(description.getAudioIcePwd()).toEqual("KJa5PdOffxkQ7NtyroEPwzZY");
    expect(description.getVideoIcePwd()).toEqual("Tnws80Vq98O3THLRXLqjWnOf");

  });
  it('getIceUfrag without video', function() {
    createDescription({
      withoutVideoIcePwd: true
    });
    expect(description.getVideoIcePwd()).toEqual(null);

  });
  it('getIceUfrag without audio', function() {
    createDescription({
      withoutAudioIcePwd: true
    });
    expect(description.getAudioIcePwd()).toEqual(null);

  });

  it('getCodecRtpmap', function() {
    expect(description.getAudioCodecRtpmap("9")).toEqual("G722/8000");
    expect(description.getAudioCodecRtpmap("126")).toEqual("telephone-event/8000");
    expect(description.getVideoCodecRtpmap("99")).toEqual("H264/90000");
    expect(description.getVideoCodecRtpmap("109")).toEqual("H264/90000");
    expect(description.getVideoCodecRtpmap("34")).toEqual("H263/90000");

  });
  it('getCodecRtpmap without video', function() {
    createDescription({
      withoutVideoCodecRtpmap: true
    });
    expect(description.getVideoCodecRtpmap("99")).toEqual(null);

  });
  it('getCodecRtpmap without audio', function() {
    createDescription({
      withoutAudioCodecRtpmap: true
    });
    expect(description.getAudioCodecRtpmap("9")).toEqual(null);

  });

  it('getCodecFmtp', function() {
    expect(description.getAudioCodecFmtp("9")).toEqual(null);
    expect(description.getAudioCodecFmtp("126")).toEqual("0-15");
    expect(description.getVideoCodecFmtp("99")).toEqual("profile-level-id=42801E; packetization-mode=0");
    expect(description.getVideoCodecFmtp("109")).toEqual("profile-level-id=42801E; packetization-mode=0");
    expect(description.getVideoCodecFmtp("34")).toEqual("CIF=1;QCIF=1;SQCIF=1");

  });
  it('getCodecFmtp without video', function() {
    createDescription({
      withoutVideoCodecFmtp: true
    });
    expect(description.getVideoCodecFmtp("99")).toEqual(null);

  });
  it('getCodecFmtp without audio', function() {
    createDescription({
      withoutAudioCodecFmtp: true
    });
    expect(description.getAudioCodecFmtp("9")).toEqual(null);

  });

  it('getConnections', function() {
    expect(description.getConnection()).toEqual("IN IP4 10.48.1.13");
    expect(description.getAudioConnection()).toEqual("IN IP4 10.48.1.23");
    expect(description.getVideoConnection()).toEqual("IN IP4 10.48.1.33");

  });
  it('getConnections without video connection', function() {
    createDescription({
      withoutVideoConnection: true
    });
    expect(description.getConnection()).toEqual("IN IP4 10.48.1.13");
    expect(description.getAudioConnection()).toEqual("IN IP4 10.48.1.23");
    expect(description.getVideoConnection()).toEqual("IN IP4 10.48.1.13");

  });
  it('getConnections without audio connection', function() {
    createDescription({
      withoutAudioConnection: true
    });
    expect(description.getConnection()).toEqual("IN IP4 10.48.1.13");
    expect(description.getAudioConnection()).toEqual("IN IP4 10.48.1.13");
    expect(description.getVideoConnection()).toEqual("IN IP4 10.48.1.33");

  });
  it('getConnections without audio and video connection', function() {
    createDescription({
      withoutAudioConnection: true,
      withoutVideoConnection: true
    });
    expect(description.getConnection()).toEqual("IN IP4 10.48.1.13");
    expect(description.getAudioConnection()).toEqual("IN IP4 10.48.1.13");
    expect(description.getVideoConnection()).toEqual("IN IP4 10.48.1.13");

  });

  it('setConnections', function() {
    description.setAudioConnection("IN IP4 10.48.1.43");
    description.setVideoConnection("IN IP4 10.48.1.53");
    expect(description.getConnection()).toEqual("IN IP4 10.48.1.13");
    expect(description.getAudioConnection()).toEqual("IN IP4 10.48.1.43");
    expect(description.getVideoConnection()).toEqual("IN IP4 10.48.1.53");

  });

  it('setRtcp', function() {
    expect(description.getAudioRtcp()).toEqual("55761 IN IP4 181.189.138.18");
    expect(description.getVideoRtcp()).toEqual("55762 IN IP4 181.189.138.18");
    description.setAudioRtcp("12345 IN IP4 10.0.1.2");
    description.setVideoRtcp("23456 IN IP4 11.1.2.3");
    expect(description.getAudioRtcp()).toEqual("12345 IN IP4 10.0.1.2");
    expect(description.getVideoRtcp()).toEqual("23456 IN IP4 11.1.2.3");

  });

  it('getCandidates', function() {
    expect(description.getAudioCandidates()).toEqual(["3355351182 1 udp 2113937151 10.0.2.1 59436 typ host generation 0",
      "3355351182 2 udp 2113937151 10.0.2.1 59436 typ host generation 0"
    ]);

  });

  it('hasActiveVideo', function() {
    expect(description.hasActiveVideo()).toEqual(true)

  });
  it('hasActiveVideo without m=video', function() {
    createDescription({
      withoutVideo: true
    });
    expect(!description.hasActiveVideo()).toEqual(true)

  });
  it('hasActiveVideo with 0 video port', function() {
    createDescription({
      videoPort: "0"
    });
    expect(!description.hasActiveVideo()).toEqual(true)

  });
  it('hasActiveVideo with 0.0.0.0 video IP', function() {
    createDescription({
      videoIP: "0.0.0.0"
    });
    expect(!description.hasActiveVideo()).toEqual(true)

  });

  it('hasActiveAudio', function() {
    expect(description.hasActiveAudio()).toEqual(true)

  });
  it('hasActiveAudio without m=audio', function() {
    createDescription({
      withoutAudio: true
    });
    expect(!description.hasActiveAudio()).toEqual(true)

  });
  it('hasActiveAudio with 0 audio port', function() {
    createDescription({
      audioPort: "0"
    });
    expect(!description.hasActiveAudio()).toEqual(true)

  });
  it('hasActiveAudio with 0.0.0.0 audio IP', function() {
    createDescription({
      audioIP: "0.0.0.0"
    });
    expect(!description.hasActiveAudio()).toEqual(true)

  });

  it('setVideoBandwidth', function() {
    description.setVideoBandwidth("123");
    expect(description.getVideoBandwidth()).toEqual("123");

  });
  it('setVideoPort', function() {
    expect(description.videoPort()).toEqual("16930");
    description.setVideoPort("0");
    expect(description.videoPort()).toEqual("0");

  });
  it('setVideoBandwidth without video bandwidth', function() {
    createDescription({
      withoutVideoBandwidth: true
    });
    description.setVideoBandwidth("123");
    expect(description.getVideoBandwidth()).toEqual("123");

  });
  it('setVideoBandwidth without video bandwidth', function() {
    createDescription({
      withoutVideoBandwidth: true
    });
    description.setVideoBandwidth("123");
    expect(description.getVideoBandwidth()).toEqual("123");

  });
  it('setVideoBandwidth without video connection', function() {
    createDescription({
      withoutVideoConnection: true
    });
    description.setVideoBandwidth("123");
    expect(description.getVideoBandwidth()).toEqual("123");
    expect(description.sdp.indexOf('m=video 16930 RTP/AVP 99 109 34\r\nb=AS:123\r\n') !== -1).toEqual(true)

  });

  it('getVideoMode', function() {
    expect(description.getVideoMode()).toEqual(ExSIP_C.SENDRECV);

  });
  it('getVideoMode without video mode', function() {
    createDescription({
      withoutVideoMode: true
    });
    expect(description.getVideoMode()).toEqual(null);

  });
  it('getVideoMode with video mode inactive', function() {
    createDescription({
      videoMode: ExSIP_C.INACTIVE
    });
    expect(description.getVideoMode()).toEqual(ExSIP_C.INACTIVE);

  });
  it('getVideoMode with video mode recvonly', function() {
    createDescription({
      videoMode: ExSIP_C.RECVONLY
    });
    expect(description.getVideoMode()).toEqual(ExSIP_C.RECVONLY);

  });
  it('getVideoMode with video mode sendonly', function() {
    createDescription({
      videoMode: ExSIP_C.INACTIVE
    });
    expect(description.getVideoMode()).toEqual(ExSIP_C.INACTIVE);

  });

  it('setVideoMode', function() {
    createDescription({
      videoMode: ExSIP_C.SENDRECV
    });
    description.setVideoMode(ExSIP_C.INACTIVE);
    expect(description.getVideoMode()).toEqual(ExSIP_C.INACTIVE);
    expect(description.getAudioMode()).toEqual(ExSIP_C.SENDRECV);

  });
  it('setVideoMode without video mode', function() {
    createDescription({
      withoutVideoMode: true
    });
    description.setVideoMode(ExSIP_C.INACTIVE);
    expect(description.getVideoMode()).toEqual(ExSIP_C.INACTIVE);
    expect(description.getAudioMode()).toEqual(ExSIP_C.SENDRECV);

  });
  it('setVideoMode without video mode and withoutVideoConnection', function() {
    createDescription({
      withoutVideoMode: true,
      withoutVideoConnection: true
    });
    description.setVideoMode(ExSIP_C.INACTIVE);
    expect(description.getVideoMode()).toEqual(ExSIP_C.INACTIVE);
    expect(description.getAudioMode()).toEqual(ExSIP_C.SENDRECV);

  });

  it('getAudioMode', function() {
    expect(description.getAudioMode()).toEqual(ExSIP_C.SENDRECV);

  });
  it('getAudioMode without audio mode', function() {
    createDescription({
      withoutAudioMode: true
    });
    expect(description.getAudioMode()).toEqual(null);

  });
  it('getAudioMode with audio mode inactive', function() {
    createDescription({
      audioMode: ExSIP_C.INACTIVE
    });
    expect(description.getAudioMode()).toEqual(ExSIP_C.INACTIVE);

  });
  it('getAudioMode with audio mode recvonly', function() {
    createDescription({
      audioMode: ExSIP_C.RECVONLY
    });
    expect(description.getAudioMode()).toEqual(ExSIP_C.RECVONLY);

  });
  it('getAudioMode with audio mode sendonly', function() {
    createDescription({
      audioMode: ExSIP_C.SENDONLY
    });
    expect(description.getAudioMode()).toEqual(ExSIP_C.SENDONLY);

  });

  it('setAudioPort', function() {
    expect(description.audioPort()).toEqual("16550");
    description.setAudioPort("0");
    expect(description.audioPort()).toEqual("0");

  });
  it('setAudioMode', function() {
    createDescription({
      videoMode: ExSIP_C.SENDRECV
    });
    description.setAudioMode(ExSIP_C.INACTIVE);
    expect(description.getAudioMode()).toEqual(ExSIP_C.INACTIVE);
    expect(description.getVideoMode()).toEqual(ExSIP_C.SENDRECV);

  });
  it('setAudioMode without audio mode', function() {
    createDescription({
      withoutAudioMode: true
    });
    description.setAudioMode(ExSIP_C.INACTIVE);
    expect(description.getAudioMode()).toEqual(ExSIP_C.INACTIVE);
    expect(description.getVideoMode()).toEqual(ExSIP_C.SENDRECV);

  });
  it('setAudioMode without audio mode and withoutAudioConnection', function() {
    createDescription({
      withoutAudioMode: true,
      withoutAudioConnection: true
    });
    description.setAudioMode(ExSIP_C.INACTIVE);
    expect(description.getAudioMode()).toEqual(ExSIP_C.INACTIVE);
    expect(description.getVideoMode()).toEqual(ExSIP_C.SENDRECV);

  });

  it('getAudioFingerprint', function() {
    expect(description.getAudioFingerprint()).toEqual("sha-256 B1:1D:38:90:8F:72:85:60:AD:10:9F:BB:F5:78:47:AB:A8:DF:01:FA:50:D3:73:C9:20:3D:B4:C0:36:C2:08:29");

  });
  it('getVideoFingerprint', function() {
    expect(description.getVideoFingerprint()).toEqual("sha-256 B1:1D:38:90:8F:72:85:60:AD:10:9F:BB:F5:78:47:AB:A8:DF:01:FA:50:D3:73:C9:20:3D:B4:C0:36:C2:08:30");

  });

  it('removeVideoFingerprint', function() {
    description.removeVideoFingerprint();
    expect(description.getAudioFingerprint()).toEqual("sha-256 B1:1D:38:90:8F:72:85:60:AD:10:9F:BB:F5:78:47:AB:A8:DF:01:FA:50:D3:73:C9:20:3D:B4:C0:36:C2:08:29");
    expect(description.getVideoFingerprint()).toEqual(null);
    expect(description.sdp.indexOf('\r\n\r\n')).toEqual(-1, "should not generate empty sdp lines");

  });
  it('removeAudioFingerprint', function() {
    description.removeAudioFingerprint();
    expect(description.getAudioFingerprint()).toEqual(null);
    expect(description.getVideoFingerprint()).toEqual("sha-256 B1:1D:38:90:8F:72:85:60:AD:10:9F:BB:F5:78:47:AB:A8:DF:01:FA:50:D3:73:C9:20:3D:B4:C0:36:C2:08:30");
    expect(description.sdp.indexOf('\r\n\r\n')).toEqual(-1, "should not generate empty sdp lines");

  });

  it('mediaChanges with same sdp', function() {
    var otherSdp = testUA.createDescription();
    expect(description.mediaChanges(otherSdp)).toEqual([]);

  });
  it('mediaChanges without video', function() {
    var otherSdp = testUA.createDescription({
      withoutVideo: true
    });
    expect(description.mediaChanges(otherSdp)).toEqual(["video has changed",
      "video port has changed : 16930 - null",
      "video connection has changed : IN IP4 10.48.1.33 - IN IP4 10.48.1.13",
      "video codecs has changed : 99,109,34 - null",
      "video codec rtpmap for 99 has changed : H264/90000 - null",
      "video codec rtpmap for 109 has changed : H264/90000 - null",
      "video codec rtpmap for 34 has changed : H263/90000 - null",
    ]);

  });
  it('mediaChanges without audio', function() {
    var otherSdp = testUA.createDescription({
      withoutAudio: true
    });
    expect(description.mediaChanges(otherSdp)).toEqual(["audio has changed",
      "audio port has changed : 16550 - null",
      "audio connection has changed : IN IP4 10.48.1.23 - IN IP4 10.48.1.13",
      "audio codecs has changed : 9,126 - null",
      "audio codec rtpmap for 9 has changed : G722/8000 - null",
      "audio codec rtpmap for 126 has changed : telephone-event/8000 - null"
    ]);

  });
  it('mediaChanges with different audio port ', function() {
    var otherSdp = testUA.createDescription({
      audioPort: "123"
    });
    expect(description.mediaChanges(otherSdp)).toEqual(["audio port has changed : 16550 - 123"]);

  });
  it('mediaChanges with different video port ', function() {
    var otherSdp = testUA.createDescription({
      videoPort: "123"
    });
    expect(description.mediaChanges(otherSdp)).toEqual(["video port has changed : 16930 - 123"]);

  });
  it('mediaChanges with different audio connection', function() {
    var otherSdp = testUA.createDescription({
      audioIP: "1.2.3.4"
    });
    expect(description.mediaChanges(otherSdp)).toEqual(["audio connection has changed : IN IP4 10.48.1.23 - IN IP4 1.2.3.4"]);

  });
  it('mediaChanges with different video connection', function() {
    var otherSdp = testUA.createDescription({
      videoIP: "1.2.3.4"
    });
    expect(description.mediaChanges(otherSdp)).toEqual(["video connection has changed : IN IP4 10.48.1.33 - IN IP4 1.2.3.4"]);

  });
  it('mediaChanges with different audio mode', function() {
    var otherSdp = testUA.createDescription({
      audioMode: ExSIP_C.RECVONLY
    });
    expect(description.mediaChanges(otherSdp)).toEqual([]);

  });
  it('mediaChanges with different video mode', function() {
    var otherSdp = testUA.createDescription({
      videoMode: ExSIP_C.RECVONLY
    });
    expect(description.mediaChanges(otherSdp)).toEqual([]);

  });
  it('mediaChanges with same audio codecs in different order', function() {
    var otherSdp = testUA.createDescription({
      audioCodecs: "126 9"
    });
    expect(description.mediaChanges(otherSdp)).toEqual([]);

  });
  it('mediaChanges with different audio codecs', function() {
    var otherSdp = testUA.createDescription({
      audioCodecs: "1 2 3 4"
    });
    expect(description.mediaChanges(otherSdp)).toEqual(["audio codecs has changed : 9,126 - 1,2,3,4"]);

  });
  it('mediaChanges with same video codecs in different order', function() {
    var otherSdp = testUA.createDescription({
      videoCodecs: "34 99 109"
    });
    expect(description.mediaChanges(otherSdp)).toEqual([]);

  });
  it('mediaChanges with different video codecs', function() {
    var otherSdp = testUA.createDescription({
      videoCodecs: "1 2 3 4"
    });
    expect(description.mediaChanges(otherSdp)).toEqual(["video codecs has changed : 99,109,34 - 1,2,3,4"]);

  });
  it('mediaChanges with different audio codec rtpmap', function() {
    var otherSdp = testUA.createDescription({
      audioCodec9Rtpmap: "difference"
    });
    expect(description.mediaChanges(otherSdp)).toEqual(["audio codec rtpmap for 9 has changed : G722/8000 - difference"]);

  });
  it('mediaChanges with different video codec rtpmap', function() {
    var otherSdp = testUA.createDescription({
      videoCodec99Rtpmap: "difference"
    });
    expect(description.mediaChanges(otherSdp)).toEqual(["video codec rtpmap for 99 has changed : H264/90000 - difference"]);

  });
  it('mediaChanges with different audio codec fmtp', function() {
    var otherSdp = testUA.createDescription({
      audioCodec126Fmtp: "difference"
    });
    expect(description.mediaChanges(otherSdp)).toEqual([]);

  });
  it('mediaChanges with different video codec fmtp', function() {
    var otherSdp = testUA.createDescription({
      videoCodec99Fmtp: "difference"
    });
    expect(description.mediaChanges(otherSdp)).toEqual([]);

  });
  it('same media in sdps', function() {
    var sdp1 = new WebRTC.RTCSessionDescription({
      type: "answer",
      sdp: "v=0\r\n" +
        "o=- 1391106329 1 IN IP4 127.0.0.1\r\n" +
        "s=-\r\n" +
        "t=0 0\r\n" +
        "a=msid-semantic: WMS default\r\n" +
        "m=audio 1024 RTP/SAVPF 0 126\r\n" +
        "c=IN IP4 204.117.64.113\r\n" +
        "a=rtcp:1 IN IP4 0.0.0.0\r\n" +
        "a=candidate:0 1 udp 2113929216 204.117.64.113 1024 typ host generation 0\r\n" +
        "a=ice-ufrag:J4KnaxVSyoj3Ye8g\r\n" +
        "a=ice-pwd:mB7bsodVNN4S8P4HjlNjIVle\r\n" +
        "a=mid:audio\r\n" +
        "a=sendrecv\r\n" +
        "a=rtcp-mux\r\n" +
        "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:GLhvp8wuIH+XAHlg5bZnexJF1lJOBT6KaCm/aajs\r\n" +
        "a=rtpmap:0 PCMU/8000\r\n" +
        "a=rtpmap:126 telephone-event/8000\r\n" +
        "a=ssrc:1876041 cname:xv7WdxHDi0PZpBlq\r\n" +
        "a=ssrc:1876041 msid:default 0ywDK3S2\r\n" +
        "a=ssrc:1876041 mslabel:default\r\n" +
        "a=ssrc:1876041 label:0ywDK3S2\r\n" +
        "m=video 1026 RTP/SAVPF 100\r\n" +
        "c=IN IP4 204.117.64.113\r\n" +
        "a=rtcp:1 IN IP4 0.0.0.0\r\n" +
        "a=candidate:0 1 udp 2113929216 204.117.64.113 1026 typ host generation 0\r\n" +
        "a=ice-ufrag:YB6Uixe4rl7bnwZe\r\n" +
        "a=ice-pwd:6i470lUgbIBuYK96x2CjDLr2\r\n" +
        "a=mid:video\r\n" +
        "a=sendrecv\r\n" +
        "b=AS:128\r\n" +
        "a=rtcp-mux\r\n" +
        "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:GLhvp8wuIH+XAHlg5bZnexJF1lJOBT6KaCm/aajs\r\n" +
        "a=rtpmap:100 VP8/90000\r\n" +
        "a=rtcp-fb:100 ccm fir\r\n" +
        "a=rtcp-fb:100 nack\r\n" +
        "a=rtcp-fb:100 nack pli\r\n" +
        "a=rtcp-fb:100 goog-remb\r\n" +
        "a=ssrc:4282520567 cname:hxYyi5gkOW8LOWfk\r\n" +
        "a=ssrc:4282520567 msid:default Lf9OhWbx\r\n" +
        "a=ssrc:4282520567 mslabel:default\r\n" +
        "a=ssrc:4282520567 label:Lf9OhWbx"
    });

    var sdp2 = new WebRTC.RTCSessionDescription({
      type: "answer",
      sdp: "v=0\r\n" +
        "o=BroadWorks 1391106387 2 IN IP4 204.117.64.113\r\n" +
        "s=V79Z4YK9HdshXdoMNcHW\r\n" +
        "c=IN IP4 204.117.64.113\r\n" +
        "t=0 0\r\n" +
        "m=audio 1024 RTP/SAVPF 0 126\r\n" +
        "c=IN IP4 204.117.64.113\r\n" +
        "a=rtpmap:0 PCMU/8000\r\n" +
        "a=rtpmap:126 telephone-event/8000\r\n" +
        "a=fmtp:126 0-15\r\n" +
        "a=rtcp-mux\r\n" +
        "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:COC/s3LiY4fOUr1uvCwcIZZRsdf6a2fVGYDWmwzk\r\n" +
        "a=ice-ufrag:Gr0TLKM0XWO6a2sH\r\n" +
        "a=ice-pwd:LK6mcpBHRDcFBVhruyX6aFHQ\r\n" +
        "a=ssrc:4287743560 cname:FLjBfoMD5Dl33c8V\r\n" +
        "a=candidate:0 1 udp 2113929216 204.117.64.113 1024 typ host\r\n" +
        "m=video 1026 RTP/SAVPF 100\r\n" +
        "c=IN IP4 204.117.64.113\r\n" +
        "a=rtpmap:100 VP8/90000\r\n" +
        "a=rtcp-mux\r\n" +
        "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:COC/s3LiY4fOUr1uvCwcIZZRsdf6a2fVGYDWmwzk\r\n" +
        "a=rtcp-fb:100 ccm fir\r\n" +
        "a=rtcp-fb:100 nack\r\n" +
        "a=rtcp-fb:100 nack pli\r\n" +
        "a=rtcp-fb:100 goog-remb\r\n" +
        "a=ice-ufrag:96oqSyZa9NhvyR0g\r\n" +
        "a=ice-pwd:yJfvsLYkntfA8jNjsk2BvWYo\r\n" +
        "a=ssrc:3321204 cname:r30iaTYBSwATl21r\r\n" +
        "a=candidate:0 1 udp 2113929216 204.117.64.113 1026 typ host"
    });

    expect(sdp1.mediaChanges(sdp2)).toEqual([]);


  });
  it('remove unsupported media', function() {
    var sdp = new WebRTC.RTCSessionDescription({
      type: "answer",
      sdp: "v=0\r\n" +
        "o=BroadWorks 1403000323 2 IN IP4 50.205.128.35\r\n" +
        "s=3QZDfXi3npfdoo8JD5cK\r\n" +
        "t=0 0\r\n" +
        "a=fingerprint:sha-256 78:AB:95:B1:71:11:0D:F8:19:71:CD:A3:34:AC:1C:1C:04:EA:B0:75:F4:AA:D2:A7:13:46:37:18:E4:0F:82:20\r\n" +
        "m=audio 20000 RTP/SAVPF 0 126\r\n" +
        "c=IN IP4 50.205.128.35\r\n" +
        "a=rtpmap:0 PCMU/8000\r\n" +
        "a=rtpmap:126 telephone-event/8000\r\n" +
        "a=fmtp:126 0-15\r\n" +
        "a=rtcp-mux\r\n" +
        "a=ice-ufrag:ooodxqdXNM4vpoHm\r\n" +
        "a=ice-pwd:wdlhcIeZTxLcAXu8ECFhyYrv\r\n" +
        "a=ssrc:4293493217 cname:kwDMSaVkunDgcnI7\r\n" +
        "a=candidate:0 1 udp 2113929216 50.205.128.35 20000 typ host\r\n" +
        "m=video 20002 RTP/SAVPF 100\r\n" +
        "c=IN IP4 50.205.128.35\r\n" +
        "b=AS:512\r\n" +
        "a=rtpmap:100 VP8/90000\r\n" +
        "a=rtcp-mux\r\n" +
        "a=content:main\r\n" +
        "a=rtcp-fb:100 ccm fir\r\n" +
        "a=rtcp-fb:100 nack\r\n" +
        "a=rtcp-fb:100 nack pli\r\n" +
        "a=rtcp-fb:100 goog-remb\r\n" +
        "a=ice-ufrag:sS1wdXoLV0Cza48E\r\n" +
        "a=ice-pwd:6c8UAuWsUR9tY3l2Luz68F7T\r\n" +
        "a=ssrc:11284924 cname:6DR4CBW98sFko1D2\r\n" +
        "a=candidate:0 1 udp 2113929216 50.205.128.35 20002 typ host\r\n" +
        "m=video 0 RTP/SAVPF 99\r\n" +
        "a=rtpmap:99 H264/90000\r\n" +
        "a=inactive\r\n" +
        "a=content:slides\r\n" +
        "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:Gi8HeSTpye8o7zuO9h8X9gXawqULMLewfxMO0S69\r\n" +
        "m=application 0 RTP/SAVPF\r\n" +
        "a=inactive\r\n" +
        "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:Gi8HeSTpye8o7zuO9h8X9gXawqULMLewfxMO0S69\r\n" +
        "m=application 0 RTP/SAVPF\r\n" +
        "a=inactive\r\n" +
        "a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:Gi8HeSTpye8o7zuO9h8X9gXawqULMLewfxMO0S69"
    });

    var expectedSdp = "v=0\r\n" +
      "o=BroadWorks 1403000323 2 IN IP4 50.205.128.35\r\n" +
      "s=3QZDfXi3npfdoo8JD5cK\r\n" +
      "t=0 0\r\n" +
      "a=fingerprint:sha-256 78:AB:95:B1:71:11:0D:F8:19:71:CD:A3:34:AC:1C:1C:04:EA:B0:75:F4:AA:D2:A7:13:46:37:18:E4:0F:82:20\r\n" +
      "m=audio 20000 RTP/SAVPF 0 126\r\n" +
      "c=IN IP4 50.205.128.35\r\n" +
      "a=rtpmap:0 PCMU/8000\r\n" +
      "a=rtpmap:126 telephone-event/8000\r\n" +
      "a=fmtp:126 0-15\r\n" +
      "a=rtcp-mux\r\n" +
      "a=ice-ufrag:ooodxqdXNM4vpoHm\r\n" +
      "a=ice-pwd:wdlhcIeZTxLcAXu8ECFhyYrv\r\n" +
      "a=ssrc:4293493217 cname:kwDMSaVkunDgcnI7\r\n" +
      "a=candidate:0 1 udp 2113929216 50.205.128.35 20000 typ host\r\n" +
      "m=video 20002 RTP/SAVPF 100\r\n" +
      "c=IN IP4 50.205.128.35\r\n" +
      "b=AS:512\r\n" +
      "a=rtpmap:100 VP8/90000\r\n" +
      "a=rtcp-mux\r\n" +
      "a=content:main\r\n" +
      "a=rtcp-fb:100 ccm fir\r\n" +
      "a=rtcp-fb:100 nack\r\n" +
      "a=rtcp-fb:100 nack pli\r\n" +
      "a=rtcp-fb:100 goog-remb\r\n" +
      "a=ice-ufrag:sS1wdXoLV0Cza48E\r\n" +
      "a=ice-pwd:6c8UAuWsUR9tY3l2Luz68F7T\r\n" +
      "a=ssrc:11284924 cname:6DR4CBW98sFko1D2\r\n" +
      "a=candidate:0 1 udp 2113929216 50.205.128.35 20002 typ host\r\n";

    sdp.removeUnsupportedMedia();
    expect(sdp.sdp).toEqual(expectedSdp);


  });
});

function createDescription(options) {
  description = testUA.createDescription(options);
}