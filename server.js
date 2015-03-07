'use strict';

var app = require('./server/app');
var config = require('./server/config/config');

// Start server
app.listen(config.port, config.ip, function() {
  console.log('Express server listening on %s:%d, in %s mode', config.ip, config.port, app.get('env'));
});
