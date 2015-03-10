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
      var diffBrowserSpy;

      beforeEach(function() {
        storageStub.getBrowsersForSha = this.sinon.stub()
          .resolves(['Chrome', 'Firefox']);

        diffBrowserSpy = this.sinon.spy();
        checkBuild._diffBrowser = diffBrowserSpy;
      });

      it('calls diffBrowser for both browsers', function() {
        return checkBuild._diffCommonBrowsers({
          head: 'foo',
          base: 'bar'
        })
        .then(function() {
          assert.calledOnce(diffBrowserSpy.withArgs({
            head: 'foo',
            base: 'bar',
            browser: 'Chrome'
          }));

          assert.calledOnce(diffBrowserSpy.withArgs({
            head: 'foo',
            base: 'bar',
            browser: 'Firefox'
          }));
        });
      });
    });

    describe('for build with different browsers with overlap', function() {
      var diffBrowserSpy;

      beforeEach(function() {
        var stub = this.sinon.stub();
        stub.withArgs('foo')
          .resolves(['Chrome', 'Firefox']);

        stub.withArgs('bar')
          .resolves(['Internet Explorer', 'Chrome']);

        storageStub.getBrowsersForSha = stub;

        diffBrowserSpy = this.sinon.spy();
        checkBuild._diffBrowser = diffBrowserSpy;
      });

      it('calls diffBrowser for only common browser', function() {
        return checkBuild._diffCommonBrowsers({
          head: 'foo',
          base: 'bar'
        })
        .then(function() {
          assert.calledOnce(diffBrowserSpy.withArgs({
            head: 'foo',
            base: 'bar',
            browser: 'Chrome'
          }));

          assert.notCalled(diffBrowserSpy.withArgs({
            head: 'foo',
            base: 'bar',
            browser: 'Firefox'
          }));

          assert.notCalled(diffBrowserSpy.withArgs({
            head: 'foo',
            base: 'bar',
            browser: 'Internet Explorer'
          }));
        });
      });
    });

    describe('for build with different browsers with no overlap', function() {
      var diffBrowserSpy;

      beforeEach(function() {
        var stub = this.sinon.stub();
        stub.withArgs('foo')
          .resolves(['Safari', 'Firefox']);

        stub.withArgs('bar')
          .resolves(['Internet Explorer', 'Chrome']);

        storageStub.getBrowsersForSha = stub;

        diffBrowserSpy = this.sinon.spy();
        checkBuild._diffBrowser = diffBrowserSpy;
      });

      it('calls diffBrowser for only common browser', function() {
        return checkBuild._diffCommonBrowsers({
          head: 'foo',
          base: 'bar'
        })
        .then(function() {
          assert.notCalled(diffBrowserSpy);
        });
      });
    });
  });
});
