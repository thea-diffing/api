'use strict';

var Bluebird = require('bluebird');
var PNGImage = Bluebird.promisifyAll(require('pngjs-image'));
var fs = Bluebird.promisifyAll(require('fs-extra'));
var path = require('path');
var uuid = require('node-uuid');
var Targz = require('tar.gz');
var dirHelper = require('./dirHelper');

var TarHelper = {
  createImage: function() {
    var width = 100;
    var height = 300;
    var image = PNGImage.createImage(width, height);

    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        image.setAt(x, y, {
          red:255, green:0, blue:255, alpha:255
        });
      }
    }

    image = Bluebird.promisifyAll(image);
    return image;
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
        return image.writeImageAsync(imagePath);
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
    var tmp = path.join(__dirname, '/tmp');
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

  imageData: function(pngjs) {
    return new Bluebird(function(resolve, reject) {
      var buffers = [];
      pngjs.pack()
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
