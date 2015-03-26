'use strict';

var Bluebird = require('bluebird');
var request = require('supertest-as-promised');
var path = require('path');
var proxyquire = require('proxyquire');
var fs = Bluebird.promisifyAll(require('fs-extra'));

var TarHelper = require('../server/utils/tarHelper');

var githubStub = require('./fixtures/asyncGithubMock');

describe('module/api', function() {
  var storageStub;
  var actionsStub;
  var api;
  var instance;

  beforeEach(function() {
    storageStub = {
      '@noCallThru': true,
      '@global': true
    };

    actionsStub = {
      '@noCallThru': true,
      '@global': true,
      diffSha: this.sinon.spy()
    };

    var app = proxyquire('../server/app', {
      '../utils/storage': storageStub,
      '../actions': actionsStub,
      './asyncGithub': githubStub
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
        project: 'project',
        head: 'head',
        base: 'base',
        numBrowsers: 2
      };

      beforeEach(function() {
        storageStub.startBuild = this.sinon.stub();

        storageStub.startBuild.withArgs(this.sinon.match({
          project: 'project',
          head: 'head',
          base: 'base',
          numBrowsers: 2
        })).resolves({
          id: 'buildId'
        });
      });

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
        var project = 'project';
        var browser = 'Chrome 26';
        sha = 'sha';

        storageStub.saveImages = this.sinon.stub();

        storageStub.saveImages.withArgs(
          this.sinon.match({
            project: project,
            sha: sha,
            browser: browser
          })
          .and(this.sinon.match.has('tarPath'))
        ).resolves();

        return TarHelper.createBrowserTar(browser, fileName)
        .then(function() {
          instance = instance
          .field('project', project)
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

      it('should call hasBuild', function() {
        var project = 'project';
        var id = 'buildId';

        storageStub.hasBuild = this.sinon.stub();
        var stub = storageStub.hasBuild.withArgs(this.sinon.match({
          project: project,
          build: id
        })).resolves(false);

        instance = instance.send({
          project: project,
          id: id
        })
        .expect(function() {
          assert.calledOnce(stub);
        });
      });

      describe('with unknown build', function() {
        beforeEach(function() {
          var project = 'project';
          var id = 'buildId';

          storageStub.hasBuild = this.sinon.stub().resolves(false);

          instance = instance.send({
            project: project,
            id: id
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
      var project;
      var buildId;

      beforeEach(function() {
        project = 'project';
        buildId = 'buildId';

        storageStub.hasBuild = this.sinon.stub().resolves(true);

        instance = api.get('/api/getBuild')
        .send({
          project: project,
          id: buildId
        });
      });

      it('should call getBuildInfo', function() {
        storageStub.getBuildInfo = this.sinon.stub();
        var stub = storageStub.getBuildInfo.withArgs(this.sinon.match({
          project: project,
          build: buildId
        })).resolves();

        return instance.send({
          project: project,
          id: buildId
        })
        .expect(function() {
          assert.calledOnce(stub);
        });
      });

      it('is pending returns build info', function() {
        var result = {
          id: buildId,
          fake1: 'test',
          fake2: 'test',
          status: 'pending'
        };

        storageStub.getBuildInfo = this.sinon.stub().resolves(result);

        return instance
        .expect(200)
        .expect(function(data) {
          var body = data.body;
          assert.deepEqual(body, result);
        });
      });

      it('is successful', function() {
        var result = {
          id: buildId,
          fake1: 'test',
          fake2: 'test',
          status: 'success'
        };

        storageStub.getBuildInfo = this.sinon.stub().resolves(result);

        return instance
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

        return instance
        .expect(200)
        .expect(function(data) {
          var body = data.body;
          assert.deepEqual(body, result);
        });
      });
    });
  });

  describe('#getImage', function() {
    it('should call getImage', function() {
      storageStub.getImage = this.sinon.stub();
      var stub = storageStub.getImage.withArgs(this.sinon.match({
        project: 'project',
        sha: 'sha',
        browser: 'browser',
        image: 'image.png'
      })).resolves();

      return api.get('/api/image/project/sha/browser/image.png')
      .expect(function() {
        assert.calledOnce(stub);
      });
    });

    it('should render an image if exists', function() {
      var img = TarHelper.createImage();
      storageStub.getImage = this.sinon.stub().resolves(img.getImage());

      return api.get('/api/image/project/sha/browser/image.png')
      .expect(200);
    });

    it('should 404 if image does not exist', function() {
      storageStub.getImage = this.sinon.stub().rejects();
      return api.get('/api/image/project/sha/browser/image.png')
      .expect(404);
    });
  });

  describe('#getDiff', function() {
    it('should call getDiff', function() {
      storageStub.getDiff = this.sinon.stub();
      var stub = storageStub.getDiff.withArgs(this.sinon.match({
        project: 'project',
        build: 'build',
        browser: 'browser',
        image: 'image.png'
      })).resolves();

      return api.get('/api/diff/project/build/browser/image.png')
      .expect(function() {
        assert.calledOnce(stub);
      });
    });

    it('should render an image if exists', function() {
      var img = TarHelper.createImage();
      storageStub.getDiff = this.sinon.stub().resolves(img.getImage());

      return api.get('/api/diff/project/build/browser/image.png')
      .expect(200);
    });

    it('should 404 if image does not exist', function() {
      storageStub.getDiff = this.sinon.stub().rejects();
      return api.get('/api/diff/project/build/browser/foo.png')
      .expect(404);
    });
  });
});
