'use strict';

var proxyquire = require('proxyquire');
var Bluebird = require('bluebird');
require('mocha-sinon');
require('sinon-as-promised')(Bluebird);

var Configuration = require('../server/configuration');

describe('module/service-listener', function() {
  var dispatcherStub;
  var storageStub;

  var serviceListener;
  var config;

  var fakeService;
  var projectConfig;

  beforeEach(function() {
    dispatcherStub = {
      '@noCallThru': true,
      on: this.sinon.spy()
    };

    storageStub = {};

    var ServiceListener = proxyquire('../server/service-listener', {
      './dispatcher': dispatcherStub
    });

    config = new Configuration();
    config.set({
      storage: storageStub
    });
    serviceListener = new ServiceListener(config);

    function FakeService() {
    }

    FakeService.prototype = {
      setBuildStatus: this.sinon.spy(),
      addComment: this.sinon.spy()
    };

    fakeService = new FakeService();

    projectConfig = {
      name: 'github',
      options: {
        user: 'VisualTesting',
        repository: 'test-example'
      }
    };
  });

  describe('#register', function() {
    it('should call dispatcher.on', function() {
      var constants = require('../server/constants');
      serviceListener.register();

      assert.calledWith(dispatcherStub.on, constants.setBuildStatus, serviceListener._setBuildStatus);
      assert.calledWith(dispatcherStub.on, constants.SERVICE_ADD_COMMENT, serviceListener._addComment);
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
      beforeEach(function() {
        config.set({
          services: []
        });
      });

      it('should resolve', function() {
        return assert.isFulfilled(serviceListener._setBuildStatus({
          project: 'project',
          sha: 'sha',
          status: 'status'
        }));
      });
    });

    describe('with a service', function() {
      beforeEach(function() {
        config.set({
          services: [fakeService]
        });
      });

      describe('that does not match the project config', function() {
        beforeEach(function() {
          fakeService.serviceKey = 'foo';
        });

        it('should not call service setBuildStatus', function() {
          storageStub.getProjectInfo = this.sinon.stub().resolves({
            service: projectConfig
          });

          return serviceListener._setBuildStatus({
            project: 'project',
            sha: 'sha',
            status: 'success'
          })
          .then(function() {
            assert.notCalled(fakeService.setBuildStatus);
          });
        });
      });

      describe('that matches the project config', function() {
        beforeEach(function() {
          fakeService.serviceKey = 'github';
        });

        it('should call the service setBuildStatus', function() {
          storageStub.getProjectInfo = this.sinon.stub().resolves({
            service: projectConfig
          });

          return serviceListener._setBuildStatus({
            project: 'project',
            sha: 'sha',
            status: 'success'
          })
          .then(function() {
            assert.calledWithExactly(
              fakeService.setBuildStatus,
              projectConfig,
              {
                sha: 'sha',
                status: 'success'
              }
            );
          });
        });
      });
    });
  });

  describe('#addComment', function() {
    describe('with invalid params', function() {
      it('should throw without project', function() {
        assert.throws(function() {
          serviceListener._addComment({
            sha: 'sha',
            comment: 'comment'
          });
        });
      });

      it('should throw without sha', function() {
        assert.throws(function() {
          serviceListener._addComment({
            project: 'project',
            comment: 'comment'
          });
        });
      });

      it('should throw without comment', function() {
        assert.throws(function() {
          serviceListener._addComment({
            project: 'project',
            sha: 'sha'
          });
        });
      });
    });

    describe('without a service', function() {
      beforeEach(function() {
        config.set({
          services: []
        });
      });

      it('should resolve', function() {
        return assert.isFulfilled(serviceListener._addComment({
          project: 'project',
          sha: 'sha',
          comment: 'comment'
        }));
      });
    });

    describe('with a service', function() {
      beforeEach(function() {
        config.set({
          services: [fakeService]
        });
      });

      describe('that does not match the project config', function() {
        beforeEach(function() {
          fakeService.serviceKey = 'foo';
        });

        it('should not call addComment', function() {
          storageStub.getProjectInfo = this.sinon.stub().resolves({
            service: projectConfig
          });

          return serviceListener._addComment({
            project: 'project',
            sha: 'sha',
            comment: 'comment'
          })
          .then(function() {
            assert.notCalled(fakeService.addComment);
          });
        });
      });

      describe('that matches the project config', function() {
        beforeEach(function() {
          fakeService.serviceKey = 'github';
        });

        it('should call the service addComment', function() {
          storageStub.getProjectInfo = this.sinon.stub().resolves({
            service: projectConfig
          });

          return serviceListener._addComment({
            project: 'project',
            sha: 'sha',
            comment: 'comment'
          })
          .then(function() {
            assert.calledWithExactly(
              fakeService.addComment,
              projectConfig,
              {
                sha: 'sha',
                comment: 'comment'
              }
            );
          });
        });
      });
    });
  });
});
