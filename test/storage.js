'use strict';

var bluebird = require('bluebird');

var path = require('path');
var mockFs = require('mock-fs');
var fs = bluebird.promisifyAll(require('fs-extra'));

var storage = require('../server/utils/storage');

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

  describe('startBuild', function() {
    var buildOptions = {
      head: 'abasdf',
      base: 'bjasdf',
      numBrowsers: 3
    };

    it('should throw if not given object', function() {
      return assert.isRejected(storage.startBuild());
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
        assert.shallowDeepEqual(data, buildOptions);
      });
    });
  });
});
