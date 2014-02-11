/**
 * @fileoverview WebRTC
 */

(function(ExSIP) {
var WebRTC;

WebRTC = {};

// getUserMedia
if (window.navigator.webkitGetUserMedia) {
  WebRTC.getUserMedia = window.navigator.webkitGetUserMedia.bind(navigator);
}
else if (window.navigator.mozGetUserMedia) {
  WebRTC.getUserMedia = window.navigator.mozGetUserMedia.bind(navigator);
}
else if (window.navigator.getUserMedia) {
  WebRTC.getUserMedia = window.navigator.getUserMedia.bind(navigator);
}

// RTCPeerConnection
if (window.webkitRTCPeerConnection) {
  WebRTC.RTCPeerConnection = window.webkitRTCPeerConnection;
}
else if (window.mozRTCPeerConnection) {
  WebRTC.RTCPeerConnection = window.mozRTCPeerConnection;
}
else if (window.RTCPeerConnection) {
  WebRTC.RTCPeerConnection = window.RTCPeerConnection;
}

// RTCIceCandidate
if (window.RTCIceCandidate) {
  WebRTC.RTCIceCandidate = window.RTCIceCandidate;
}
else {
  console.log("WebRTC.RTCIceCandidate undefined");
  WebRTC.RTCIceCandidate = function(){};
}

// RTCSessionDescription
if (window.webkitRTCSessionDescription) {
  WebRTC.RTCSessionDescription = window.webkitRTCSessionDescription;
}
else if (window.mozRTCSessionDescription) {
  WebRTC.RTCSessionDescription = window.mozRTCSessionDescription;
}
else if (window.RTCSessionDescription) {
  WebRTC.RTCSessionDescription = window.RTCSessionDescription;
}
else {
  console.log("WebRTC.RTCSessionDescription undefined");
  WebRTC.RTCSessionDescription = function(options){
    options = options || {};
    this.sdp = options["sdp"];
    this.type = options["offer"];
  };
}

WebRTC.RTCSessionDescription.prototype.getAudioIcePwd = function(){
  var match = this.sdp.match(/m=audio(?:(?!m=)[\s\S])*a=ice-pwd:(.*)/mi);
  return match != null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getVideoIcePwd = function(){
  var match = this.sdp.match(/m=video(?:(?!m=)[\s\S])*a=ice-pwd:(.*)/mi);
  return match != null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getAudioIceUfrag = function(){
  var match = this.sdp.match(/m=audio(?:(?!m=)[\s\S])*a=ice-ufrag:(.*)/mi);
  return match != null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getVideoIceUfrag = function(){
  var match = this.sdp.match(/m=video(?:(?!m=)[\s\S])*a=ice-ufrag:(.*)/mi);
  return match != null ? match[match.length-1] : null;
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
  return match != null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getAudio = function(){
  var match = this.sdp.match(/m=audio(?:(?!m=)[\s\S])*/mi);
  return match != null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getVideo = function(){
  var match = this.sdp.match(/m=video(?:(?!m=)[\s\S])*/mi);
  return match != null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getAudioConnection = function(){
  var match = this.sdp.match(/m=audio(?:(?!m=)[\s\S])*c=(.*)/mi);
  return match != null ? match[match.length-1] : this.getConnection();
};
WebRTC.RTCSessionDescription.prototype.getVideoConnection = function(){
  var match = this.sdp.match(/m=video(?:(?!m=)[\s\S])*c=(.*)/mi);
  return match != null ? match[match.length-1] : this.getConnection();
};
WebRTC.RTCSessionDescription.prototype.hasVideo = function(){
  return this.sdp.match(/m=video/) != null;
};
WebRTC.RTCSessionDescription.prototype.hasAudio = function(){
  return this.sdp.match(/m=audio/) != null;
};
WebRTC.RTCSessionDescription.prototype.videoPort = function(){
  var match = this.sdp.match(/m=video\s(\d*)\s/);
  return  match != null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.audioPort = function(){
  var match = this.sdp.match(/m=audio\s(\d*)\s/);
  return  match != null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getAudioMedia = function(){
  var match = this.sdp.match(/m=audio\s(.*)/);
  return  match != null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getVideoMedia = function(){
  var match = this.sdp.match(/m=video\s(.*)/);
  return  match != null ? match[match.length-1] : null;
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
  return match != null ? match[match.length-1].trim() : null;
};
WebRTC.RTCSessionDescription.prototype.getVideoCodecRtpmap = function(codec){
  var regex = new RegExp("m=video(?:(?!m=)[\\s\\S])*a=rtpmap:"+codec+"(.*)", "mi");
  var match = this.sdp.match(regex);
  return match != null ? match[match.length-1].trim() : null;
};
WebRTC.RTCSessionDescription.prototype.getAudioCodecFmtp = function(codec){
  var regex = new RegExp("m=audio(?:(?!m=)[\\s\\S])*a=fmtp:"+codec+"(.*)", "mi");
  var match = this.sdp.match(regex);
  return match != null ? match[match.length-1].trim() : null;
};
WebRTC.RTCSessionDescription.prototype.getVideoCodecFmtp = function(codec){
  var regex = new RegExp("m=video(?:(?!m=)[\\s\\S])*a=fmtp:"+codec+"(.*)", "mi");
  var match = this.sdp.match(regex);
  return match != null ? match[match.length-1].trim() : null;
};
WebRTC.RTCSessionDescription.prototype.getAudioFingerprint = function(){
  var match = this.sdp.match(/m=audio(?:(?!m=)[\s\S])*a=fingerprint:(.*)/mi);
  return match != null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getVideoFingerprint = function(){
  var match = this.sdp.match(/m=video(?:(?!m=)[\s\S])*a=fingerprint:(.*)/mi);
  return match != null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getAudioRtcp = function(){
  var match = this.sdp.match(/m=audio(?:(?!m=)[\s\S])*a=rtcp:(.*)/mi);
  return match != null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.getVideoRtcp = function(){
  var match = this.sdp.match(/m=video(?:(?!m=)[\s\S])*a=rtcp:(.*)/mi);
  return match != null ? match[match.length-1] : null;
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
  return match != null ? match[match.length-1] : null;
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
  return match != null ? match[match.length-1] : null;
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
  return match != null ? match[match.length-1] : null;
};
WebRTC.RTCSessionDescription.prototype.isActive = function(){
  if(this.hasAudio() && this.audioPort() !== "0" && this.getAudioMode() !== ExSIP.C.INACTIVE) {
    return true;
  }
  if(this.hasVideo() && this.videoPort() !== "0" && this.getVideoMode() !== ExSIP.C.INACTIVE) {
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
  if(!ExSIP.Utils.isEqArrays(audioCodecs, otherSdp.getAudioCodecs())) {
    mediaChanges.push("audio codecs has changed : "+audioCodecs+" - " + otherSdp.getAudioCodecs());
  }
  var videoCodecs = this.getVideoCodecs();
  if(!ExSIP.Utils.isEqArrays(videoCodecs, otherSdp.getVideoCodecs())) {
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
  if (!WebRTC.RTCPeerConnection.prototype.getLocalStreams) {
    WebRTC.RTCPeerConnection.prototype.getLocalStreams = function() {
      return this.localStreams;
    };
    WebRTC.RTCPeerConnection.prototype.getRemoteStreams = function() {
      return this.remoteStreams;
    };
  }
}

// isSupported attribute.
if (WebRTC.getUserMedia && WebRTC.RTCPeerConnection && WebRTC.RTCSessionDescription) {
  WebRTC.isSupported = true;
}
else {
  WebRTC.isSupported = false;
}

ExSIP.WebRTC = WebRTC;
}(ExSIP));
