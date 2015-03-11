'use strict';

var Bluebird = require('bluebird');

var differ = {
  /*
  image1.width int
  image1.height int
  image1.data Buffer
  image2.width int
  image2.height int
  image2.data Buffer
  */
  generateDiff: function(image1, image2) {
    return Bluebird.resolve();
  }
};

module.exports = differ;
