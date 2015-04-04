'use strict';

var Github = require('./server/utils/github');

var service;

if (process.env.botToken !== undefined) {
  service = new Github({
    botToken: process.env.botToken
  });
}

function Apply(config) {
  config.set({
    port: 9000,

    service: service
  });
}

module.exports = Apply;
