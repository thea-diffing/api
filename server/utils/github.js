'use strict';

var assert = require('chai').assert;
var Github = require('./async-github');

function verifyConfig(config) {
  assert.isObject(config);
  assert.equal(config.name, GithubUtils.prototype.serviceKey());
  assert.isObject(config.options);
  assert.isString(config.options.user);
  assert.isString(config.options.repository);
}

function GithubUtils(options) {
  assert.isObject(options);
  assert.isString(options.botToken);

  Github.authenticate({
    type: 'oauth',
    token: options.botToken
  });
}

GithubUtils.prototype = {
  serviceKey: 'github',

  setBuildStatus: function(config, options) {
    verifyConfig(config);

    assert.isObject(options);
    assert.isString(options.sha);
    assert.isString(options.status);

    return Github.statuses.createAsync({
      user: config.options.user,
      repo: config.options.repository,
      sha: options.sha,
      state: options.status,
      context: 'CI - Visual'
    });
  },

  addComment: function(config, options) {
    verifyConfig(config);

    assert.isObject(options);
    assert.isString(options.sha);
    assert.isString(options.comment);

    return Github.repos.createCommitCommentAsync({
      user: config.options.user,
      repo: config.options.repository,
      sha: options.sha,
      commit_id: options.sha,
      body: options.comment
    });
  }
};

module.exports = GithubUtils;
