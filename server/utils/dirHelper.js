'use strict';

/**
 * https://gist.github.com/DelvarWorld/825583
 */

var Bluebird = require('bluebird');
var dir = require('node-dir');
var path = require('path');

module.exports = {
  readFiles: function(directory, options) {
    return new Bluebird(function(resolve, reject) {
      dir.readFiles(directory, options, function(err, content, next) {
        next();
      }, function(err, files) {
        if (err) {
          reject(err);
          return;
        }

        resolve(files.map(path.relative.bind(path, directory)));
      });
    });
  }
};

return;
