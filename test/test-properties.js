require('./include/common');
var pkg = require('../package.json');


describe('properties', function() {

  it('name', function() {
    expect(ExSIP.name).toEqual( pkg.title);
    
  });

  it('version', function() {
    expect(ExSIP.version).toEqual( pkg.version);
    
  });

});
