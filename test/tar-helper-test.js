'use strict';

var Bluebird = require('bluebird');
var PNGImage = Bluebird.promisifyAll(require('pngjs-image'));
var fs = Bluebird.promisifyAll(require('fs-extra'));
var uuid = require('node-uuid');
var path = require('path');
var ReadableStream = require('stream').Readable;
var streamToPromise = require('stream-to-promise');

var TarHelper = require('../server/utils/tar-helper');
var dirHelper = require('../server/utils/dir-helper');

describe('module/tar-helper', function() {
  var tmpData;

  before(function() {
    tmpData = path.join(__TESTDATA__, 'tarHelper');
  });

  after(function() {
    return fs.removeAsync(tmpData);
  });

  describe('#getFilesInTar', function() {
    it('should read files', function() {
      var fixturePath = path.join(__dirname, 'fixtures', 'simple.tar.gz');
      return TarHelper.getFilesInTar(fixturePath)
      .then(function(files) {
        var browser = 'Internet Explorer';

        assert.include(files, path.join(browser, 'homepage.form.1300.png'));
        assert.include(files, path.join(browser, 'homepage.form.700.png'));
        assert.include(files, path.join(browser, 'homepage.search.1300.png'));
        assert.include(files, path.join(browser, 'homepage.search.700.png'));
      });
    });
  });

  describe('#createImage', function() {
    it('should create a saveable image', function() {
      var image = TarHelper.createImage();

      var folder = path.join(tmpData, uuid.v4());
      var fileName = path.join(folder, 'foo.png');

      return fs.ensureDirAsync(folder)
      .then(function() {
        var writeStream = fs.createWriteStream(fileName);
        image.pipe(writeStream)

        return streamToPromise(writeStream);
      })
      .then(function() {
        return PNGImage.readImageAsync(fileName);
      })
      .then(function(file) {
        assert.isAbove(file.getWidth(), 0);
        assert.isAbove(file.getHeight(), 0);
      });
    });
  });

  describe('#extractTar', function() {
    var tarFilePath;
    var extractPath;

    beforeEach(function() {
      var guid = uuid.v4();
      var tmp = path.join(tmpData, uuid.v4());
      var folder = path.join(tmp, guid);

      tarFilePath = path.join(folder, 'foo.tar.gz');
      extractPath = path.join(folder, 'extractPath');

      var browser = 'Internet Explorer';

      return TarHelper.createBrowserTar(browser, tarFilePath);
    });

    it('saves without an extra folder', function() {
      return TarHelper.extractTar(tarFilePath, extractPath)
      .then(function() {
        return dirHelper.readFiles(extractPath);
      })
      .then(function(files) {
        assert.equal(files.length, 4);
        assert.include(files, 'homepage.form.1300.png');
        assert.include(files, 'homepage.form.700.png');
        assert.include(files, 'homepage.search.1300.png');
        assert.include(files, 'homepage.search.700.png');
      });
    });

    it('only contains one set of files if extracted twice', function() {
      return TarHelper.extractTar(tarFilePath, extractPath)
      .then(function() {
        return TarHelper.extractTar(tarFilePath, extractPath);
      })
      .then(function() {
        return dirHelper.readFiles(extractPath);
      })
      .then(function(files) {
        assert.equal(files.length, 4);
        assert.include(files, 'homepage.form.1300.png');
        assert.include(files, 'homepage.form.700.png');
        assert.include(files, 'homepage.search.1300.png');
        assert.include(files, 'homepage.search.700.png');
      });
    });
  });

  describe('#createBrowserTar', function() {
    it('should create a tar', function() {
      var tmp = path.join(tmpData, uuid.v4());
      var fileName = path.join(tmp, 'foo.tar.gz');
      var browser = 'Internet Explorer';

      return TarHelper.createBrowserTar(browser, fileName)
      .then(function() {
        return TarHelper.getFilesInTar(fileName);
      })
      .then(function(files) {
        assert.include(files, path.join(browser, 'homepage.form.1300.png'));
        assert.include(files, path.join(browser, 'homepage.form.700.png'));
        assert.include(files, path.join(browser, 'homepage.search.1300.png'));
        assert.include(files, path.join(browser, 'homepage.search.700.png'));
      });
    });
  });

  describe('#imageData', function() {
    it('should accept a stream and return a buffer', function() {
      var data1 = 'this is input';
      var data2 = 'this is more input';

      var stream = new ReadableStream();
      stream.push(data1);
      stream.push(data2);
      stream.push(null);

      return TarHelper.imageData(stream)
      .then(function(result) {
        assert.instanceOf(result, Buffer);
        assert.strictEqual(data1 + data2, result.toString());
      })
    });
  });
});
