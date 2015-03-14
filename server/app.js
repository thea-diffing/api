'use strict';

var express = require('express');
var errorHandler = require('errorhandler');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var app = express();

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

require('./config/express')(app);
require('./routes')(app);
require('./checkBuild');

// Error handler - has to be last
if (app.get('env') !== 'production') {
  app.use(errorHandler({
    log: function(err, str, req) {
      console.error('Error in', req.method, req.url, err);
      console.error(str);
    }
  }));
}

module.exports = app;
