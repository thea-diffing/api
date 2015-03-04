'use strict';

var bluebird = require('bluebird');
var assert = require('assert');
var path = require('path');
var mockFs = require('mock-fs');
var fs = bluebird.promisifyAll(require('fs-extra'));

var storage = require('../server/utils/storage');

mockFs();

describe('Storage', function() {
  it('has _buildsPath', function() {
    assert(storage._buildsPath !== undefined);
  });

  describe('startBuild', function() {
    it('should return an id', function() {
      return storage.startBuild()
      .then(function(data) {
        assert.equal(typeof data, 'object');
        assert.equal(typeof data.id, 'string');
      });
    });

    it('should create a folder with json file', function() {
      var dir;

      return storage.startBuild()
      .then(function(data) {
        dir = path.join(storage._buildsPath, data.id);
        return fs.statAsync(dir);
      })
      .then(function(stat) {
        assert(stat.isDirectory());
      })
      .then(function() {
        var file = path.join(dir, 'build.json');
        return fs.readJSONAsync(file);
      })
      .then(function(file) {
        assert.equal(file.foo, 'foo');
      });
    });
  });

  describe('readFile', function() {
    // it('should read file', function() {
    //   return storage.readFile()
    //   .then(function(data) {
    //     assert.equal(data, 'foo');
    //   });
    // });

    it('should create file', function() {
      return storage.createFile()
      .then(function() {
        return fs.open('var/www/foo.txt', 'r');
      });
    });
  });
});
