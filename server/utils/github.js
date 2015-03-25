'use strict';

var Github = require('./asyncGithub');

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
