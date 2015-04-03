'use strict';

var merge = require('merge');

var defaults = {
  ip: '0.0.0.0',
  port: 8999,
  service: undefined
};

function Configuration() {
  this._config = merge(true, defaults);
}

Configuration.prototype = {
  set: function(newConfig) {
    this._config = merge(true, this._config, newConfig);
  },

  getService: function() {
    return this._config.service;
  },

  getPort: function() {
    return this._config.port;
  },

  getIp: function() {
    return this._config.ip;
  }

};

module.exports = Configuration;
