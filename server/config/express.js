'use strict';

var express = require('express'),
    favicon = require('static-favicon'),
    morgan = require('morgan'),
    compression = require('compression'),
    bodyParser = require('body-parser'),
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

    if ('development' === env) {
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

    if ('production' === env) {
        app.use(compression());
        app.use(favicon(path.join(config.root, 'dist', 'favicon.ico')));
        app.use(express.static(path.join(config.root, 'dist')));
    }

    app.use(morgan('dev'));
    app.use(bodyParser());
    app.use(multipart());
    app.use(methodOverride());

    // Error handler - has to be last
    if ('development' === app.get('env')) {
        app.use(errorHandler());
    }
};
