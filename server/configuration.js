'use strict';

var merge = require('merge');

var config = {
  ip: '0.0.0.0',
  port: 8999,
  services: []
};

function Configuration() {
}

Configuration.prototype = {
  set: function(newConfig) {
    merge(config, newConfig);
  },

  getServices: function() {
    return config.services;
  },

  getPort: function() {
    return config.port;
  },

  getIp: function() {
    return config.ip;
  }

};

module.exports = Configuration;
