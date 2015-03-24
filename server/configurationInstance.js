'use strict';

var config;

function ConfigurationInstance() {

}

ConfigurationInstance.prototype = {
  set: function(newConfig) {
    config = newConfig;
  },

  get: function() {
    return config;
  }
};

module.exports = new ConfigurationInstance();
