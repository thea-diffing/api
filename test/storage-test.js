'use strict';

var Bluebird = require('bluebird');

var path = require('path');
var mockFs = require('mock-fs');
var fs = Bluebird.promisifyAll(require('fs-extra'));
var proxyquire = require('proxyquire');
require('mocha-sinon');
require('sinon-as-promised')(Bluebird);

var storage = require('../server/utils/storage');
var TarHelper = require('../server/utils/tarHelper');
var DirHelper = require('../server/utils/dirHelper');

describe('module/storage', function() {
  beforeEach(function() {
    mockFs();
  });

  afterEach(function() {
    mockFs.restore();
  });

  it('has _buildsPath', function() {
    assert(storage._buildsPath !== undefined);
  });

  it('has _shasPath', function() {
    assert(storage._shasPath !== undefined);
  });

  describe('#startBuild', function() {
    var buildOptions = {
      head: 'abasdf',
      base: 'bjasdf',
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

  describe('#saveImages', function() {
    var tarPath = path.join(__dirname, 'foo.tar.gz');

    beforeEach(function() {
      return TarHelper.createBrowserTar(tarPath);
    });

    it('should', function() {
      var sha = 'asdfasdf';
      var browser = 'Chrome 28';
      var expectedSavePath = path.join(sha, browser);

      return storage.saveImages({
        sha: sha,
        browser: browser,
        tarPath: tarPath
      })
      .then(function() {
        return DirHelper.readFiles(storage._shasPath);
      })
      .then(function(files) {
        return files.forEach(function(file) {
          assert(file.indexOf(expectedSavePath) !== -1);
        });
      });
    });
  });

  describe('#hasBuild', function() {
    var buildOptions = {
        head: 'abasdf',
        base: 'bjasdf',
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
        head: 'abasdf',
        base: 'bjasdf',
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

  describe('#getBrowsersForSha', function() {
    var dirPath = path.join(storage._shasPath, 'foo');

    beforeEach(function() {
      return fs.ensureDirAsync(dirPath);
    });

    it('returns empty array if no browsers', function() {
      return storage.getBrowsersForSha('foo')
      .then(function(browsers) {
        assert.equal(browsers.length, 0);
      });
    });

    it('returns one item if one folder', function() {
      return fs.ensureDirAsync(path.join(dirPath, 'Chrome'))
      .then(function() {
        return storage.getBrowsersForSha('foo');
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
        return storage.getBrowsersForSha('foo');
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
        return storage.getBrowsersForSha('foo');
      })
      .then(function(browsers) {
        assert.equal(browsers.length, 2);
        assert(browsers.indexOf('Internet Explorer') !== -1);
        assert(browsers.indexOf('Chrome') !== -1);
      });
    });
  });

  describe('#getImagesForShaBrowsers', function() {
    var readFilesSpy;
    var storage;

    beforeEach(function() {
      mockFs.restore();

      readFilesSpy = this.sinon.stub().resolves([]);
      var dirHelperStub = {
        '@noCallThru': true,
        readFiles: readFilesSpy
      };

      storage = proxyquire('../server/utils/storage', {
        './dirHelper': dirHelperStub
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

        assert.calledOnce(readFilesSpy.withArgs(browserPath));
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
      .then(function(data) {
        assert.deepEqual(data, {
          width: imageData.getWidth(),
          height: imageData.getHeight(),
          data: imageData.getBlob()
        });
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
        imageData: new Buffer([])
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
