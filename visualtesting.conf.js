'use strict';

var Github = require('./server/utils/github');

function Apply(config) {

  config.set({
    port: 9000,

    services: [
      Github
    ]
  });
}

module.exports = Apply;
