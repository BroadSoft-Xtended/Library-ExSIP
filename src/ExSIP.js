/*global console: false*/

/**
 * @name ExSIP
 * @namespace
 */
(function(window) {

var ExSIP = (function() {
  "use strict";

  var ExSIP = {};

  Object.defineProperties(ExSIP, {
    version: {
      get: function(){ return '<%= pkg.version %>'; }
    },
    name: {
      get: function(){ return '<%= pkg.title %>'; }
    }
  });

  return ExSIP;
}());
