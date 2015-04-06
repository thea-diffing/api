'use strict';

var assert = require('chai').assert;
var Bluebird = require('bluebird');
var dispatcher = require('./dispatcher');
var constants = require('./constants');

var storage;
var config;

function setBuildStatus(options) {
  assert.isObject(options);
  assert.isString(options.project);
  assert.isString(options.sha);
  assert.isString(options.status);

  var services = config.getServices();
  if (services.length === 0) {
    return Bluebird.resolve();
  }

  return storage.getProjectInfo(options.project)
  .then(function(info) {
    return Bluebird.any(
      services.map(function(service) {
        if (service.serviceKey === info.service.name) {
          return service.setBuildStatus(info.service, {
            sha: options.sha,
            status: options.status
          });
        }
      })
    );
  });
}

function addComment(options) {
  assert.isObject(options);
  assert.isString(options.project);
  assert.isString(options.sha);
  assert.isString(options.comment);

  var services = config.getServices();
  if (services.length === 0) {
    return Bluebird.resolve();
  }

  return storage.getProjectInfo(options.project)
  .then(function(info) {
    return Bluebird.any(
      services.map(function(service) {
        if (service.serviceKey === info.service.name) {
          return service.addComment(info.service, {
            sha: options.sha,
            comment: options.comment
          });
        }
      })
    );
  });
}

function ServiceListener(newConfig) {
  config = newConfig;

  storage = config.getStorage();
}

ServiceListener.prototype = {
  register: function() {
    dispatcher.on(constants.setBuildStatus, setBuildStatus);
    dispatcher.on(constants.SERVICE_ADD_COMMENT, addComment);
  }
};

if (process.env.NODE_ENV === 'test') {
  ServiceListener.prototype._setBuildStatus = setBuildStatus;
  ServiceListener.prototype._addComment = addComment;
}

module.exports = ServiceListener;
