/**
 * @fileoverview Message
 */

/**
 * @augments ExSIP
 * @class Class creating SIP MESSAGE request.
 * @param {ExSIP.UA} ua
 */
(function(ExSIP) {
var Logger;

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

        if ( dateMarker[1] != null ) {
          rv = dateMarker[1](rv);
        }

        return rv;

      });

      return dateTxt;
    };

  }

  Logger = function(prefix) {
    this.prefix = prefix;
    this.fmt = new DateFmt("%m%d/%H%M%S");
  };


  Logger.prototype = {
    log: function(msg, ua) {
      if(!ua || ua.isDebug()) {
        console.log(this.formatMsg(msg));
      }
    },
    debug: function(msg, ua) {
      if(!ua || ua.isDebug()) {
        console.debug(this.formatMsg(msg));
      }
    },
    error: function(msg) {
      console.error(this.formatMsg(msg));
    },
    warn: function(msg, ua) {
      if(!ua || ua.isDebug()) {
        console.warn(this.formatMsg(msg));
        console.trace();
      }
    },
    formatMsg: function(msg) {
      return this.getTime()+' : '+this.prefix+' : '+msg;
    },
    getTime: function() {
      return this.getTimeFor(new Date());
    },
    getTimeFor: function(date) {
      return this.fmt.format(date);
    }
  };

ExSIP.Logger = Logger;
}(ExSIP));
