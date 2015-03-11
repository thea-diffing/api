'use strict';

var proxyquire = require('proxyquire');
var Bluebird = require('bluebird');
require('mocha-sinon');
require('sinon-as-promised')(Bluebird);

describe('module/checkBuild', function() {
  var storageStub = {};
  var differStub = {};
  var checkBuild;

  beforeEach(function() {
    storageStub = {
      '@noCallThru': true
    };

    differStub = {
      '@noCallThru': true
    };

    storageStub.getBuildInfo = this.sinon.stub()
    .resolves({
      head: 'foo',
      base: 'bar',
      numBrowsers: 2
    });

    var dispatcherStub = {
      '@noCallThru': true,
      on: this.sinon.spy()
    };

    checkBuild = proxyquire('../server/checkBuild', {
      './utils/storage': storageStub,
      './utils/differ': differStub,
      './dispatcher': dispatcherStub
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
        checkBuild._diffCommonBrowsers = this.sinon.stub()
        .resolves(true);

        return assert.isFulfilled(checkBuild._buildReceived({
          id: 'foo'
        }));

      });

      it('should call diffCommonBrowsers', function() {
        var spy = this.sinon.spy();
        checkBuild._diffCommonBrowsers = spy;

        return checkBuild._buildReceived({
          id: 'build'
        })
        .then(function() {
          assert.calledWithExactly(spy, {
            build: 'build',
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
    var diffBrowserSpy;

    describe('for build with same browsers', function() {
      beforeEach(function() {
        storageStub.getBrowsersForSha = this.sinon.stub()
          .resolves(['Chrome', 'Firefox']);

        diffBrowserSpy = this.sinon.spy();
        checkBuild._diffBrowser = diffBrowserSpy;
      });

      it('calls diffBrowser for both browsers', function() {
        return checkBuild._diffCommonBrowsers({
          build: 'build',
          head: 'foo',
          base: 'bar'
        })
        .then(function() {
          assert.calledOnce(diffBrowserSpy.withArgs({
            build: 'build',
            head: 'foo',
            base: 'bar',
            browser: 'Chrome'
          }));

          assert.calledOnce(diffBrowserSpy.withArgs({
            build: 'build',
            head: 'foo',
            base: 'bar',
            browser: 'Firefox'
          }));
        });
      });
    });

    describe('for build with different browsers with overlap', function() {
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
          build: 'build',
          head: 'foo',
          base: 'bar'
        })
        .then(function() {
          assert.calledOnce(diffBrowserSpy.withArgs({
            build: 'build',
            head: 'foo',
            base: 'bar',
            browser: 'Chrome'
          }));

          assert.notCalled(diffBrowserSpy.withArgs({
            build: 'build',
            head: 'foo',
            base: 'bar',
            browser: 'Firefox'
          }));

          assert.notCalled(diffBrowserSpy.withArgs({
            build: 'build',
            head: 'foo',
            base: 'bar',
            browser: 'Internet Explorer'
          }));
        });
      });
    });

    describe('for build with different browsers with no overlap', function() {
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
          build: 'build',
          head: 'foo',
          base: 'bar'
        })
        .then(function() {
          assert.notCalled(diffBrowserSpy);
        });
      });
    });
  });

  describe('#diffBrowser', function() {
    var diffImageStub;

    beforeEach(function() {
      diffImageStub = this.sinon.stub().resolves({
        diff: false
      });
      checkBuild._diffImage = diffImageStub;
    });

    describe('for browsers with same images', function() {
      beforeEach(function() {
        storageStub.getImagesForShaBrowser = this.sinon.stub()
          .resolves(['image1.png', 'image2.png']);
      });

      it('calls diffImage for both images', function() {
        return checkBuild._diffBrowser({
          build: 'build',
          head: 'head',
          base: 'base',
          browser: 'Chrome'
        })
        .then(function() {
          assert.calledOnce(diffImageStub.withArgs({
            build: 'build',
            head: 'head',
            base: 'base',
            browser: 'Chrome',
            image: 'image1.png'
          }));

          assert.calledOnce(diffImageStub.withArgs({
            build: 'build',
            head: 'head',
            base: 'base',
            browser: 'Chrome',
            image: 'image2.png'
          }));
        });
      });

      it('resolves with images that differ', function() {
        diffImageStub.withArgs({
          build: 'build',
          head: 'head',
          base: 'base',
          browser: 'Chrome',
          image: 'image2.png'
        })
        .resolves({
          diff: true
        });

        return assert.becomes(checkBuild._diffBrowser({
          build: 'build',
          head: 'head',
          base: 'base',
          browser: 'Chrome'
        }), [
          'image2.png'
        ]);
      });
    });

    describe('for browsers with different images with overlap', function() {
      beforeEach(function() {
        var stub = this.sinon.stub();
        stub.withArgs({
          sha: 'head',
          browser: 'Chrome'
        })
        .resolves(['image1.png', 'image2.png']);

        stub.withArgs({
          sha: 'base',
          browser: 'Chrome'
        })
        .resolves(['image2.png', 'image3.png']);

        storageStub.getImagesForShaBrowser = stub;
      });

      it('calls diffImage for only common images', function() {
        return checkBuild._diffBrowser({
          build: 'build',
          head: 'head',
          base: 'base',
          browser: 'Chrome'
        })
        .then(function() {
          assert.calledOnce(diffImageStub.withArgs({
            build: 'build',
            head: 'head',
            base: 'base',
            browser: 'Chrome',
            image: 'image2.png'
          }));

          assert.notCalled(diffImageStub.withArgs({
            build: 'build',
            head: 'head',
            base: 'base',
            browser: 'Chrome',
            image: 'image1.png'
          }));

          assert.notCalled(diffImageStub.withArgs({
            build: 'build',
            head: 'head',
            base: 'base',
            browser: 'Chrome',
            image: 'image3.png'
          }));
        });
      });
    });

    describe('for browsers with different images with no overlap', function() {
      beforeEach(function() {
        var stub = this.sinon.stub();
        stub.withArgs({
          sha: 'head',
          browser: 'Chrome'
        })
        .resolves(['image1.png', 'image2.png']);

        stub.withArgs({
          sha: 'base',
          browser: 'Chrome'
        })
        .resolves(['image3.png', 'image4.png']);

        storageStub.getImagesForShaBrowser = stub;
      });

      it('does not call diffImage', function() {
        return checkBuild._diffBrowser({
          build: 'build',
          head: 'head',
          base: 'base',
          browser: 'Chrome'
        })
        .then(function() {
          assert.notCalled(diffImageStub);
        });
      });

      it('resolves with no images', function() {
        return assert.becomes(checkBuild._diffBrowser({
          build: 'build',
          head: 'head',
          base: 'base',
          browser: 'Chrome'
        }), []);
      });
    });
  });

  describe('#diffImage', function() {
    var generateDiffStub;
    var options;

    beforeEach(function() {
      options = {
        build: 'build',
        head: 'foo',
        base: 'bar',
        browser: 'Safari',
        image: 'navbar.png'
      };

      generateDiffStub = this.sinon.stub();
      generateDiffStub.withArgs()
      .resolves({
        width: 200
      });

      differStub.generateDiff = generateDiffStub;

      storageStub.getImage = this.sinon.stub();
    });

    it('calls getImage with different images', function() {
      return checkBuild._diffImage(options)
      .then(function() {
        assert.calledOnce(storageStub.getImage
          .withArgs({
            sha: options.head,
            browser: options.browser,
            image: options.image
          }));

        assert.calledOnce(storageStub.getImage
          .withArgs({
            sha: options.base,
            browser: options.browser,
            image: options.image
          }));
      });
    });

    it('calls generateDiff with results from head and base', function() {
      var image1Result = {
        width: 200,
        height: 300,
        buffer: new Buffer([1])
      };

      var image2Result = {
        width: 300,
        height: 200,
        buffer: new Buffer([])
      };

      storageStub.getImage.withArgs({
        sha: options.head,
        browser: options.browser,
        image: options.image
      })
      .resolves(image1Result);

      storageStub.getImage.withArgs({
        sha: options.base,
        browser: options.browser,
        image: options.image
      })
      .resolves(image2Result);

      return checkBuild._diffImage(options)
      .then(function() {
        assert.calledOnce(
          generateDiffStub.withArgs(image1Result, image2Result)
        );
      });
    });

    describe('with generateDiff', function() {
      var imageBuffer;

      beforeEach(function() {
        storageStub.saveDiffImage = this.sinon.stub().resolves();

        imageBuffer = new Buffer([]);
      });

      describe('distance greater than threshold', function() {
        beforeEach(function() {
          differStub.generateDiff = this.sinon.stub()
          .resolves({
            distance: 0.3,
            image: imageBuffer
          });
        });

        it('calls saveDiffImage', function() {
          return checkBuild._diffImage({
            build: 'build',
            head: 'head',
            base: 'base',
            browser: 'Chrome',
            image: 'navbar.png'
          })
          .then(function() {
            assert.calledOnce(storageStub.saveDiffImage.withArgs({
              build: 'build',
              browser: 'Chrome',
              imageName: 'navbar.png',
              imageData: imageBuffer
            }));
          });
        });

        it('resolves with diff field true', function() {
          return assert.becomes(checkBuild._diffImage({
            build: 'build',
            head: 'head',
            base: 'base',
            browser: 'Chrome',
            image: 'navbar.png'
          }), {
            diff: true
          });
        });
      });

      describe('distance below threshold', function() {
        beforeEach(function() {
          differStub.generateDiff = this.sinon.stub()
          .resolves({
            distance: 0,
            image: imageBuffer
          });
        });

        it('does not call saveDiffImage', function() {
          return checkBuild._diffImage({
            build: 'build',
            head: 'head',
            base: 'base',
            browser: 'Chrome',
            image: 'navbar.png'
          })
          .then(function() {
            assert.notCalled(storageStub.saveDiffImage.withArgs({
              build: 'build',
              browser: 'Chrome',
              imageName: 'navbar.png',
              imageData: imageBuffer
            }));
          });
        });

        it('resolves with diff field false', function() {
          return assert.becomes(checkBuild._diffImage({
            build: 'build',
            head: 'head',
            base: 'base',
            browser: 'Chrome',
            image: 'navbar.png'
          }), {
            diff: false
          });
        });
      });

    });
  });
});
