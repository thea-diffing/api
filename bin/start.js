#!/usr/bin/env node
'use strict';

var Bluebird = require('bluebird');
var path = require('path');
var findup = Bluebird.promisify(require('findup'));
var App = require('../server/app');
var Configuration = require('../server/configuration');

var configFile = 'visualtesting.conf.js';
var configFilePath;

findup(process.cwd(), configFile)
.then(function(dir) {
  configFilePath = path.join(dir, configFile);
})
.then(function() {
  var app = new App();

  var config = new Configuration();
  require(configFilePath)(config);

  app.useConfiguration(config);
  app.start();
});
