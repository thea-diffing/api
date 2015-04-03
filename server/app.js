'use strict';

var express = require('express');
var errorHandler = require('errorhandler');

var Api = require('./controllers/api');

var config;

var instance;

function setErrorHandler() {
  instance.use(errorHandler({
    log: function(err, str, req) {
      console.error('Error in', req.method, req.url, err);
      console.error(str);
    }
  }));
}

function App() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';

  instance = express();

  instance.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  require('./config/express')(instance);
}

App.prototype = {
  useConfiguration: function(newConfig) {
    config = newConfig;

    require('./routes')({
      app: instance,
      api: new Api(config)
    });

    require('./checkBuild');

    var ServiceListener = require('./serviceListener');
    var serviceListener = new ServiceListener(config);
    serviceListener.register();

    if (instance.get('env') !== 'production') {
      setErrorHandler();
    }
  },

  start: function() {
    // Start server

    var ip = config.getIp();
    var port = config.getPort();

    instance.listen(port, ip, function() {
      console.log('Express server listening on %s:%d, in %s mode', ip, port, instance.get('env'));
    });
  }
};

if (process.env.NODE_ENV === 'test') {
  Object.defineProperty(App.prototype, '_instance', {
    get: function() {
      return instance;
    }
  });
}

module.exports = App;
