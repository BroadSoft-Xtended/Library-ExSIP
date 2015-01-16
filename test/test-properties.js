require('./include/common');
var ExSIP = require('../');
var pkg = require('../package.json');


module.exports = {

  'name': function(test) {
    test.equal(ExSIP.name, pkg.title);
    test.done();
  },

  'version': function(test) {
    test.equal(ExSIP.version, pkg.version);
    test.done();
  }

};
