'use strict';

var proxyquire = require('proxyquire');
var Bluebird = require('bluebird');
require('mocha-sinon');
require('sinon-as-promised')(Bluebird);
var TarHelper = require('../server/utils/tarHelper');
var githubStub = require('./fixtures/asyncGithubMock');

describe('module/checkBuild', function() {
  var storageStub = {};
  var differStub = {};
  var checkBuild;

  beforeEach(function() {
    storageStub = {
      '@noCallThru': true,
      getBuildInfo: this.sinon.stub().resolves({
        head: 'head',
        base: 'base',
        numBrowsers: 2,
        status: 'pending'
      })
    };

    differStub = {
      '@noCallThru': true
    };

    var dispatcherStub = {
      '@noCallThru': true,
      on: this.sinon.spy()
    };

    checkBuild = proxyquire('../server/checkBuild', {
      './asyncGithub': githubStub,
      './utils/storage': storageStub,
      './utils/differ': differStub,
      './dispatcher': dispatcherStub
    });
  });

  describe('#diffSha', function() {
    describe('with invalid payload', function() {
      it('should throw', function() {
        return assert.isRejected(checkBuild._diffSha());
      });
    });

    it('calls storage.getBuildsForSha', function() {
      storageStub.getBuildsForSha = this.sinon.stub().withArgs('whee').resolves([]);

      return checkBuild._diffSha({
        sha: 'whee'
      })
      .then(function() {
        assert.calledOnce(storageStub.getBuildsForSha);
      });
    });

    it('calls diffBuild for builds from getBuildsForSha', function() {
      storageStub.getBuildsForSha = this.sinon.stub()
      .withArgs('whee')
      .resolves(['a', 'b', 'c']);

      checkBuild._diffBuild = this.sinon.stub().resolves();

      return checkBuild._diffSha({
        sha: 'whee'
      })
      .then(function() {
        assert.calledWith(checkBuild._diffBuild, {
          id: 'a'
        });

        assert.calledWith(checkBuild._diffBuild, {
          id: 'b'
        });

        assert.calledWith(checkBuild._diffBuild, {
          id: 'c'
        });
      });
    });
  });

  describe('#diffBuild', function() {
    beforeEach(function() {
      storageStub.updateBuildInfo = this.sinon.stub().resolves();
    });

    describe('with completed build', function() {
      var diffCommonBrowsersStub;

      beforeEach(function() {
        storageStub.getBrowsersForSha = this.sinon.stub()
        .withArgs('head')
        .resolves(['Chrome', 'Firefox']);

        diffCommonBrowsersStub = this.sinon.stub().resolves({});

        checkBuild._diffCommonBrowsers = diffCommonBrowsersStub;
      });

      it('should call diffCommonBrowsers', function() {
        return checkBuild._diffBuild({
          id: 'build'
        })
        .then(function() {
          assert.calledWithExactly(diffCommonBrowsersStub, {
            build: 'build',
            head: 'head',
            base: 'base'
          });
        });
      });

      describe('with diffs', function() {
        it('should set build status failed and save diffs', function() {
          var diff = {
            Chrome: [
              'image1.png',
              'image2.png'
            ]
          };

          diffCommonBrowsersStub.withArgs({
            build: 'build',
            head: 'head',
            base: 'base'
          })
          .resolves(diff);

          return checkBuild._diffBuild({
            id: 'build'
          })
          .then(function() {
            assert.calledOnce(storageStub.updateBuildInfo
              .withArgs('build', {
                status: 'failed',
                diff: diff
              })
            );
          });
        });
      });

      describe('without diffs', function() {
        it('should write to build file success with no diffs', function() {
          diffCommonBrowsersStub.withArgs({
            build: 'build',
            head: 'head',
            base: 'base'
          })
          .resolves({});

          return checkBuild._diffBuild({
            id: 'build'
          })
          .then(function() {
            assert.calledOnce(storageStub.updateBuildInfo
              .withArgs('build', {
                status: 'success'
              })
            );
          });
        });
      });
    });

    describe('with non-completed build', function() {
      beforeEach(function() {
        storageStub.getBrowsersForSha = this.sinon.stub()
        .withArgs('head')
        .resolves(['Chrome']);
      });

      it('should not throw', function() {
        return assert.isFulfilled(checkBuild._diffBuild({
          id: 'head'
        }));
      });

      it('should not call diffCommonBrowsers', function() {
        var spy = this.sinon.spy();
        checkBuild._diffCommonBrowsers = spy;

        return checkBuild._diffBuild({
          id: 'head'
        })
        .then(function() {
          assert.callCount(spy, 0);
        });
      });
    });
  });

  describe('#diffCommonBrowsers', function() {
    var diffBrowserStub;

    beforeEach(function() {
      diffBrowserStub = this.sinon.stub().resolves([]);
      checkBuild._diffBrowser = diffBrowserStub;
    });

    describe('for build with same browsers', function() {
      beforeEach(function() {
        storageStub.getBrowsersForSha = this.sinon.stub()
          .resolves(['Chrome', 'Firefox']);
      });

      it('calls diffBrowser for both browsers', function() {
        return checkBuild._diffCommonBrowsers({
          build: 'build',
          head: 'head',
          base: 'base'
        })
        .then(function() {
          assert.calledOnce(diffBrowserStub.withArgs({
            build: 'build',
            head: 'head',
            base: 'base',
            browser: 'Chrome'
          }));

          assert.calledOnce(diffBrowserStub.withArgs({
            build: 'build',
            head: 'head',
            base: 'base',
            browser: 'Firefox'
          }));
        });
      });

      it('resolves with browsers with diffs', function() {
        diffBrowserStub.withArgs({
          build: 'build',
          head: 'head',
          base: 'base',
          browser: 'Firefox'
        })
        .resolves(['image1.png', 'image2.png']);

        return assert.becomes(checkBuild._diffCommonBrowsers({
          build: 'build',
          head: 'head',
          base: 'base'
        }), {
          Firefox: [
            'image1.png',
            'image2.png'
          ]
        });
      });
    });

    describe('for build with different browsers with overlap', function() {
      beforeEach(function() {
        var stub = this.sinon.stub();
        stub.withArgs('head')
          .resolves(['Chrome', 'Firefox']);

        stub.withArgs('base')
          .resolves(['Internet Explorer', 'Chrome']);

        storageStub.getBrowsersForSha = stub;
      });

      it('calls diffBrowser for only common browser', function() {
        return checkBuild._diffCommonBrowsers({
          build: 'build',
          head: 'head',
          base: 'base'
        })
        .then(function() {
          assert.calledOnce(diffBrowserStub.withArgs({
            build: 'build',
            head: 'head',
            base: 'base',
            browser: 'Chrome'
          }));

          assert.notCalled(diffBrowserStub.withArgs({
            build: 'build',
            head: 'head',
            base: 'base',
            browser: 'Firefox'
          }));

          assert.notCalled(diffBrowserStub.withArgs({
            build: 'build',
            head: 'head',
            base: 'base',
            browser: 'Internet Explorer'
          }));
        });
      });
    });

    describe('for build with different browsers with no overlap', function() {
      beforeEach(function() {
        var stub = this.sinon.stub();
        stub.withArgs('head')
          .resolves(['Safari', 'Firefox']);

        stub.withArgs('base')
          .resolves(['Internet Explorer', 'Chrome']);

        storageStub.getBrowsersForSha = stub;
      });

      it('calls diffBrowser for only common browser', function() {
        return checkBuild._diffCommonBrowsers({
          build: 'build',
          head: 'head',
          base: 'base'
        })
        .then(function() {
          assert.notCalled(diffBrowserStub);
        });
      });

      it('resolves with no browsers', function() {
        return assert.becomes(checkBuild._diffCommonBrowsers({
          build: 'build',
          head: 'head',
          base: 'base'
        }), {});
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
        head: 'head',
        base: 'base',
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
      var image1Result = TarHelper.createImage().getImage();
      var image2Result = TarHelper.createImage().getImage();

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

    describe('with diff', function() {
      var imageBuffer;

      beforeEach(function() {
        storageStub.saveDiffImage = this.sinon.stub().resolves();

        imageBuffer = TarHelper.createImage().getImage();
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
