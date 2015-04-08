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

  describe('#getSupportedServices', function() {
    it('should be empty with no services', function() {
      config.set({
        services: []
      });

      assert.equal(config.getSupportedServices().length, 0);
    });

    it('should return array of serviceKey if one service', function() {
      config.set({
        services: [{
          serviceKey: 'service1'
        }]
      });

      var keys = config.getSupportedServices();
      assert.equal(keys.length, 1);
      assert.equal(keys[0], 'service1');
    });

    it('should return array of serviceKey with multiple services', function() {
      config.set({
        services: [{
          serviceKey: 'service1'
        },
        {
          serviceKey: 'service2'
        },
        {
          serviceKey: 'service3'
        }]
      });

      var keys = config.getSupportedServices();
      assert.equal(keys.length, 3);
      assert.sameMembers(keys, ['service1', 'service2', 'service3']);
    });
  });
});
