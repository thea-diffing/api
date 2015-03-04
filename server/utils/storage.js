'use strict';

var bluebird = require('bluebird');
var fs = bluebird.promisifyAll(require('fs-extra'));
var path = require('path');
var Guid = require('guid');

var root = path.join(__dirname, '..', '..');
var dataPath = path.join(root, 'data');
var buildsPath = path.join(root, 'builds');

var Storage = {
  init: function() {
    fs.ensureDirSync(dataPath);
    fs.ensureDirSync(buildsPath);
  },

  startBuild: function() {
    var guid = Guid.raw();

    var buildDir = path.join(buildsPath, guid);

    return fs.ensureDirAsync(buildDir)
    .then(function() {
      return fs.writeJSON(path.join(buildDir, 'build.json'), {
        foo: 'foo'
      });
    })
    .then(function() {
      return {
        id: guid
      };
    });
  },

  readFile: function() {
    return fs.readFileAsync('var/www/index.php', 'utf-8');
  },

  createFile: function() {
    return fs.ensureFileAsync('var/www/foo.txt');
  }
};

if (process.env.NODE_ENV === 'test') {
  Storage._buildsPath = buildsPath;
}

module.exports = Storage;
