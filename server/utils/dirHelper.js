'use strict';

/**
 * https://gist.github.com/DelvarWorld/825583
 */

var Bluebird = require('bluebird');
var dir = require('node-dir');
var path = require('path');

var recursiveAsync = Bluebird.promisify(require('recursive-readdir'));

module.exports = {
  readFiles: function(directory) {
    return recursiveAsync(directory)
    .then(function(files) {
      return files.map(path.relative.bind(path, directory));
    });
  }
};

return;
