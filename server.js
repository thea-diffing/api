'use strict';

var App = require('./server/app');
var app = new App();

var Configuration = require('./server/configuration');
var config = new Configuration();
require('./visualtesting.conf.js')(config);

app.useConfiguration(config);
app.start();
