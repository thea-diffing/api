'use strict';

var Bluebird = require('bluebird');

var path = require('path');
var fs = Bluebird.promisifyAll(require('fs-extra'));
var proxyquire = require('proxyquire');
require('mocha-sinon');
require('sinon-as-promised')(Bluebird);
var uuid = require('node-uuid');
var PNGImage = Bluebird.promisifyAll(require('pngjs-image'));
var Readable = require('stream').Readable;
var streamToPromise = require('stream-to-promise');

var TarHelper = require('../server/utils/tar-helper');
var dirHelper = require('../server/utils/dir-helper');

var IntegrationTest = require('../').integrationTests.storage;

describe('module/storage', function() {
  var storage;
  var dirHelperStub;

  var fakeImageStream;

  beforeEach(function() {
    dirHelperStub = {};

    var Storage = proxyquire('../server/utils/storage', {
      './dir-helper': dirHelperStub
    });

    storage = new Storage({
      dataPath: __TESTDATA__
    });

    fakeImageStream = new Readable;
    fakeImageStream.push('foo');
    fakeImageStream.push(null);
  });

  after(function() {
    return fs.removeAsync(__TESTDATA__);
  });

  describe('path generators', function() {
    it('should calculate buildPath', function() {
      var expectedBuildsPath = path.join(__TESTDATA__, 'project', 'builds');
      assert.equal(storage._getBuildsPath('project'), expectedBuildsPath);
    });

    it('should calculate shasPath', function() {
      var expectedShasPath = path.join(__TESTDATA__, 'project', 'shas');
      assert.equal(storage._getShasPath('project'), expectedShasPath);
    });
  });

  describe('#createProject', function() {
    describe('with valid args', function() {
      var options;

      beforeEach(function() {
        options = {
          github: {
            repository: 'foo'
          }
        };
      });

      it('should create a folder with json file', function() {
        var result;

        return storage.createProject(options)
        .then(function(data) {
          result = data;
          var dir = storage._getProjectPath(data.project);
          var file = path.join(dir, 'project.json');
          return fs.readJSONAsync(file);
        })
        .then(function(data) {
          assert.isObject(data);
          assert.isString(data.project);
          assert.equal(result.project, data.project);
          assert.shallowDeepEqual(data, options);
        });
      });
    });
  });

  describe('#startBuild', function() {

    describe('with valid args', function() {
      var buildOptions;

      beforeEach(function() {
        return storage.createProject({})
        .then(function(project) {
          buildOptions  = {
            project: project.project,
            head: uuid.v4(),
            base: uuid.v4(),
            numBrowsers: 3
          };
        });
      });

      it('should create a folder with json file', function() {
        var dir;

        return storage.startBuild(buildOptions)
        .then(function(data) {
          dir = path.join(storage._getBuildsPath(buildOptions.project), data.build);
        })
        .then(function() {
          var file = path.join(dir, 'build.json');
          return fs.readJSONAsync(file);
        })
        .then(function(data) {
          assert.isObject(data);
          assert.isString(data.build);
          assert.equal(data.status, 'pending');
          assert.isUndefined(data.project);

          delete buildOptions.project;
          assert.shallowDeepEqual(data, buildOptions);
        });
      });

      it('should call addBuildToSha for head and base', function() {
        var spy = this.sinon.spy(storage, 'addBuildToSha');

        return storage.startBuild(buildOptions)
        .then(function(build) {
          assert.calledWith(spy, {
            project: buildOptions.project,
            build: build.build,
            sha: buildOptions.head
          });

          assert.calledWith(spy, {
            project: buildOptions.project,
            build: build.build,
            sha: buildOptions.base
          });
        });
      });
    });
  });

  describe('#addBuildToSha', function() {
    describe('with invalid args', function() {
      it('should throw with no arg', function() {
        assert.throws(function() {
          return storage.addBuildToSha();
        });
      });

      it('should throw with no project', function() {
        assert.throws(function() {
          return storage.addBuildToSha({
            build: 'build',
            sha: 'sha'
          });
        });
      });

      it('should throw with only build', function() {
        assert.throws(function() {
          return storage.addBuildToSha({
            build: 'build'
          });
        });
      });

      it('should throw with only sha', function() {
        assert.throws(function() {
          return storage.addBuildToSha({
            sha: 'sha'
          });
        });
      });

      it('should reject with non existent project', function() {
        return assert.isRejected(storage.addBuildToSha({
          project: 'project',
          build: 'build',
          sha: 'sha'
        }));
      });
    });

    describe('with valid args', function() {
      var project;

      beforeEach(function() {
        this.sinon.stub(storage, 'hasBuild').resolves(true);

        return storage.createProject({})
        .then(function(result) {
          project = result.project;
        });
      });

      it('without existing sha creates a builds.json file', function() {
        var sha = uuid.v4();
        var build = uuid.v4();

        return storage.addBuildToSha({
          project: project,
          build: build,
          sha: sha
        })
        .then(function() {
          var shaBuildsPath = path.join(storage._getShasPath(project), sha, 'builds.json');
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

        var shaBuildsPath = path.join(storage._getShasPath(project), sha, 'builds.json');

        return storage.addBuildToSha({
          project: project,
          build: build1,
          sha: sha
        })
        .then(function() {
          return storage.addBuildToSha({
            project: project,
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
  });

  describe('#getBuildsForSha', function() {
    describe('with invalid args', function() {
      it('should throw with no arg', function() {
        assert.throws(function() {
          return storage.getBuildsForSha();
        });
      });

      it('should throw with non object options', function() {
        assert.throws(function() {
          return storage.getBuildsForSha(4);
        });
      });
    });

    describe('with valid args', function() {
      it('should reject if no project', function() {
        return assert.isRejected(storage.getBuildsForSha({
          project: 'project',
          sha: 'asfd'
        }));
      });

      it('should resolve builds if builds', function() {
        var project = uuid.v4();
        var build = uuid.v4();
        var sha = uuid.v4();

        this.sinon.stub(storage, 'hasProject').resolves(true);
        this.sinon.stub(storage, 'hasBuild').resolves(true);

        return storage.addBuildToSha({
          project: project,
          build: build,
          sha: sha
        })
        .then(function() {
          return storage.getBuildsForSha({
            project: project,
            sha: sha
          });
        })
        .then(function(builds) {
          assert.deepEqual(builds, [build]);
        });
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
      var project = uuid.v4();
      var sha = uuid.v4();
      var expectedSavePath = path.join(storage._getShasPath(project), sha, browser);

      this.sinon.stub(storage, 'hasProject').resolves(true);

      return storage.saveImages({
        project: project,
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

  describe('#getBrowsersForSha', function() {
    var project;
    var sha;
    var dirPath;

    beforeEach(function() {
      this.sinon.stub(storage, 'hasProject').resolves(true);

      project = uuid.v4();
      sha = uuid.v4();
      dirPath = path.join(storage._getShasPath(project), sha);
      return fs.ensureDirAsync(dirPath);
    });

    it('returns empty array if no browsers', function() {
      return storage.getBrowsersForSha({
        project: project,
        sha: sha
      })
      .then(function(browsers) {
        assert.equal(browsers.length, 0);
      });
    });

    it('returns one item if one folder', function() {
      return fs.ensureDirAsync(path.join(dirPath, 'Chrome'))
      .then(function() {
        return storage.getBrowsersForSha({
          project: project,
          sha: sha
        });
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
        return storage.getBrowsersForSha({
          project: project,
          sha: sha
        });
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
        return storage.getBrowsersForSha({
          project: project,
          sha: sha
        });
      })
      .then(function(browsers) {
        assert.equal(browsers.length, 2);
        assert(browsers.indexOf('Internet Explorer') !== -1);
        assert(browsers.indexOf('Chrome') !== -1);
      });
    });
  });

  describe('#getImagesForShaBrowser', function() {
    var project;

    beforeEach(function() {
      project = uuid.v4();

      dirHelperStub.readFiles = this.sinon.stub().resolves([]);

      this.sinon.stub(storage, 'hasProject').resolves(true);
    });

    it('should fulfill', function() {
      return assert.isFulfilled(storage.getImagesForShaBrowser({
        project: project,
        sha: 'foo',
        browser: 'Chrome'
      }));
    });

    it('should call readFiles', function() {
      var sha = 'foo';
      var browser = 'Internet Explorer';

      return storage.getImagesForShaBrowser({
        project: project,
        sha: sha,
        browser: browser
      })
      .then(function() {
        var browserPath = path.join(storage._getShasPath(project), sha, browser);

        assert.calledOnce(dirHelperStub.readFiles.withArgs(browserPath));
      });
    });
  });

  describe('#_getImageFromPath', function() {
    it('should return a stream', function() {
      var imageData = TarHelper.createImage();

      var project = uuid.v4();
      var sha = 'foo';
      var browser = 'Safari';
      var image = 'baz.png';

      var browserPath = path.join(storage._getShasPath(project), sha, browser);
      var imagePath = path.join(browserPath, image);

      return fs.ensureDirAsync(browserPath)
      .then(function() {
        var writeStream = fs.createWriteStream(imagePath);
        imageData.pipe(writeStream)

        return streamToPromise(writeStream);
      })
      .then(function() {
        return storage._getImageFromPath(imagePath);
      })
      .then(function(imageStream) {
        assert.instanceOf(imageStream, Readable);
      });
    });

    it('should reject if no image', function() {
      var badFile = path.join(__dirname, 'foo.png');

      return assert.isRejected(storage._getImageFromPath(badFile));
    });
  });

  describe('#getImage', function() {
    it('calls getImageFromPath', function() {
      this.sinon.stub(storage, 'hasProject').resolves(true);
      storage._getImageFromPath = this.sinon.stub().resolves(fakeImageStream);

      return storage.getImage({
        project: 'project',
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
      this.sinon.stub(storage, 'hasBuild').resolves(true);
      storage._getImageFromPath = this.sinon.stub().resolves(fakeImageStream);

      return storage.getDiff({
        project: 'project',
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
        project: 'project',
        build: 'build',
        browser: 'browser',
        imageName: 'navbar.png',
        imageData: TarHelper.createImage()
      };

      this.sinon.stub(storage, 'hasBuild').resolves(true);
    });

    it('should save a file', function() {
      var diffPath = path.join(
        storage._getBuildsPath(options.project),
        options.build,
        options.browser,
        options.imageName
      );

      return storage.saveDiffImage(options)
      .then(function() {
        return fs.statAsync(diffPath);
      })
      .then(function(file) {
        return assert(file.isFile());
      });
    });

    it('should save a readable image file', function() {
      var diffPath = path.join(
        storage._getBuildsPath(options.project),
        options.build,
        options.browser,
        options.imageName
      );

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

  (function() {
    var Storage = require('../server/utils/storage');
    var storage = new Storage({
      dataPath: __TESTDATA__
    });

    function storageGenerator() {
      return storage;
    }

    var integrationTest = new IntegrationTest();
    integrationTest.run(storageGenerator);
  })();
});
