'use strict';

var uuid = require('node-uuid');

function TestStorage() {
}

TestStorage.prototype = {
  run: function(storageGenerator) {
    describe('integration-tests', function() {
      var storage;

      beforeEach(function() {
        storage = storageGenerator();
      });

      describe('#hasProject', function() {
        it('resolves false if project does not exist', function() {
          return assert.eventually.isFalse(storage.hasProject('foo'));
        });

        it('resolves true if project exists', function() {
          return storage.createProject({
            info: 'foo'
          })
          .then(function(result) {
            return assert.eventually.isTrue(storage.hasProject(result.project));
          });
        });
      });

      describe('#createProject', function() {
        describe('with invalid args', function() {
          it('should throw with no arg', function() {
            assert.throws(function() {
              return storage.createProject();
            });
          });

          it('should throw with non object arg', function() {
            assert.throws(function() {
              return storage.createProject('string');
            });
          });
        });

        describe('with valid args', function() {
          var options;

          beforeEach(function() {
            options = {
              github: {
                repository: 'foo'
              }
            };
          });

          it('should return an object with id', function() {
            return storage.createProject(options)
            .then(function(result) {
              assert.isObject(result);
              assert.isString(result.project);
            });
          });
        });
      });

      describe('#getProjectInfo', function() {
        describe('with invalid args', function() {
          it('should throw with non string id', function() {
            assert.throws(function() {
              return storage.getProjectInfo({});
            });
          });
        });

        describe('with valid args', function() {
          it('should reject non existent project', function() {
            return assert.isRejected(storage.getProjectInfo('project'), /Unknown Project/);
          });

          it('should return info about the build', function() {
            var projectOptions = {
              github: {
                user: 'user',
                repository: 'repository'
              }
            };

            return storage.createProject(projectOptions)
            .then(function(result) {
              return storage.getProjectInfo(result.project);
            })
            .then(function(projectInfo) {
              assert.shallowDeepEqual(projectInfo, projectOptions);
            });
          });
        });
      });

      describe('#startBuild', function() {
        describe('with invalid args', function() {
          it('should throw with no arg', function() {
            assert.throws(function() {
              return storage.startBuild();
            });
          });

          it('should throw with only an object', function() {
            assert.throws(function() {
              return storage.startBuild({});
            });
          });

          it('should throw with only head', function() {
            assert.throws(function() {
              return storage.startBuild({
                head: 'head'
              });
            });
          });

          it('should throw with only base', function() {
            assert.throws(function() {
              return storage.startBuild({
                base: 'base'
              });
            });
          });

          it('should throw with numBrowsers as string', function() {
            assert.throws(function() {
              return storage.startBuild({
                numBrowsers: '4'
              });
            });
          });

          it('should throw without numBrowsers', function() {
            assert.throws(function() {
              return storage.startBuild({
                head: 'head',
                base: 'base'
              });
            });
          });

          it('should reject if project does not exist', function() {
            assert.isRejected(storage.startBuild({
              project: 'project',
              head: 'head',
              base: 'base',
              numBrowsers: 2
            }));
          });
        });

        describe('with valid args', function() {
          var buildOptions;

          beforeEach(function() {
            return storage.createProject({})
            .then(function(project) {
              buildOptions  = {
                project: project.project,
                head: uuid.v4(),
                base: uuid.v4(),
                numBrowsers: 3
              };
            });
          });

          it('should return an id', function() {
            return storage.startBuild(buildOptions)
            .then(function(data) {
              assert.isObject(data);
              assert.isString(data.build);
            });
          });
        });
      });

      describe('#saveImages', function() {
        it('implement integration tests');
      });

      describe('#hasBuild', function() {
        describe('with invalid args', function() {
          it('should throw with non string id', function() {
            assert.throws(function() {
              return storage.hasBuild(4)
              .then(function(err) {
                console.error(err);
              });
            });
          });
        });

        describe('with valid args', function() {
          var projectOptions;
          var buildOptions;

          beforeEach(function() {
            projectOptions = {
            };

            buildOptions = {
              head: 'head',
              base: 'base',
              numBrowsers: 3
            };
          });

          it('should resolve false if project does not exist', function() {
            return assert.eventually.isFalse(storage.hasBuild({
              project: 'project',
              build: 'build'
            }));
          });

          it('should resolve false if no build', function() {
            return storage.createProject(projectOptions)
            .then(function(project) {
              return assert.eventually.isFalse(storage.hasBuild({
                project: project.project,
                build: 'build'
              }));
            });
          });

          it('should resolve true if build exists', function() {
            return storage.createProject(projectOptions)
            .then(function(project) {
              buildOptions.project = project.project;

              return storage.startBuild(buildOptions);
            })
            .then(function(data) {
              return assert.eventually.isTrue(storage.hasBuild({
                project: buildOptions.project,
                build: data.build
              }));
            });
          });

          it('should resolve false if called with different id than startBuild', function() {
            return storage.createProject(projectOptions)
            .then(function(project) {
              buildOptions.project = project.project;

              return storage.startBuild(buildOptions)
              .then(function(data) {
                return storage.hasBuild({
                  project: buildOptions.project,
                  build: data.build + '_'
                });
              })
              .then(function(status) {
                assert.isFalse(status);
              });
            });
          });
        });
      });
    });
  }
};

module.exports = TestStorage;
