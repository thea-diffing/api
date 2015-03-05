'use strict';

var express = require('express');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var app = express();

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

require('./config/express')(app);
require('./routes')(app);

module.exports = app;
