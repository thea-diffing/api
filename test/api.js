'use strict';

var assert = require('assert');

describe('Api', function() {
  describe('startBuild', function() {
    it('returns the biggest number from the arguments', function() {
      var max = Math.max(1, 2, 10, 3);
      assert(max === 10);
    });
  });
});
