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
});
