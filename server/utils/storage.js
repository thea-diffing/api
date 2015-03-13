'use strict';

var Bluebird = require('bluebird');
var fs = Bluebird.promisifyAll(require('fs-extra'));
var path = require('path');
var uuid = require('node-uuid');
var tar = require('tar-fs');
var PNGImage = Bluebird.promisifyAll(require('pngjs-image'));
var recursiveAsync = Bluebird.promisify(require('recursive-readdir'));

var root = path.join(__dirname, '..', '..');
var dataPath = path.join(root, 'data');
var buildsPath = path.join(dataPath, 'builds');
var shasPath = path.join(dataPath, 'shas');

var Storage = {
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
    .then((function() {
      return Bluebird.all([
        this.addBuildToSha({
          build: guid,
          sha: options.head
        }),
        this.addBuildToSha({
          build: guid,
          sha: options.base
        })
      ]);
    }).bind(this))
    .then(function() {
      return {
        id: guid
      };
    });
  },

  /*
  build string
  sha string
  */
  addBuildToSha: function(options) {
    var build = options.build;
    var sha = options.sha;

    var shaBuildsPath = path.join(shasPath, sha);
    var shaBuildsFile = path.join(shaBuildsPath, 'builds.json');

    return fs.ensureDirAsync(shaBuildsPath)
    .then(function() {
      return new Bluebird(function(resolve) {
        try {
          var stat = fs.statSync(shaBuildsFile);
          resolve({
            exists: stat.isFile()
          });
        }
        catch(err) {
          resolve({
            exists: false
          });
        }
      });
    })
    .then(function(result) {
      if (result.exists === true) {
        return fs.readJSONAsync(shaBuildsFile)
        .then(function(fileContents) {
          var builds = fileContents.builds;
          builds.push(build);
          return builds;
        });
      } else {
        return [build];
      }
    })
    .then(function(buildsArray) {
      return fs.outputJSONAsync(shaBuildsFile, {
        builds: buildsArray
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
    .catch(function(err) {
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
  id string
  options.status string
  [options.diff object]
  */
  updateBuildInfo: function(id, options) {
    var buildFile = path.join(buildsPath, id, 'build.json');
    var status = options.status;
    var diff = options.diff;

    return fs.readJSONAsync(buildFile)
    .then(function(data) {
      data.status = status;

      if (status === 'success') {
        delete data.diff;
      } else if (status === 'failure') {
        data.diff = diff;
      }

      return fs.outputJSONAsync(buildFile, data);
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
  },

  /*
  options.sha string
  options.browser string
  */
  getImagesForShaBrowser: function(options) {
    var sha = options.sha;
    var browser = options.browser;

    var browserPath = path.join(shasPath, sha, browser);

    return recursiveAsync(browserPath);
  },

  /*
  options.sha string
  options.browser string
  options.image string

  resolves pngjs
  */
  getImage: function(options) {
    var sha = options.sha;
    var browser = options.browser;
    var image = options.image;

    var imagePath = path.join(shasPath, sha, browser, image);

    return PNGImage.readImageAsync(imagePath)
    .then(function(image) {
      return image.getImage();
    });
  },

  /*
  options.build string
  options.browser string
  options.imageName string
  options.imageData pngjs
  */
  saveDiffImage: function(options) {
    var build = options.build;
    var browser = options.browser;
    var imageName = options.imageName;
    var imageData = options.imageData;

    var imagePath = path.join(buildsPath, build, browser, imageName);

    return fs.outputFileAsync(imagePath, imageData)
    .then(function() {
      // Keep any data from returning
    });
  }
};

if (process.env.NODE_ENV === 'test') {
  Object.defineProperty(Storage, '_buildsPath', {
    get: function() {
      return buildsPath;
    },
    set: function(newPath) {
      buildsPath = newPath;
    }
  });

  Object.defineProperty(Storage, '_shasPath', {
    get: function() {
      return shasPath;
    },
    set: function(newPath) {
      shasPath = newPath;
    }
  });
}

module.exports = Storage;
