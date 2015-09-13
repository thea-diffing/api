'use strict';

var Bluebird = require('bluebird');
var resemble = require('node-resemble-js');
var TarHelper = require('./tar-helper');
var ReadableStream = require('stream').Readable;

var differ = {
  /*
  image1 ReadableStream
  image2 ReadableStream

  resolves
  {
    distance number
    image pngjs
  }
  */
  generateDiff: function(image1, image2) {
    assert.instanceOf(image1, ReadableStream);
    assert.instanceOf(image2, ReadableStream);

    return Bluebird.all([
      TarHelper.imageData(image1),
      TarHelper.imageData(image2)
    ])
    .spread(function(image1Data, image2Data) {
      return new Bluebird(function(resolve) {
        resemble(image1Data)
        .compareTo(image2Data)
        .onComplete(function(image) {
          var diffImage = image.getDiffImage();

          resolve({
            distance: image.misMatchPercentage,
            image: diffImage.pack()
          });
        });
      });
    });
  }
};

module.exports = differ;
