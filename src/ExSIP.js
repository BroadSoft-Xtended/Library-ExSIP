var ExSIP = {
  C: require('./Constants'),
  Exceptions: require('./Exceptions'),
  Utils: require('./Utils'),
  UA: require('./UA'),
  URI: require('./URI'),
  NameAddrHeader: require('./NameAddrHeader'),
  Grammar: require('./Grammar')
};

module.exports = ExSIP;


var pkg = require('../package.json');


Object.defineProperties(ExSIP, {
  name: {
    get: function(){ return pkg.title; }
  },

  /**
   * Retrieve the version of ExSIP.
   * @memberof ExSIP
   * @method
   * @returns {String} Version in the form "X.Y.Z"
   * @example
   * // prints "1.0.0"
   * console.log(ExSIP.version)
   */
  version: {
    get: function(){ return pkg.version; }
  }
});
