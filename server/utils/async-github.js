'use strict';

var GithubApi = require('github');
var Bluebird = require('bluebird');

var Github = new GithubApi({
  version: '3.0.0',
  debug: false
});

Github.statuses = Bluebird.promisifyAll(Github.statuses);
Github.repos = Bluebird.promisifyAll(Github.repos);

module.exports = Github;
