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

  describe('#buildReceived', function() {
    describe('with invalid payload', function() {
      it('should throw', function() {
        return assert.isRejected(checkBuild._buildReceived());
      });
    });

    describe('with completed build', function() {
      beforeEach(function() {
        storageStub.getBrowsersForSha = this.sinon.stub()
        .withArgs('foo')
        .resolves(['Chrome', 'Firefox']);
      });

      it('should fulfill', function() {
        return assert.isFulfilled(checkBuild._buildReceived({
          id: 'foo'
        }));

      });

      it('should call diffCommonBrowsers', function() {
        var spy = this.sinon.spy();
        checkBuild._diffCommonBrowsers = spy;

        return checkBuild._buildReceived({
          id: 'foo'
        })
        .then(function() {
          assert.calledWithExactly(spy, {
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
        return assert.isFulfilled(checkBuild._buildReceived({
          id: 'foo'
        }));
      });

      it('should not call diffCommonBrowsers', function() {
        var spy = this.sinon.spy();
        checkBuild._diffCommonBrowsers = spy;

        return checkBuild._buildReceived({
          id: 'foo'
        })
        .then(function() {
          assert.callCount(spy, 0);
        });
      });
    });
  });

  describe('#diffCommonBrowsers', function() {
    describe('for build with same browsers', function() {
      beforeEach(function() {
        storageStub.getBrowsersForSha = this.sinon.stub()
          .resolves(['Chrome', 'Firefox']);
      });

      it('calls diffBrowsers for both browsers', function() {
        // checkBuild._diffCommonBrowsers()
      });
    });
  });
});
