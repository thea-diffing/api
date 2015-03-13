'use strict';

var Bluebird = require('bluebird');

var path = require('path');
var fs = Bluebird.promisifyAll(require('fs-extra'));
var proxyquire = require('proxyquire');
require('mocha-sinon');
require('sinon-as-promised')(Bluebird);
var recursiveAsync = Bluebird.promisify(require('recursive-readdir'));
var uuid = require('node-uuid');

var storage = require('../server/utils/storage');
var TarHelper = require('../server/utils/tarHelper');

describe('module/storage', function() {
  var testDataPath;

  before(function() {
    testDataPath = path.join(__dirname, '..', 'test-data');
    storage._buildsPath = path.join(testDataPath, 'builds');
    storage._shasPath = path.join(testDataPath, 'shas');
  });

  after(function() {
    return fs.removeAsync(testDataPath);
  });

  it('has _buildsPath', function() {
    assert(storage._buildsPath !== undefined);
  });

  it('has _shasPath', function() {
    assert(storage._shasPath !== undefined);
  });

  describe('#startBuild', function() {
    var buildOptions = {
      head: 'head',
      base: 'base',
      numBrowsers: 3
    };

    it('should return an id', function() {
      return storage.startBuild(buildOptions)
      .then(function(data) {
        assert.isObject(data);
        assert.isString(data.id);
      });
    });

    it('should create a folder with json file', function() {
      var dir;

      return storage.startBuild(buildOptions)
      .then(function(data) {
        dir = path.join(storage._buildsPath, data.id);
      })
      .then(function() {
        var file = path.join(dir, 'build.json');
        return fs.readJSONAsync(file);
      })
      .then(function(data) {
        assert.isObject(data);
        assert.isString(data.id);
        assert.equal(data.status, 'pending');
        assert.shallowDeepEqual(data, buildOptions);
      });
    });
  });

  describe('#addBuildToSha', function() {
    it('without existing sha creates a builds.json file', function() {
      var build = uuid.v4();
      var sha = uuid.v4();

      return storage.addBuildToSha({
        build: build,
        sha: sha
      })
      .then(function() {
        var shaBuildsPath = path.join(storage._shasPath, sha, 'builds.json');
        return fs.readJSONAsync(shaBuildsPath);
      })
      .then(function(data) {
        assert.deepEqual(data.builds, [build]);
      });

    });

    it('with existing sha adds to builds.json file', function() {
      var build1 = uuid.v4();
      var build2 = uuid.v4();
      var sha = uuid.v4();

      var shaBuildsPath = path.join(storage._shasPath, sha, 'builds.json');

      return storage.addBuildToSha({
        build: build1,
        sha: sha
      })
      .then(function() {
        return storage.addBuildToSha({
          build: build2,
          sha: sha
        });
      })
      .then(function() {
        return fs.readJSONAsync(shaBuildsPath);
      })
      .then(function(data) {
        assert.deepEqual(data.builds, [build1, build2]);
      });
    });
  });

  describe('#saveImages', function() {
    var tarPath;

    beforeEach(function() {
      tarPath = path.join(testDataPath, uuid.v4());
      return TarHelper.createBrowserTar(tarPath);
    });

    it('should untar to folder', function() {
      var sha = uuid.v4();
      var browser = 'Chrome 28';
      var expectedSavePath = path.join(storage._shasPath, sha, browser);

      return storage.saveImages({
        sha: sha,
        browser: browser,
        tarPath: tarPath
      })
      .then(function() {
        return recursiveAsync(expectedSavePath);
      })
      .then(function(files) {
        assert.equal(files.length, 4);
      });
    });
  });

  describe('#hasBuild', function() {
    var buildOptions = {
      head: 'head',
      base: 'base',
      numBrowsers: 3
    };

    it('should have no build if startBuild not called', function() {
      return storage.hasBuild('asdf')
      .then(function(status) {
        assert.isFalse(status);
      });
    });

    it('should have build if startBuild called', function() {
      return storage.startBuild(buildOptions)
      .then(function(data) {
        return storage.hasBuild(data.id);
      })
      .then(function(status) {
        assert.isTrue(status);
      });
    });

    it('should not have build if different id than startBuild', function() {
      return storage.startBuild(buildOptions)
      .then(function(data) {
        return storage.hasBuild(data.id + '_');
      })
      .then(function(status) {
        assert.isFalse(status);
      });
    });
  });

  describe('#getBuildInfo', function() {
    it('should reject non existent build', function() {
      assert.isRejected(storage.getBuildInfo('foo'), /Unknown Build/);
    });

    it('should return build info', function() {
      var buildOptions = {
        head: 'head',
        base: 'base',
        numBrowsers: 3
      };

      var buildId;

      return storage.startBuild(buildOptions)
      .then(function(data) {
        buildId = data.id;
      })
      .then(function() {
        return storage.getBuildInfo(buildId);
      })
      .then(function(data) {
        assert.isObject(data);
        assert.isString(data.id);
        assert.equal(data.status, 'pending');
        assert.shallowDeepEqual(data, buildOptions);
      });
    });
  });

  describe('#updateBuildInfo', function() {
    var buildId;

    beforeEach(function() {
      var buildOptions = {
        head: 'head',
        base: 'base',
        numBrowsers: 3
      };

      return storage.startBuild(buildOptions)
      .then(function(data) {
        buildId = data.id;
      });
    });

    describe('with success', function() {
      beforeEach(function() {
        return storage.updateBuildInfo(buildId, {
          status: 'success'
        });
      });

      it('should write success', function() {
        return storage.getBuildInfo(buildId)
        .then(function(buildInfo) {
          assert.equal(buildInfo.status, 'success');
        });
      });

      it('should not have a diff', function() {
        return storage.getBuildInfo(buildId)
        .then(function(buildInfo) {
          assert.isUndefined(buildInfo.diff);
        });
      });
    });

    describe('with failure', function() {
      var newBuildInfo;

      beforeEach(function() {
        newBuildInfo = {
          status: 'failure',
          diff: {
            Chrome: ['image1.png,', 'image2.png'],
            Firefox: ['image1.png']
          }
        };

        return storage.updateBuildInfo(buildId, newBuildInfo);
      });

      it('should write failure', function() {
        return storage.getBuildInfo(buildId)
        .then(function(buildInfo) {
          assert.equal(buildInfo.status, 'failure');
        });
      });

      it('should have a diff', function() {
        return storage.getBuildInfo(buildId)
        .then(function(buildInfo) {
          assert.deepEqual(buildInfo.diff, newBuildInfo.diff);
        });
      });
    });
  });

  describe('#getBrowsersForSha', function() {
    var sha;
    var dirPath;

    beforeEach(function() {
      sha = uuid.v4();
      dirPath = path.join(storage._shasPath, sha);
      return fs.ensureDirAsync(dirPath);
    });

    it('returns empty array if no browsers', function() {
      return storage.getBrowsersForSha(sha)
      .then(function(browsers) {
        assert.equal(browsers.length, 0);
      });
    });

    it('returns one item if one folder', function() {
      return fs.ensureDirAsync(path.join(dirPath, 'Chrome'))
      .then(function() {
        return storage.getBrowsersForSha(sha);
      })
      .then(function(browsers) {
        assert.deepEqual(browsers, ['Chrome']);
      });
    });

    it('returns one item if one folder and one file', function() {
      return fs.ensureDirAsync(path.join(dirPath, 'Internet Explorer'))
      .then(function() {
        return fs.ensureFileAsync(path.join(dirPath, 'foo.txt'));
      })
      .then(function() {
        return storage.getBrowsersForSha(sha);
      })
      .then(function(browsers) {
        assert.deepEqual(browsers, ['Internet Explorer']);
      });
    });

    it('returns two items if two folders', function() {
      return fs.ensureDirAsync(path.join(dirPath, 'Internet Explorer'))
      .then(function() {
        return fs.ensureDirAsync(path.join(dirPath, 'Chrome'));
      })
      .then(function() {
        return storage.getBrowsersForSha(sha);
      })
      .then(function(browsers) {
        assert.equal(browsers.length, 2);
        assert(browsers.indexOf('Internet Explorer') !== -1);
        assert(browsers.indexOf('Chrome') !== -1);
      });
    });
  });

  describe('#getImagesForShaBrowser', function() {
    var readdirSpy;
    var storage;

    beforeEach(function() {
      readdirSpy = this.sinon.stub().callsArgWith(1, null, []);

      storage = proxyquire('../server/utils/storage', {
        'recursive-readdir': readdirSpy
      });
    });

    it('should fulfill', function() {
      return assert.isFulfilled(storage.getImagesForShaBrowser({
        sha: 'foo',
        browser: 'Chrome'
      }));
    });

    it('should call readFiles', function() {
      var sha = 'foo';
      var browser = 'Internet Explorer';

      return storage.getImagesForShaBrowser({
        sha: sha,
        browser: browser
      })
      .then(function() {
        var browserPath = path.join(storage._shasPath, sha, browser);

        assert.calledOnce(readdirSpy.withArgs(browserPath));
      });
    });
  });

  describe('#getImage', function() {
    it('should return width, height, and data', function() {
      var imageData = TarHelper.createImage();

      var sha = 'foo';
      var browser = 'Safari';
      var image = 'baz.png';

      var browserPath = path.join(storage._shasPath, sha, browser);
      var imagePath = path.join(browserPath, image);

      return fs.ensureDirAsync(browserPath)
      .then(function() {
        return imageData.writeImageAsync(imagePath);
      })
      .then(function() {
        return storage.getImage({
          sha: sha,
          browser: browser,
          image: image
        });
      })
      .then(function(image) {
        assert.isDefined(image.width);
        assert.isDefined(image.height);
        assert.isDefined(image.data);
        assert.isDefined(image.gamma);
      });
    });
  });

  describe('#saveDiffImage', function() {
    var options;

    beforeEach(function() {
      options = {
        build: 'build',
        browser: 'browser',
        imageName: 'navbar.png',
        imageData: TarHelper.createImage().getImage()
      };
    });

    it('should save a file', function() {
      var diffPath = path.join(storage._buildsPath, options.build, options.browser, options.imageName);

      return storage.saveDiffImage(options)
      .then(function() {
        return fs.statAsync(diffPath);
      })
      .then(function(file) {
        return assert(file.isFile());
      });
    });

    it('should swallow any output', function() {
      return storage.saveDiffImage(options)
      .then(function(output) {
        assert.isUndefined(output);
      });
    });
  });
});
