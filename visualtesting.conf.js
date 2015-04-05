'use strict';

var Github = require('./server/utils/github');
var Differ = require('./server/utils/differ');
var storage = require('../utils/storage');

var service;

if (process.env.GITHUB_BOT_TOKEN !== undefined) {
  service = new Github({
    botToken: process.env.GITHUB_BOT_TOKEN
  });
}

function Apply(config) {
  config.set({
    port: 9000,

    service: service,

    differ: Differ,
    storage: storage
  });
}

module.exports = Apply;
