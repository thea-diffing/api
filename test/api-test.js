'use strict';

var request = require('supertest-as-promised');
var app = require('../server/app');

var mockFs = require('mock-fs');

describe('App', function() {
  before(function() {
    mockFs();
  });

  after(function() {
    mockFs.restore();
  });

  describe('startBuild', function() {
    var api = request(app);
    var instance;

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
          assert.isDefined(body.message);
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
});
