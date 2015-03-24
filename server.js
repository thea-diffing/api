'use strict';

var app = require('./server/app');
var configInstance = require('./server/configurationInstance');

var Configuration = require('./server/configuration');
var config = new Configuration();
require('./visualtesting.conf.js')(config);
configInstance.set(config);

// Start server
var ip = configInstance.get().getIp();
var port = configInstance.get().getPort();

app.listen(port, ip, function() {
  console.log('Express server listening on %s:%d, in %s mode', ip, port, app.get('env'));
});
