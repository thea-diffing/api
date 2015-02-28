'use strict';

var path = require('path');
var config = require('../config/config');

/**
 * Send our single page app
 */
exports.index = function(req, res) {
    res.sendfile(path.join(config.root, 'dist', 'index.html'));
};
