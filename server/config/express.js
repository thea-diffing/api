'use strict';

var logger = require('morgan');
var bodyParser = require('body-parser');
var multer  = require('multer');

var compression = require('compression');
var methodOverride = require('method-override');

/**
 * Express configuration
 */
module.exports = function(app) {
  var env = app.get('env');

  if (env === 'development') {
    app.use(require('connect-livereload')());
  }

  if (env === 'production') {
    app.use(compression());
  }

  if (env !== 'test') {
    app.use(logger('combined'));
  }

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(multer({
    dest: './uploads/'
  }));

  app.use(methodOverride());
};
