'use strict';

var Bluebird = require('bluebird');
var resemble = require('node-resemble-js');
var TarHelper = require('./tar-helper');

var differ = {
  /*
  image1 pngjs
  image2 pngjs

  resolves
  {
    distance number
    image pngjs
  }
  */
  generateDiff: function(image1, image2) {
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
            image: diffImage
          });
        });
      });
    });
  }
};

module.exports = differ;
