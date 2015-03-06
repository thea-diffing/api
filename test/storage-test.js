'use strict';

var Bluebird = require('bluebird');

var path = require('path');
var mockFs = require('mock-fs');
var fs = Bluebird.promisifyAll(require('fs-extra'));

var storage = require('../server/utils/storage');
var TarHelper = require('../server/utils/tarHelper');
var DirHelper = require('../server/utils/dirHelper');

describe('Storage', function() {
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

  describe('startBuild', function() {
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
        assert.shallowDeepEqual(data, buildOptions);
      });
    });
  });

  describe('saveImages', function() {
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
});
