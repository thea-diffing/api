'use strict';

var proxyquire = require('proxyquire');
var Bluebird = require('bluebird');
require('mocha-sinon');
require('sinon-as-promised')(Bluebird);

var Configuration = require('../server/configuration');

describe('module/serviceListener', function() {
  var dispatcherStub;
  var storageStub;

  var serviceListener;
  var config;

  beforeEach(function() {
    dispatcherStub = {
      '@noCallThru': true,
      on: this.sinon.spy()
    };

    storageStub = {
      '@noCallThru': true,
      '@global': true
    };

    var ServiceListener = proxyquire('../server/serviceListener', {
      './dispatcher': dispatcherStub,
      './utils/storage': storageStub
    });

    config = new Configuration();
    serviceListener = new ServiceListener(config);
  });

  describe('#register', function() {
    it('should call dispatcher.on', function() {
      var constants = require('../server/constants');
      serviceListener.register();

      assert.calledWith(dispatcherStub.on, constants.setBuildStatus, serviceListener._setBuildStatus);
    });
  });

  describe('#setBuildStatus', function() {
    describe('with invalid params', function() {
      it('should throw without project', function() {
        assert.throws(function() {
          serviceListener._setBuildStatus({
            sha: 'sha',
            status: 'status'
          });
        });
      });

      it('should throw without sha', function() {
        assert.throws(function() {
          serviceListener._setBuildStatus({
            project: 'project',
            status: 'status'
          });
        });
      });

      it('should throw without status', function() {
        assert.throws(function() {
          serviceListener._setBuildStatus({
            project: 'project',
            sha: 'sha'
          });
        });
      });
    });

    describe('without a service', function() {
      it('should resolve', function() {
        assert.isFulfilled(serviceListener._setBuildStatus({
          project: 'project',
          sha: 'sha',
          status: 'status'
        }));
      });
    });

    describe('with a service', function() {
      it('should call the service setBuildStatus', function() {
        function FakeService() {

        }

        FakeService.prototype = {
          setBuildStatus: this.sinon.spy()
        };

        var fakeService = new FakeService();

        config.set({
          service: fakeService
        });

        var projectService = {
          name: 'github',
          options: {
            user: 'VisualTesting',
            repository: 'test-example'
          }
        };

        storageStub.getProjectInfo = this.sinon.stub().resolves({
          service: projectService
        });

        return serviceListener._setBuildStatus({
          project: 'project',
          sha: 'sha',
          status: 'success'
        })
        .then(function() {
          assert.calledWithExactly(fakeService.setBuildStatus, projectService, {
            sha: 'sha',
            status: 'success'
          });
        });
      });
    });
  });
});
