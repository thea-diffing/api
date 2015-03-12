'use strict';

var proxyquire = require('proxyquire');
var Bluebird = require('bluebird');
var request = require('supertest-as-promised');
require('mocha-sinon');
require('sinon-as-promised')(Bluebird);

describe('routes', function() {
  var apiStub;
  var api;

  beforeEach(function() {
    apiStub = {
      '@global': true,
      startBuild: this.sinon.stub(),
      upload: this.sinon.stub(),
      getBuild: this.sinon.stub(),
      confirm: this.sinon.stub(),
      getImage: this.sinon.stub(),
      getDiff: this.sinon.stub()
    };
  });

  it('/api/startBuild should call startBuild', function() {
    apiStub.startBuild = function(req, res) {
      res.send();
    };

    var spy = this.sinon.spy(apiStub, 'startBuild');
    var app = proxyquire('../server/app', {
      './controllers/api': apiStub
    });
    api = request(app);

    return api.post('/api/startBuild')
    .then(function() {
      assert.calledOnce(spy);
    });

  });
});
