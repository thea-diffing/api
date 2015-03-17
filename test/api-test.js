'use strict';

var Bluebird = require('bluebird');
var request = require('supertest-as-promised');
var path = require('path');
var proxyquire = require('proxyquire');
var fs = Bluebird.promisifyAll(require('fs-extra'));

var TarHelper = require('../server/utils/tarHelper');

describe('module/api', function() {
  var storageStub;
  var actionsStub;
  var api;
  var instance;

  beforeEach(function() {
    storageStub = {
      '@noCallThru': true,
      '@global': true,
      startBuild: this.sinon.stub().resolves({
        id: 'buildId'
      })
    };

    actionsStub = {
      '@noCallThru': true,
      '@global': true,
      diffSha: this.sinon.spy()
    };

    var app = proxyquire('../server/app', {
      '../utils/storage': storageStub,
      '../actions': actionsStub
    });

    api = request(app);
  });

  describe('#startBuild', function() {
    beforeEach(function() {
      instance = api.post('/api/startBuild');
    });

    describe('with invalid params', function() {
      it('should return 500', function() {
        return instance.expect(400);
      });

      it('should return failure', function() {
        return instance.expect(function(data) {
          var body = data.body;

          assert.equal(body.status, 'failure');
          assert.equal(body.message, 'invalid arguments');
        });
      });
    });

    describe('with valid params', function() {
      var params = {
        head: 'head',
        base: 'base',
        numBrowsers: 2
      };

      it('should return 200', function() {
        return instance.send(params)
        .expect(200);
      });

      it('should return success and ID', function() {
        return instance.send(params)
        .expect(function(data) {
          var body = data.body;

          assert.equal(body.status, 'success');
          assert.isString(body.build);
        });
      });
    });
  });

  describe('#upload', function() {
    beforeEach(function() {
      instance = api.post('/api/upload');
    });

    describe('invalid', function() {
      describe('no params', function() {
        it('should give 400', function() {
          return instance.expect(400);
        });

        it('should have message', function() {
          return instance.expect(function(data) {
            var body = data.body;

            assert.equal(body.status, 'failure');
            assert.equal(body.message, 'invalid arguments');
          });
        });
      });
    });

    describe('valid', function() {
      var sha;

      beforeEach(function() {
        var fileName = path.join(__dirname, 'foo.tar.gz');
        sha = 'sha';

        storageStub.saveImages = this.sinon.stub().resolves();

        var browser = 'Chrome 26';

        return TarHelper.createBrowserTar(browser, fileName)
        .then(function() {
          instance = instance
          .field('sha', sha)
          .field('browser', browser)
          .attach('images', fileName);
        })
        .then(function() {
          return fs.removeAsync(fileName);
        });
      });

      it('should give 200', function() {
        return instance.expect(200);
      });

      it('should be success', function() {
        return instance.expect(function(data) {
          var body = data.body;

          assert.equal(body.status, 'success');
        });
      });

      it('should call actions.diffSha', function() {
        return instance.expect(function() {
          assert.calledOnce(actionsStub.diffSha);
          assert.calledWithExactly(actionsStub.diffSha, sha);
        });
      });

      it('should have failure message if storage failed', function() {
        storageStub.saveImages = this.sinon.stub().rejects();

        return instance
        .expect(500)
        .expect(function(data) {
          var body = data.body;

          assert.equal(body.status, 'failure');
          assert.equal(body.message, 'failed uploading');
        });
      });
    });
  });

  describe('#getBuild', function() {
    describe('', function() {
      beforeEach(function() {
        instance = api.get('/api/getBuild');
      });

      describe('with invalid params', function() {
        it('should error 400', function() {
          return instance.expect(400);
        });

        it('should have message', function() {
          return instance.expect(function(data) {
            var body = data.body;

            assert.equal(body.status, 'failure');
            assert.equal(body.message, 'invalid arguments');
          });
        });
      });

      describe('with unknown build', function() {
        beforeEach(function() {
          storageStub.hasBuild = this.sinon.stub().resolves(false);

          instance = instance.send({
            id: 'foo'
          });
        });

        it('should error 400', function() {
          return instance.expect(400);
        });

        it('should have message', function() {
          return instance.expect(function(data) {
            var body = data.body;

            assert.equal(body.status, 'failure');
            assert.equal(body.message, 'unknown build');
          });
        });
      });
    });

    describe('with valid build', function() {
      beforeEach(function() {
        storageStub.hasBuild = this.sinon.stub().resolves(true);
      });

      it('is pending returns build info', function() {
        var result = {
          id: 'buildId',
          fake1: 'test',
          fake2: 'test',
          status: 'pending'
        };

        storageStub.getBuildInfo = this.sinon.stub().resolves(result);

        return api.get('/api/getBuild')
        .send({
          id: 'buildId'
        })
        .expect(200)
        .expect(function(data) {
          var body = data.body;
          assert.deepEqual(body, result);
        });
      });

      it('is successful', function() {
        var result = {
          id: 'buildId',
          fake1: 'test',
          fake2: 'test',
          status: 'success'
        };

        storageStub.getBuildInfo = this.sinon.stub().resolves(result);

        return api.get('/api/getBuild')
        .send({
          id: 'buildId'
        })
        .expect(200)
        .expect(function(data) {
          var body = data.body;
          assert.deepEqual(body, result);
        });
      });

      it('has failed build with diffs', function() {
        var result = {
          id: 'buildId',
          fake1: 'test',
          fake2: 'test',
          status: 'failure',
          diffs: {
            Chrome: [
              'file1.png',
              'file2.png'
            ],
            'Internet Explorer': [
              'file2.png',
              'file3.png'
            ]
          }
        };

        storageStub.getBuildInfo = this.sinon.stub().resolves(result);

        return api.get('/api/getBuild')
        .send({
          id: 'buildId'
        })
        .expect(200)
        .expect(function(data) {
          var body = data.body;
          assert.deepEqual(body, result);
        });
      });
    });
  });

  describe('#getImage', function() {
    describe('with valid params', function() {
      it('should render an image if exists', function() {
        var img = TarHelper.createImage();
        storageStub.getImage = this.sinon.stub().resolves(img.getImage());

        return api.get('/api/image/sha/browser/foo.png')
        .expect(200);
      });

      it('should 404 if image does not exist', function() {
        storageStub.getImage = this.sinon.stub().rejects();
        return api.get('/api/image/sha/browser/foo.png')
        .expect(404);
      });
    });
  });
});
