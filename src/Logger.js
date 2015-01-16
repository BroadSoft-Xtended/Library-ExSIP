module.exports = Logger;

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

      if ( dateMarker[1] !== null ) {
        rv = dateMarker[1](rv);
      }

      return rv;

    });

    return dateTxt;
  };

}


function Logger(logger, category, label) {
  this.logger = logger;
  this.category = category;
  this.label = label;
  this.fmt = new DateFmt("%m%d/%H%M%S");
}

Logger.prototype.debug = function(content) {
  this.logger.debug(this.category, this.label, this.formatMsg(content));
};

Logger.prototype.log = function(content) {
  this.logger.log(this.category, this.label, this.formatMsg(content));
};

Logger.prototype.warn = function(content) {
  this.logger.warn(this.category, this.label, this.formatMsg(content));
};

Logger.prototype.error = function(content) {
  this.logger.error(this.category, this.label, this.formatMsg(content));
};

Logger.prototype.formatMsg = function(msg) {
  return this.getTime()+' : '+this.prefix+' : '+msg;
};
Logger.prototype.getTime = function() {
  return this.getTimeFor(new Date());
};
Logger.prototype.getTimeFor = function(date) {
  return this.fmt.format(date);
};