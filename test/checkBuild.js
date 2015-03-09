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

  describe('buildReceived', function() {
    var diffCommonBrowsersSpy;

    beforeEach(function() {
      diffCommonBrowsersSpy = this.sinon.spy();
      checkBuild._diffCommonBrowsers = diffCommonBrowsersSpy;
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
        return checkBuild._buildReceived({
          id: 'foo'
        })
        .then(function() {
          assert.calledWithExactly(diffCommonBrowsersSpy, {
            head: 'foo',
            base: 'bar'
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
        return checkBuild._buildReceived({
          id: 'foo'
        })
        .then(function() {
          assert.callCount(diffCommonBrowsersSpy, 0);
        });
      });
    });
  });

  describe('calculateDiffs', function() {

  });
});
