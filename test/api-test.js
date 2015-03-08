'use strict';

var request = require('supertest-as-promised');
var mockFs = require('mock-fs');
var path = require('path');

var app = require('../server/app');
var TarHelper = require('../server/utils/tarHelper');

describe('Api', function() {
  var api = request(app);
  var instance;

  before(function() {
    mockFs();
  });

  after(function() {
    mockFs.restore();
  });

  describe('startBuild', function() {
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
        head: 'asdf',
        base: 'fdsa',
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

  describe('upload', function() {
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
      beforeEach(function() {
        var fileName = path.join(__dirname, 'foo.tar.gz');

        return TarHelper.createBrowserTar(fileName)
        .then(function() {
          instance = instance
          .field('sha', 'asdffasd')
          .field('browser', 'Chrome 26')
          .attach('images', fileName);
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
    });
  });

  describe('getBuild', function() {
    describe('should fail', function() {
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
      var buildOptions = {
        head: 'asdf',
        base: 'fdsa',
        numBrowsers: 2
      };
      var buildId;

      beforeEach(function() {
        return api.post('/api/startBuild')
        .send(buildOptions)
        .then(function(res) {
          var body = res.body;
          buildId = body.build;
        });
      });

      it('has pending build', function() {
        return api.get('/api/getBuild')
        .send({
          id: buildId
        })
        .expect(200)
        .expect(function(data) {
          var body = data.body;
          assert.equal(body.id, buildId);
          assert.equal(body.head, buildOptions.head);
          assert.equal(body.base, buildOptions.base);
          assert.equal(body.status, 'pending');
        });
      });

      xit('has successful build with no diffs', function() {

      });

      xit('has failed build with diffs', function() {

      });
    });
  });
});
