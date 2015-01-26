/**
 * @namespace Exceptions
 * @memberOf ExSIP
 */
var Exceptions = {
  /**
   * Exception thrown when a valid parameter is given to the ExSIP.UA constructor.
   * @class ConfigurationError
   * @memberOf ExSIP.Exceptions
   */
  ConfigurationError: (function(){
    var exception = function(parameter, value) {
      console.trace('----------------------ConfigurationError : '+parameter+', '+value);
      this.code = 1;
      this.name = 'CONFIGURATION_ERROR';
      this.parameter = parameter;
      this.value = value;
      this.message = (!this.value)? 'Missing parameter: '+ this.parameter : 'Invalid value '+ JSON.stringify(this.value) +' for parameter "'+ this.parameter +'"';
    };
    exception.prototype = new Error();
    return exception;
  }()),

  InvalidStateError: (function(){
    var exception = function(status) {
      console.trace('----------------------InvalidStateError : '+status);
      this.code = 2;
      this.name = 'INVALID_STATE_ERROR';
      this.status = status;
      this.message = 'Invalid status: '+ status;
    };
    exception.prototype = new Error();
    return exception;
  }()),

  NotSupportedError: (function(){
    var exception = function(message) {
      console.trace('----------------------NotSupportedError : '+message);
      this.code = 3;
      this.name = 'NOT_SUPPORTED_ERROR';
      this.message = message;
    };
    exception.prototype = new Error();
    return exception;
  }()),

  NotReadyError: (function(){
    var exception = function(message) {
      console.trace('----------------------NotReadyError : '+message);
      this.code = 4;
      this.name = 'NOT_READY_ERROR';
      this.message = message;
    };
    exception.prototype = new Error();
    return exception;
  }())
};

module.exports = Exceptions;