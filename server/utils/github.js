'use strict';

var assert = require('chai').assert;
var Github = require('./asyncGithub');

var botToken = process.env.githubToken;

function verifyConfig(config) {
  assert.isObject(config);
  assert.equal(config.name, 'github');
  assert.isObject(config.options);
  assert.isString(config.options.user);
  assert.isString(config.options.repository);
}

function GithubUtils() {
  Github.authenticate({
    type: 'oauth',
    token: botToken
  });
}

GithubUtils.prototype = {
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
  },

  /*
  buildInfo.id string
  buildInfo.data.head string
  buildInfo.data.base string
  buildInfo.data.numBrowsers number
  diffBrowsers object
  */
  generateMarkdownMessage: function(buildInfo, diffBrowsers) {
    var browsers = Object.keys(diffBrowsers);

    var lines = ['Diffs found in ' + browsers.length + ' browser(s): ' + browsers.join(', ')];

    var browserGroups = browsers.map(function(browser) {
      var imagesPaths = diffBrowsers[browser].map(function(image) {
        return 'http://visualdiff.ngrok.com/api/diff/' + buildInfo.id + '/' + browser + '/' + image;
      })
      .map(function(url) {
        return '![' + url + '](' + url + ')';
      });

      var browserString = [
        '<h3>' + browser + '</h3>'
      ]
      .concat(imagesPaths);

      return browserString.join('\n');

    }).join('\n\n');

    lines = lines.concat(browserGroups);

    var body = lines.join('\n');
    return body;
  }
};

module.exports = new GithubUtils();
