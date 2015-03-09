'use strict';

var proxyquire = require('proxyquire');
var Bluebird = require('bluebird');
require('mocha-sinon');
require('sinon-as-promised')(Bluebird);

describe('module/checkBuild', function() {
  var storageStub = {};
  var checkBuild;

  beforeEach(function() {
    storageStub = {
      '@noCallThru': true
    };

    storageStub.getBuildInfo = this.sinon.stub()
    .resolves({
      head: 'foo',
      base: 'bar',
      numBrowsers: 2
    });

    checkBuild = proxyquire('../server/checkBuild', {
      './utils/storage': storageStub
    });
  });

  describe('with invalid payload', function() {
    it('should throw', function() {
      assert.throws(function() {
        checkBuild._buildReceived();
      });
    });
  });

  describe('with completed build', function() {
    beforeEach(function() {
      storageStub.getBrowsersForSha = this.sinon.stub()
      .withArgs('foo')
      .resolves(['Chrome', 'Firefox']);
    });

    it('should not throw', function() {
      assert.doesNotThrow(function() {
        checkBuild._buildReceived({
          id: 'foo'
        });
      });
    });

    it('should call calculateDiffs', function() {
      var spy = this.sinon.spy();
      checkBuild._calculateDiffs = spy;

      return checkBuild._buildReceived({
        id: 'foo'
      })
      .then(function() {
        assert.calledWithExactly(spy, {
          buildInfo: {
            head: 'foo',
            base: 'bar',
            numBrowsers: 2
          },
          browsers: ['Chrome', 'Firefox']
        });
      });
    });
  });

  describe('with non-completed build', function() {
    beforeEach(function() {
      storageStub.getBrowsersForSha = this.sinon.stub()
      .withArgs('foo')
      .resolves(['Chrome']);
    });

    it('should not throw', function() {
      assert.doesNotThrow(function() {
        checkBuild._buildReceived({
          id: 'foo'
        });
      });
    });

    it('should call calculateDiffs', function() {
      var spy = this.sinon.spy();
      checkBuild._calculateDiffs = spy;

      return checkBuild._buildReceived({
        id: 'foo'
      })
      .then(function() {
        assert.callCount(spy, 0);
      });
    });
  });



  it('should call storage.getBuild', function() {

  });
});