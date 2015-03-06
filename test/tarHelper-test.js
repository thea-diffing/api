'use strict';

var Bluebird = require('bluebird');
var mockFs = require('mock-fs');
var TarHelper = require('./utils/tarHelper');
var PNGImage = Bluebird.promisifyAll(require('pngjs-image'));
var path = require('path');

describe('TarHelper', function() {
  describe('getFilesInTar', function() {
    it('should read files', function() {
      var fixturePath = path.join(__dirname, 'fixtures', 'simple.tar.gz');
      return TarHelper.getFilesInTar(fixturePath)
      .then(function(files) {
        assert.equal(files.length, 2);
        assert(files.indexOf('foo.png') !== -1);
        assert(files.indexOf('deeper/bar.png') !== -1);
      });
    });
  });
});

describe('TarHelper', function() {
  beforeEach(function() {
    mockFs();
  });

  afterEach(function() {
    mockFs.restore();
  });

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
          path.join('chrome', 'homepage.search.700.png'),
          path.join('chrome', 'homepage.search.1300.png'),
          path.join('chrome', 'homepage.form.700.png'),
          path.join('chrome', 'homepage.form.1300.png')
        ];

        for (var i = 0; i < expectedFiles.length; i++) {
          var expected = expectedFiles[i];
          assert(files.indexOf(expected) !== -1);
        }
      });
    });
  });
});
