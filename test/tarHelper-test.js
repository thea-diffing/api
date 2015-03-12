'use strict';

var Bluebird = require('bluebird');
var TarHelper = require('../server/utils/tarHelper');
var PNGImage = Bluebird.promisifyAll(require('pngjs-image'));
var fs = Bluebird.promisifyAll(require('fs-extra'));
var path = require('path');

describe('module/tarHelper', function() {
  describe('getFilesInTar', function() {
    it('should read files', function() {
      var fixturePath = path.join(__dirname, 'fixtures', 'simple.tar.gz');
      return TarHelper.getFilesInTar(fixturePath)
      .then(function(files) {
        assert.equal(files.length, 2);
        assert(files.indexOf('foo.png') !== -1);
        assert(files.indexOf(path.join('deeper','bar.png')) !== -1);
      });
    });
  });
});

describe('TarHelper', function() {
  describe('createImage', function() {
    it('should create a saveable image', function() {
      var image = TarHelper.createImage();
      var fileName = 'foo.png';

      return image.writeImageAsync(fileName)
      .then(function() {
        return PNGImage.readImageAsync(fileName);
      })
      .then(function(file) {
        assert.equal(file.getWidth(), image.getWidth());
        assert.equal(file.getHeight(), image.getHeight());
      })
      .then(function() {
        return fs.removeAsync(fileName);
      });
    });
  });

  describe('createBrowserTar', function() {
    it('should create a tar', function() {
      var fileName = path.join(__dirname, 'foo.tar.gz');

      return TarHelper.createBrowserTar(fileName)
      .then(function() {
        return TarHelper.getFilesInTar(fileName);
      })
      .then(function(files) {
        assert.equal(files.length, 4);

        var expectedFiles = [
          'homepage.search.700.png',
          'homepage.search.1300.png',
          'homepage.form.700.png',
          'homepage.form.1300.png'
        ];

        return expectedFiles.forEach(function(expected) {
          assert(files.indexOf(expected) !== -1);
        });
      })
      .then(function() {
        return fs.removeAsync(fileName);
      });
    });
  });
});
