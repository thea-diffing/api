'use strict';

var Bluebird = require('bluebird');

var path = require('path');
var fs = Bluebird.promisifyAll(require('fs-extra'));
var proxyquire = require('proxyquire');
require('mocha-sinon');
require('sinon-as-promised')(Bluebird);
var uuid = require('node-uuid');
var PNGImage = Bluebird.promisifyAll(require('pngjs-image'));

var storage = require('../server/utils/storage');
var TarHelper = require('../server/utils/tarHelper');
var dirHelper = require('../server/utils/dirHelper');

describe('module/storage', function() {
  before(function() {
    storage._buildsPath = path.join(__TESTDATA__, 'builds');
    storage._shasPath = path.join(__TESTDATA__, 'shas');
  });

  after(function() {
    return Bluebird.all([
      fs.removeAsync(storage._buildsPath),
      fs.removeAsync(storage._shasPath)
    ]);
  });

  it('has _buildsPath', function() {
    assert(storage._buildsPath !== undefined);
  });

  it('has _shasPath', function() {
    assert(storage._shasPath !== undefined);
  });

  describe('#startBuild', function() {
    var buildOptions;

    beforeEach(function() {
      buildOptions  = {
        head: uuid.v4(),
        base: uuid.v4(),
        numBrowsers: 3
      };
    });

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

    it('should call addBuildToSha for head and base', function() {
      var spy = this.sinon.spy(storage, 'addBuildToSha');

      return storage.startBuild(buildOptions)
      .then(function(build) {
        assert.calledWith(spy, {
          build: build.id,
          sha: buildOptions.head
        });

        assert.calledWith(spy, {
          build: build.id,
          sha: buildOptions.base
        });
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

  describe('#getBuildsForSha', function() {
    it('should reject if no build', function() {
      assert.isRejected(storage.getBuildsForSha('asfd'));
    });

    it('should resolve builds if builds', function() {
      var build = uuid.v4();
      var sha = uuid.v4();

      return storage.addBuildToSha({
        build: build,
        sha: sha
      })
      .then(function() {
        return storage.getBuildsForSha(sha);
      })
      .then(function(builds) {
        assert.deepEqual(builds, [build]);
      });
    });
  });

  describe('#saveImages', function() {
    var tarPath;
    var browser;

    beforeEach(function() {
      browser = 'Chrome 28';
      tarPath = path.join(__TESTDATA__, uuid.v4());
      return TarHelper.createBrowserTar('fakeBrowser', tarPath);
    });

    afterEach(function() {
      return fs.removeAsync(tarPath);
    });

    it('should untar to folder without extra folder', function() {
      var sha = uuid.v4();
      var expectedSavePath = path.join(storage._shasPath, sha, browser);

      return storage.saveImages({
        sha: sha,
        browser: browser,
        tarPath: tarPath
      })
      .then(function() {
        return dirHelper.readFiles(expectedSavePath);
      })
      .then(function(files) {
        assert.equal(files.length, 4);

        files.forEach(function(file) {
          assert(file.indexOf('fakeBrowser') === -1);
        });
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
          status: 'failed',
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
          assert.equal(buildInfo.status, 'failed');
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
    var readFilesStub;
    var storage;

    beforeEach(function() {
      readFilesStub = this.sinon.stub().resolves([]);

      storage = proxyquire('../server/utils/storage', {
        './dirHelper': {
          readFiles: readFilesStub
        }
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

        assert.calledOnce(readFilesStub.withArgs(browserPath));
      });
    });
  });

  describe('#_getImageFromPath', function() {
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
        return storage._getImageFromPath(imagePath);
      })
      .then(function(image) {
        assert.isDefined(image.width);
        assert.isDefined(image.height);
        assert.isDefined(image.data);
        assert.isDefined(image.gamma);
      });
    });

    it('should reject if no image', function() {
      var badFile = path.join(__dirname, 'foo.png');

      assert.isRejected(storage._getImageFromPath(badFile));
    });
  });

  describe('#getImage', function() {
    it('calls getImageFromPath', function() {
      storage._getImageFromPath = this.sinon.stub().resolves();

      storage.getImage({
        sha: 'sha',
        browser: 'browser',
        image: 'file.png'
      })
      .then(function() {
        assert.calledOnce(storage._getImageFromPath);
      });
    });
  });

  describe('#getDff', function() {
    it('calls getImageFromPath', function() {
      storage._getImageFromPath = this.sinon.stub().resolves();

      storage.getDiff({
        build: 'build',
        browser: 'browser',
        image: 'file.png'
      })
      .then(function() {
        assert.calledOnce(storage._getImageFromPath);
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

    it('should save a readable image file', function() {
      var diffPath = path.join(storage._buildsPath, options.build, options.browser, options.imageName);

      return storage.saveDiffImage(options)
      .then(function() {
        return PNGImage.readImageAsync(diffPath);
      })
      .then(function(file) {
        assert.isAbove(file.getWidth(), 0);
        assert.isAbove(file.getHeight(), 0);
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
