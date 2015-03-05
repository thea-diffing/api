'use strict';

var bluebirdPromise = require('bluebird');
var fs = bluebirdPromise.promisifyAll(require('fs-extra'));
var path = require('path');
var uuid = require('node-uuid');

var root = path.join(__dirname, '..', '..');
var dataPath = path.join(root, 'data');
var buildsPath = path.join(root, 'builds');

var Storage = {
  init: function() {
    fs.ensureDirSync(dataPath);
    fs.ensureDirSync(buildsPath);
  },

  startBuild: function(options) {
    if (typeof options !== 'object' ||
        typeof options.head !== 'string' ||
        typeof options.base !== 'string' ||
        typeof options.numBrowsers !== 'number') {
      return bluebirdPromise.reject('Invalid arguments');
    }

    var guid = uuid.v4();

    var buildDir = path.join(buildsPath, guid);

    return fs.ensureDirAsync(buildDir)
    .then(function() {
      return fs.writeJSON(path.join(buildDir, 'build.json'), {
        id: guid,
        head: options.head,
        base: options.base,
        numBrowsers: options.numBrowsers
      });
    })
    .then(function() {
      return {
        id: guid
      };
    });
  }
};

if (process.env.NODE_ENV === 'test') {
  Storage._buildsPath = buildsPath;
}

module.exports = Storage;
