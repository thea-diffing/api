'use strict';

var express = require('express');
var favicon = require('serve-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');


var compression = require('compression'),
    multipart = require('connect-multiparty'),
    methodOverride = require('method-override'),
    errorHandler = require('errorhandler'),
    path = require('path'),
    config = require('./config');

/**
 * Express configuration
 */
module.exports = function(app) {
  var env = app.get('env');

  if (env === 'development') {
    app.use(require('connect-livereload')());

    // Disable caching of scripts for easier testing
    app.use(function noCache(req, res, next) {
      if (req.url.indexOf('/js/') === 0) {
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.header('Pragma', 'no-cache');
        res.header('Expires', 0);
      }
      next();
    });

    app.use(express.static(path.join(config.root, 'dist')));
  }

  if (env === 'production') {
    app.use(compression());
    // app.use(favicon(path.join(config.root, 'dist', 'favicon.ico')));
    app.use(express.static(path.join(config.root, 'dist')));
  }

  if (env !== 'test') {
    app.use(logger('combined'));
  }

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(multipart());
  app.use(methodOverride());

  function logErrors(err, req, res, next) {
    console.error(err.stack);
    next(err);
  }

  // Error handler - has to be last
  if (app.get('env') !== 'production') {
    app.use(logErrors);
  }
};
