'use strict';

var GithubApi = require('github');
var Bluebird = require('bluebird');
var Github = new GithubApi({
  version: '3.0.0',
  debug: true
});

Github.statuses = Bluebird.promisifyAll(Github.statuses);
Github.repos = Bluebird.promisifyAll(Github.repos);

var botToken = process.env.githubToken;

function GithubUtils() {
  Github.authenticate({
    type: 'oauth',
    token: botToken
  });
}

GithubUtils.prototype = {
  setStatus: function(options) {
    var sha = options.sha;
    var state = options.state;

    if (sha === undefined || state === undefined) {
      throw new Error('sha and state must be defined');
    }

    return Github.statuses.createAsync({
      user: 'VisualTesting',
      repo: 'test-example',
      sha: sha,
      state: state,
      context: 'CI - Visual'
    });
  },

  addComment: function(options) {
    var sha = options.sha;
    var body = options.body;

    return Github.repos.createCommitCommentAsync({
      user: 'VisualTesting',
      repo: 'test-example',
      sha: sha,
      commit_id: sha,
      body: body
    });
  },

  generateMarkdownMessage: function(diffBrowsers) {
    var browsers = Object.keys(diffBrowsers);

    var lines = 'Diffs found in ' + browsers.length + ' browser(s): ' + browsers.join(', ');

    return lines;
  }
};

module.exports = new GithubUtils();
