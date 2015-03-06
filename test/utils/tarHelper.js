'use strict';

var Bluebird = require('bluebird');
var PNGImage = Bluebird.promisifyAll(require('pngjs-image'));
var fs = Bluebird.promisifyAll(require('fs-extra'));
var tar = require('tar-fs');
var path = require('path');
var dir = require('node-dir');
var uuid = require('node-uuid');

function readFiles(path, options) {
  return new Bluebird(function(resolve, reject) {
    dir.readFiles(path, options, function(err, content, next) {
      next();
    }, function(err, files) {
      if (err) {
        reject(err);
        return;
      }

      resolve(files);
    });
  });
}

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

  createBrowserTar: function(fileName) {
    var image = this.createImage();
    var base = path.join(__dirname, 'path');
    var files = [
      path.join('chrome', 'homepage.search.700.png'),
      path.join('chrome', 'homepage.search.1300.png'),
      path.join('chrome', 'homepage.form.700.png'),
      path.join('chrome', 'homepage.form.1300.png')
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
      return new Bluebird(function(resolve, reject) {
        var archive = tar.pack(base);
        var writestream = fs.createWriteStream(fileName);

        writestream.on('finish', function() {
          resolve();
        });

        writestream.on('error', function(err) {
          reject(err);
        });

        archive.pipe(writestream);
      });
    });
  },

  getFilesInTar: function(fileName) {
    var guid = uuid.v4();
    var tmp = path.join(__dirname, '/tmp');
    var folder = path.join(tmp, guid);

    return fs.ensureDirAsync(folder)
    .then(function() {
      return new Bluebird(function(resolve, reject) {
        var readStream = fs.createReadStream(fileName);

        var extract = tar.extract(folder);

        extract.on('error', function(err) {
          reject(err);
        });

        extract.on('finish', function() {
          resolve();
        });

        readStream.pipe(extract);
      });
    })
    .then(function() {
      return readFiles(folder);
    })
    .then(function(files) {
      return fs.removeAsync(tmp)
      .then(function() {
        return files.map(function(file) {
          return path.relative(folder, file);
        });
      });
    });
  }
};

module.exports = TarHelper;
