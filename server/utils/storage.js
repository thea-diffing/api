'use strict';

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
      } else if (status === 'failed') {
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
      return tarHelper.extractTar(options.tarPath, extractPath);
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
    return dirHelper.readFiles(browserPath);
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

    return getImageFromPath(imagePath);
  },

  /*
  options.build string
  options.browser string
  options.image string

  resolve pngjs
  */
  getDiff: function(options) {
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
