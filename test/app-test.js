'use strict';

describe('node_env', function() {
  it('is test', function() {
    assert.equal(process.env.NODE_ENV, 'test');
  });
});
