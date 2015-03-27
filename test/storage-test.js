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
    storage._dataPath = __TESTDATA__;
  });

  after(function() {
    return fs.removeAsync(storage._dataPath);
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

  it('has _getBuildsPath', function() {
    assert(storage._getBuildsPath !== undefined);
  });

  describe('#hasProject', function() {
    it('returns false if folder does not exist');
    it('returns false if file in folder does not exist');
    it('returns true if json file in project exists');
  });

  describe('#hasBuild', function() {
    it('throws if project does not exist');
    it('returns false if build does not exist');
    it('returns true if project exists');
  });

  describe('#createProject', function() {
    describe('with invalid args', function() {
      it('should throw with no arg', function() {
        assert.throws(function() {
          return storage.createProject();
        });
      });

      it('should throw with non object arg', function() {
        assert.throws(function() {
          return storage.createProject('string');
        });
      });
    });

    describe('with valid args', function() {
      var options;

      beforeEach(function() {
        options = {
          github: {
            repository: 'foo'
          }
        };
      });

      it('should return an object with id', function() {
        return storage.createProject(options)
        .then(function(result) {
          assert.isObject(result);
          assert.isString(result.id);
        });
      });

      it('should create a folder with json file', function() {
        var result;

        return storage.createProject(options)
        .then(function(data) {
          result = data;
          var dir = storage._getProjectPath(data.id);
          var file = path.join(dir, 'project.json');
          return fs.readJSONAsync(file);
        })
        .then(function(data) {
          assert.isObject(data);
          assert.isString(data.id);
          assert.equal(result.id, data.id);
          assert.shallowDeepEqual(data, options);
        });
      });
    });
  });

  describe('#getProjectInfo', function() {
    it('should return info about the build');
  });

  describe('#startBuild', function() {
    describe('with invalid args', function() {
      it('should throw with no arg', function() {
        assert.throws(function() {
          return storage.startBuild();
        });
      });

      it('should throw with only an object', function() {
        assert.throws(function() {
          return storage.startBuild({});
        });
      });

      it('should throw with only head', function() {
        assert.throws(function() {
          return storage.startBuild({
            head: 'head'
          });
        });
      });

      it('should throw with only base', function() {
        assert.throws(function() {
          return storage.startBuild({
            base: 'base'
          });
        });
      });

      it('should throw with numBrowsers as string', function() {
        assert.throws(function() {
          return storage.startBuild({
            numBrowsers: '4'
          });
        });
      });

      it('should throw without numBrowsers', function() {
        assert.throws(function() {
          return storage.startBuild({
            head: 'head',
            base: 'base'
          });
        });
      });

      it('should throw if project does not exist');
    });

    describe('with valid args', function() {
      var buildOptions;

      beforeEach(function() {
        buildOptions  = {
          project: uuid.v4(),
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
          dir = path.join(storage._getBuildsPath(buildOptions.project), data.id);
        })
        .then(function() {
          var file = path.join(dir, 'build.json');
          return fs.readJSONAsync(file);
        })
        .then(function(data) {
          assert.isObject(data);
          assert.isString(data.id);
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
            build: build.id,
            sha: buildOptions.head
          });

          assert.calledWith(spy, {
            project: buildOptions.project,
            build: build.id,
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
    });

    describe('with valid args', function() {
      it('without existing sha creates a builds.json file', function() {
        var project = uuid.v4();
        var build = uuid.v4();
        var sha = uuid.v4();

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
        var project = uuid.v4();
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
      it('should reject if no build', function() {
        assert.isRejected(storage.getBuildsForSha({
          project: 'project',
          sha: 'asfd'
        }));
      });

      it('should resolve builds if builds', function() {
        var project = uuid.v4();
        var build = uuid.v4();
        var sha = uuid.v4();

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

  describe('#hasBuild', function() {
    describe('with invalid args', function() {
      it('should throw with non string id', function() {
        assert.throws(function() {
          return storage.hasBuild(4);
        });
      });
    });

    describe('with valid args', function() {
      var projectOptions = {
      };

      var buildOptions = {
        head: 'head',
        base: 'base',
        numBrowsers: 3
      };

      it('should have no build if project does not exist');

      it('should have no build if startBuild not called', function() {
        return storage.createProject(projectOptions)
        .then(function(project) {
          return storage.hasBuild({
            project: project,
            build: 'asdf'
          })
          .then(function(status) {
            assert.isFalse(status);
          });
        });
      });

      it('should have build if startBuild called', function() {
        return storage.createProject(projectOptions)
        .then(function(project) {
          buildOptions.project = project;

          return storage.startBuild(buildOptions)
          .then(function(data) {
            return storage.hasBuild({
              project: project,
              build: data.id
            });
          })
          .then(function(status) {
            assert.isTrue(status);
          });
        });
      });

      it('should not have build if different id than startBuild', function() {
        return storage.createProject(projectOptions)
        .then(function(project) {
          buildOptions.project = project;

          return storage.startBuild(buildOptions)
          .then(function(data) {
            return storage.hasBuild({
              project: project,
              build: data.id + '_'
            });
          })
          .then(function(status) {
            assert.isFalse(status);
          });
        });
      });
    });
  });

  describe('#getBuildInfo', function() {
    describe('with invalid args', function() {
      it('should throw with non string id', function() {
        assert.throws(function() {
          return storage.getBuildInfo({
            project: 'project',
            id: 4
          });
        });
      });
    });

    describe('with valid args', function() {
      var projectSettings;

      beforeEach(function() {
        projectSettings = {};
      });

      it('should reject non existent project', function() {
        return assert.isRejected(storage.getBuildInfo({
          project: 'project',
          id: 'foo'
        }), /Unknown Build/);
      });

      it('should reject non existent build', function() {
        return storage.createProject(projectSettings)
        .then(function(project) {
          return assert.isRejected(storage.getBuildInfo({
            project: project,
            id: 'foo'
          }), /Unknown Build/);
        });
      });

      it('should return build info', function() {
        var buildOptions = {
          head: 'head',
          base: 'base',
          numBrowsers: 3
        };

        var buildId;

        return storage.createProject(projectSettings)
        .then(function(project) {
          buildOptions.project = project;

          return storage.startBuild(buildOptions)
          .then(function(data) {
            buildId = data.id;
          })
          .then(function() {
            return storage.getBuildInfo({
              project: project,
              id: buildId
            });
          })
          .then(function(data) {
            assert.isObject(data);
            assert.isString(data.id);
            assert.equal(data.status, 'pending');
            assert.isUndefined(data.project);

            delete buildOptions.project;
            assert.shallowDeepEqual(data, buildOptions);
          });
        });
      });
    });
  });

  describe('#updateBuildInfo', function() {
    var projectId;
    var buildId;

    beforeEach(function() {
      return storage.createProject({})
      .then(function(project) {
        projectId = project;
      })
      .then(function() {
        var buildOptions = {
          project: projectId,
          head: 'head',
          base: 'base',
          numBrowsers: 3
        };

        return storage.startBuild(buildOptions);
      })
      .then(function(data) {
        buildId = data.id;
      });
    });

    describe('with success', function() {
      beforeEach(function() {
        return storage.updateBuildInfo({
          project: projectId,
          id: buildId,
          status: 'success'
        });
      });

      it('should write success', function() {
        return storage.getBuildInfo({
          project: projectId,
          id: buildId
        })
        .then(function(buildInfo) {
          assert.equal(buildInfo.status, 'success');
        });
      });

      it('should not have a diff', function() {
        return storage.getBuildInfo({
          project: projectId,
          id: buildId
        })
        .then(function(buildInfo) {
          assert.isUndefined(buildInfo.diff);
        });
      });
    });

    describe('with failure', function() {
      var newBuildInfo;

      beforeEach(function() {
        newBuildInfo = {
          project: projectId,
          id: buildId,
          status: 'failed',
          diff: {
            Chrome: ['image1.png,', 'image2.png'],
            Firefox: ['image1.png']
          }
        };

        return storage.updateBuildInfo(newBuildInfo);
      });

      it('should write failure', function() {
        return storage.getBuildInfo({
          project: projectId,
          id: buildId
        })
        .then(function(buildInfo) {
          assert.equal(buildInfo.status, 'failed');
        });
      });

      it('should have a diff', function() {
        return storage.getBuildInfo({
          project: projectId,
          id: buildId
        })
        .then(function(buildInfo) {
          assert.deepEqual(buildInfo.diff, newBuildInfo.diff);
        });
      });
    });
  });

  describe('#getBrowsersForSha', function() {
    var project;
    var sha;
    var dirPath;

    beforeEach(function() {
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
    var readFilesStub;
    var storage;

    beforeEach(function() {
      project = uuid.v4();

      readFilesStub = this.sinon.stub().resolves([]);

      storage = proxyquire('../server/utils/storage', {
        './dirHelper': {
          readFiles: readFilesStub
        }
      });
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

        assert.calledOnce(readFilesStub.withArgs(browserPath));
      });
    });
  });

  describe('#_getImageFromPath', function() {
    it('should return width, height, and data', function() {
      var imageData = TarHelper.createImage();

      var project = uuid.v4();
      var sha = 'foo';
      var browser = 'Safari';
      var image = 'baz.png';

      var browserPath = path.join(storage._getShasPath(project), sha, browser);
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
      storage._getImageFromPath = this.sinon.stub().resolves();

      storage.getDiff({
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
        imageData: TarHelper.createImage().getImage()
      };
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
});
