'use strict';

var Bluebird = require('bluebird');
var PNGImage = Bluebird.promisifyAll(require('pngjs-image'));
var fs = Bluebird.promisifyAll(require('fs-extra'));
var path = require('path');
var uuid = require('node-uuid');
var Targz = require('tar.gz');
var dirHelper = require('./dir-helper');
var assert = require('chai').assert;
var ReadableStream = require('stream').Readable;
var streamToPromise = require('stream-to-promise');

var TarHelper = {
  createImage: function() {
    var filePath = path.resolve(__dirname, '../../', 'test/fixtures/test-image.png');

    return fs.createReadStream(filePath);
  },

  createBrowserTar: function(browser, fileName) {
    var image = this.createImage();
    var base = path.join(__dirname, browser);
    var files = [
      'homepage.search.700.png',
      'homepage.search.1300.png',
      'homepage.form.700.png',
      'homepage.form.1300.png'
    ];

    var promises = files.map(function(file) {
      var imagePath;
      return fs.ensureDirAsync(base)
      .then(function() {
        imagePath = path.join(base, file);
        return fs.ensureDirAsync(path.dirname(imagePath));
      })
      .then(function() {
        var writeStream = fs.createWriteStream(imagePath);
        image.pipe(writeStream)

        return streamToPromise(writeStream);
      });
    });
    return Bluebird.all(promises)
    .then(function() {
      return fs.ensureDirAsync(path.dirname(fileName));
    })
    .then(function() {
      var targz = Bluebird.promisifyAll(new Targz());
      return targz.compressAsync(base, fileName);
    })
    .then(function() {
      return fs.removeAsync(base);
    });
  },

  extractTar: function(fileName, extract) {

    return fs.removeAsync(extract)
    .then(function() {
      var targz = Bluebird.promisifyAll(new Targz());
      return targz.extractAsync(fileName, extract);
    })
    .then(function() {
      return dirHelper.readFiles(extract);
    })
    .then(function(files) {
      var first = files.map(function(file) {
        return file.split(path.sep)[0];
      });

      for (var i = 1; i < first.length; i++) {
        if (first[i] !== first[i-1]) {
          return;
        }
      }

      var fromPath = path.join(extract, first[0]);

      // all of the files match
      return fs.copyAsync(fromPath, extract, {
        clobber: true
      })
      .then(function() {
        return fs.removeAsync(fromPath);
      });
    });

  },

  getFilesInTar: function(fileName) {
    var guid = uuid.v4();
    var tmp = path.join(__dirname, 'tmp');
    var folder = path.join(tmp, guid);

    return fs.ensureDirAsync(folder)
    .then(function() {
      var targz = Bluebird.promisifyAll(new Targz());
      return targz.extractAsync(fileName, folder);
    })
    .then(function() {
      return dirHelper.readFiles(folder);
    })
    .then(function(files) {
      return fs.removeAsync(tmp)
      .then(function() {
        return files;
      });
    });
  },

  imageData: function(stream) {
    assert.instanceOf(stream, ReadableStream);

    return new Bluebird(function(resolve, reject) {
      var buffers = [];
      stream
      .on('data', function(data) {
        buffers.push(data);
      })
      .on('end', function() {
        var buffer = Buffer.concat(buffers);
        resolve(buffer);
      })
      .on('error', function(error) {
        reject(error);
      });
    });
  }
};

module.exports = TarHelper;
