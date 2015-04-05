'use strict';

var assert = require('chai').assert;
var dispatcher = require('./dispatcher');
var constants = require('./constants');

var Actions = {
  diffSha: function(options) {
    assert.isObject(options);
    assert.isString(options.project);
    assert.isString(options.sha);

    dispatcher.emit(constants.diffSha, {
      project: options.project,
      sha: options.sha
    });
  },

  setBuildStatus: function(options) {
    assert.isObject(options);
    assert.isString(options.project);
    assert.isString(options.sha);
    assert.isString(options.status);

    dispatcher.emit(constants.setBuildStatus, {
      project: options.project,
      sha: options.sha,
      status: options.status
    });
  },

  addComment: function(options) {
    assert.isObject(options);
    assert.isString(options.project);
    assert.isString(options.sha);
    assert.isString(options.comment);

    dispatcher.emit(constants.SERVICE_ADD_COMMENT, {
      project: options.project,
      sha: options.sha,
      comment: options.comment
    });
  }
};

module.exports = Actions;
