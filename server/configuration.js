'use strict';

var merge = require('merge');

var defaults = {
  url: 'http://visualdiff.ngrok.com',
  ip: '0.0.0.0',
  port: 8999,
  services: [],
  differ: undefined,
  storage: undefined
};

function Configuration() {
  this._config = merge(true, defaults);
}

Configuration.prototype = {
  set: function(newConfig) {
    merge(this._config, newConfig);
  },

  getServices: function() {
    return this._config.services;
  },

  getIp: function() {
    return this._config.ip;
  },

  getPort: function() {
    return this._config.port;
  },

  getUrl: function() {
    return this._config.host;
  },

  getDiffer: function() {
    return this._config.differ;
  },

  getStorage: function() {
    return this._config.storage;
  }
};

module.exports = Configuration;
