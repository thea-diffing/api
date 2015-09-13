'use strict';

var TarHelper = require('../server/utils/tar-helper');
var differ = require('../server/utils/differ');

describe('module/differ', function() {
  describe('#generateDiff', function() {
    it('should be equal with the same images', function() {
      var image1 = TarHelper.createImage();
      var image2 = TarHelper.createImage();

      return differ.generateDiff(image1, image2)
      .then(function(result) {
        assert.equal(result.distance, 0.0);

        assert.property(result.image, 'pack');
      });
    });
  });
});
