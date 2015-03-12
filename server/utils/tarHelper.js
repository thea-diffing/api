'use strict';

var Bluebird = require('bluebird');
var PNGImage = Bluebird.promisifyAll(require('pngjs-image'));
var fs = Bluebird.promisifyAll(require('fs-extra'));
var tar = require('tar-fs');
var path = require('path');
var uuid = require('node-uuid');
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

  createBrowserTar: function(fileName) {
    var image = this.createImage();
    var base = path.join(__dirname, 'path');
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
    })
    .then(function() {
      return fs.removeAsync(base);
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
