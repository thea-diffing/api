'use strict';

var assert = require('chai').assert;
var Bluebird = require('bluebird');
var dispatcher = require('./dispatcher');
var constants = require('./constants');

var config;

function setBuildStatus(options) {
  assert.isObject(options);
  assert.isString(options.project);
  assert.isString(options.sha);
  assert.isString(options.status);

  if (config.getService() === undefined) {
    return Bluebird.resolve();
  }
}

function ServiceListener(newConfig) {
  config = newConfig;
}

ServiceListener.prototype = {
  register: function() {
    dispatcher.on(constants.setBuildStatus, setBuildStatus);
  }
};

if (process.env.NODE_ENV === 'test') {
  ServiceListener.prototype._setBuildStatus = setBuildStatus;
}

module.exports = ServiceListener;
