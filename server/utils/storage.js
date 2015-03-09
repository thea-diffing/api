'use strict';

var Bluebird = require('bluebird');
var fs = Bluebird.promisifyAll(require('fs-extra'));
var path = require('path');
var uuid = require('node-uuid');
var tar = require('tar-fs');

var root = path.join(__dirname, '..', '..');
var dataPath = path.join(root, 'data');
var buildsPath = path.join(dataPath, 'builds');
var shasPath = path.join(dataPath, 'shas');

var Storage = {
  init: function() {
    fs.ensureDirSync(buildsPath);
    fs.ensureDirSync(shasPath);
  },

  /**
  options.head string
  options.base string
  options.numbBrowsers number
  */
  startBuild: function(options) {
    var guid = uuid.v4();

    var buildFile = path.join(buildsPath, guid, 'build.json');

    return fs.outputJSONAsync(buildFile, {
      id: guid,
      head: options.head,
      base: options.base,
      numBrowsers: options.numBrowsers,
      status: 'pending'
    })
    .then(function() {
      return {
        id: guid
      };
    });
  },

  /*
  options.sha string
  options.browser string
  options.tarPath string
  */
  saveImages: function(options) {
    var extractPath = path.join(shasPath, options.sha, options.browser);

    return fs.ensureDirAsync(extractPath)
    .then(function() {
      return new Bluebird(function(resolve, reject) {
        var readStream = fs.createReadStream(options.tarPath);

        var extract = tar.extract(extractPath);

        extract.on('error', function(err) {
          reject(err);
        });

        extract.on('finish', function() {
          resolve();
        });

        readStream.pipe(extract);
      });
    });
  },

  /*
  id string
  */
  hasBuild: function(id) {
    return fs.statAsync(path.join(buildsPath, id))
    .then(function(stat) {
      return stat.isDirectory();
    })
    .catch(function() {
      return false;
    });
  },

  /*
  id string
  */
  getBuildInfo: function(id) {
    var buildFile = path.join(buildsPath, id, 'build.json');

    return fs.readJSONAsync(buildFile)
    .catch(function() {
      throw Error('Unknown Build');
    });
  },

  /*
  sha string
  */
  getBrowsersForSha: function(sha) {
    var shaPath = path.join(shasPath, sha);

    return fs.readdirAsync(shaPath)
    .then(function(files) {
      return files.filter(function(file) {
        return fs.statSync(path.join(shaPath, file)).isDirectory();
      });
    });
  }
};

if (process.env.NODE_ENV === 'test') {
  Storage._buildsPath = buildsPath;
  Storage._shasPath = shasPath;
}

module.exports = Storage;
