'use strict';

var Bluebird = require('bluebird');
var sinon = require('sinon');
require('sinon-as-promised')(Bluebird);

var AsyncGithubMock = {
  '@global': true,
  authenticate: function() {},

  statuses: {
    createAsync: sinon.stub().resolves()
  },
  repos: {
    createCommitCommentAsync: sinon.stub().resolves()
  }
};

module.exports = AsyncGithubMock;
