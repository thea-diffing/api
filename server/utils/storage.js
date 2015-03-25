'use strict';

var assert = require('chai').assert;
var Bluebird = require('bluebird');
var fs = Bluebird.promisifyAll(require('fs-extra'));
var path = require('path');
var uuid = require('node-uuid');
var PNGImage = Bluebird.promisifyAll(require('pngjs-image'));
var dirHelper = require('./dirHelper');
var tarHelper = require('./tarHelper');

var root = path.join(__dirname, '..', '..');
var dataPath = path.join(root, 'data');
var buildsPath = path.join(dataPath, 'builds');
var shasPath = path.join(dataPath, 'shas');

function getImageFromPath(path) {
  return new Bluebird(function(resolve, reject) {
    var domain = require('domain').create();
    domain.on('error', function(err) {
      reject(err);
    });

    domain.run(function() {
      PNGImage.readImageAsync(path)
      .then(function(image) {
        resolve(image.getImage());
      })
      .catch(function(err) {
        reject(err);
      });
    });
  });
}

var Storage = {
  startBuild: function(options) {
    assert.isObject(options);
    assert.isString(options.head);
    assert.isString(options.base);
    assert.isNumber(options.numBrowsers);

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

  addBuildToSha: function(options) {
    assert.isObject(options);
    assert.isString(options.build);
    assert.isString(options.sha);

    var build = options.build;
    var sha = options.sha;

    var shaBuildsPath = path.join(shasPath, sha);
    var shaBuildsFile = path.join(shaBuildsPath, 'builds.json');

    return fs.ensureDirAsync(shaBuildsPath)
    .then((function() {
      return this.getBuildsForSha(sha);
    }).bind(this))
    .then(function(builds) {
      builds.push(build);
      return builds;
    }, function() {
      return [build];
    })
    .then(function(buildsArray) {
      return fs.outputJSONAsync(shaBuildsFile, {
        builds: buildsArray
      });
    });
  },

  getBuildsForSha: function(sha) {
    assert.isString(sha);

    var shaBuildsPath = path.join(shasPath, sha);
    var shaBuildsFile = path.join(shaBuildsPath, 'builds.json');

    return new Bluebird(function(resolve, reject) {
      try {
        var file = fs.readJSONSync(shaBuildsFile);
        resolve(file.builds);
      }
      catch(err) {
        reject();
      }
    });
  },

  hasBuild: function(id) {
    assert.isString(id);

    return fs.statAsync(path.join(buildsPath, id))
    .then(function(stat) {
      return stat.isDirectory();
    })
    .catch(function(err) {
      return false;
    });
  },

  getBuildInfo: function(id) {
    assert.isString(id);

    var buildFile = path.join(buildsPath, id, 'build.json');

    return fs.readJSONAsync(buildFile)
    .catch(function() {
      throw Error('Unknown Build');
    });
  },

  updateBuildInfo: function(id, options) {
    assert.isString(id);
    assert.isObject(options);
    assert.include(['success', 'failed'], options.status);

    if (options.diff) {
      assert.isObject(options.diff);
    }

    var buildFile = path.join(buildsPath, id, 'build.json');
    var status = options.status;
    var diff = options.diff;

    return fs.readJSONAsync(buildFile)
    .then(function(data) {
      data.status = status;

      if (status === 'success') {
        delete data.diff;
      } else if (status === 'failed') {
        data.diff = diff;
      }

      return fs.outputJSONAsync(buildFile, data);
    });
  },

  saveImages: function(options) {
    assert.isObject(options);
    assert.isString(options.browser);
    assert.isString(options.tarPath);

    var extractPath = path.join(shasPath, options.sha, options.browser);

    return fs.ensureDirAsync(extractPath)
    .then(function() {
      return tarHelper.extractTar(options.tarPath, extractPath);
    });
  },

  getBrowsersForSha: function(sha) {
    assert.isString(sha);

    var shaPath = path.join(shasPath, sha);

    return fs.readdirAsync(shaPath)
    .then(function(files) {
      return files.filter(function(file) {
        return fs.statSync(path.join(shaPath, file)).isDirectory();
      });
    });
  },

  getImagesForShaBrowser: function(options) {
    assert.isObject(options);
    assert.isString(options.sha);
    assert.isString(options.browser);

    var sha = options.sha;
    var browser = options.browser;

    var browserPath = path.join(shasPath, sha, browser);
    return dirHelper.readFiles(browserPath);
  },

  /*
  resolves pngjs
  */
  getImage: function(options) {
    assert.isObject(options);
    assert.isString(options.browser);
    assert.isString(options.image);

    var sha = options.sha;
    var browser = options.browser;
    var image = options.image;

    var imagePath = path.join(shasPath, sha, browser, image);

    return getImageFromPath(imagePath);
  },

  /*
  resolve pngjs
  */
  getDiff: function(options) {
    assert.isObject(options);
    assert.isString(options.build);
    assert.isString(options.browser);
    assert.isString(options.image);

    var build = options.build;
    var browser = options.browser;
    var image = options.image;

    var imagePath = path.join(buildsPath, build, browser, image);

    return getImageFromPath(imagePath);
  },

  /*
  options.build string
  options.browser string
  options.imageName string
  options.imageData pngjs
  */
  saveDiffImage: function(options) {
    assert.isObject(options);
    assert.isString(options.build);
    assert.isString(options.browser);
    assert.isString(options.imageName);
    assert.isObject(options.imageData);
    assert.property(options.imageData, 'pack');

    var build = options.build;
    var browser = options.browser;
    var imageName = options.imageName;
    var imageData = options.imageData;

    var folder = path.join(buildsPath, build, browser);
    var imagePath = path.join(folder, imageName);

    return fs.ensureDirAsync(folder)
    .then(function() {
      return new Bluebird(function(resolve) {
        imageData.pack().on('end', function() {
          resolve();
        })
        .pipe(fs.createWriteStream(imagePath));
      });
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

  Object.defineProperty(Storage, '_getImageFromPath', {
    get: function() {
      return getImageFromPath;
    },
    set: function(newFunc) {
      getImageFromPath = newFunc;
    }
  });
}

module.exports = Storage;
