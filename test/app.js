'use strict';

var assert = require('assert');

describe('node_env', function() {
  it('is test', function() {
    assert.equal(process.env.NODE_ENV, 'test');
  });
});
