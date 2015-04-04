'use strict';

var assert = require('chai').assert;
var Bluebird = require('bluebird');
var dispatcher = require('./dispatcher');
var constants = require('./constants');
var storage = require('./utils/storage');

var config;

function setBuildStatus(options) {
  assert.isObject(options);
  assert.isString(options.project);
  assert.isString(options.sha);
  assert.isString(options.status);

  var service = config.getService();

  if (service === undefined) {
    return Bluebird.resolve();
  }

  return storage.getProjectInfo(options.project)
  .then(function(info) {
    return service.setBuildStatus(info.service, {
      sha: options.sha,
      status: options.status
    });
  });
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
