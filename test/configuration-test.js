'use strict';

var Bluebird = require('bluebird');
require('mocha-sinon');
require('sinon-as-promised')(Bluebird);

var Configuration = require('../server/configuration');

describe('module/configuration', function() {
  var config;

  beforeEach(function() {
    config = new Configuration();
  });

  it('should not share state with a second instance', function() {
    var config2 = new Configuration();
    config.set({
      port: '2000'
    });

    assert.notEqual(config.getPort(), config2.getPort());
  });
});
