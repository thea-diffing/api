'use strict';

var Bluebird = require('bluebird');
var fs = Bluebird.promisifyAll(require('fs-extra'));

var actions = require('../actions');

var configuration;
var storage;

function serveImage(imagePromise, res) {
  imagePromise
  .then(function(image) {
    res.setHeader('Content-Type', 'image/png');
    image.pack().pipe(res);
  })
  .catch(function() {
    res.sendStatus(404);
  });
}

function Api(config) {
  configuration = config;

  storage = configuration.getStorage();
}

Api.prototype = {
  createProject: function(req, res) {
    var params = req.body;

    var service = params.service;

    if (service === undefined || service.name === undefined) {
      res.status(400).json({
        status: 'failure',
        message: 'invalid arguments'
      });
      return;
    }

    if (service.name !== 'github') {
      res.status(400).json({
        status: 'failure',
        message: 'unsupported dvcs'
      });
      return;
    }

    storage.createProject(params)
    .then(function(result) {
      res.status(200).json({
        status: 'success',
        project: result.project
      });
    })
    .catch(function() {
      res.status(500).json({
        status: 'failure',
        message: 'error starting build'
      });
    });
  },

  startBuild: function(req, res) {
    var params = req.body;

    var project = params.project;
    var head = params.head;
    var base = params.base;
    var numBrowsers = params.numBrowsers;

    if (!project || !head || !base || !numBrowsers) {
      res.status(400).json({
        status: 'failure',
        message: 'invalid arguments'
      });
      return;
    }

    storage.startBuild({
      project: project,
      head: head,
      base: base,
      numBrowsers: numBrowsers
    })
    .then(function(result) {
      actions.setBuildStatus({
        project: project,
        sha: head,
        status: 'pending'
      });

      res.status(200).json({
        status: 'success',
        build: result.build
      });
    })
    .catch(function() {
      res.status(500).json({
        status: 'failure',
        message: 'error starting build'
      });
    });
  },

  upload: function(req, res) {
    var params = req.body;

    var project;
    var sha;
    var browser;
    var files;
    var images;

    try {
      project = params.project;
      sha = params.sha;
      browser = params.browser;
      files = req.files;
      images = files.images;
    }
    finally {
      if (!project || !sha || !browser || !files || !images) {
        res.status(400).json({
          status: 'failure',
          message: 'invalid arguments'
        });
        return;
      }
    }

    storage.hasProject(project)
    .then(function(projectExists) {
      if (!projectExists) {
        res.status(400).json({
          status: 'failure',
          message: 'unknown project'
        });

        return;
      }

      // TODO: validate the structure of the tar file
      storage.saveImages({
        project: project,
        sha: sha,
        browser: browser,
        tarPath: images.path
      })
      .then(function() {
        res.status(200).json({
          status: 'success'
        });

        actions.diffSha({
          project: project,
          sha: sha
        });
      })
      .catch(function() {
        res.status(500).json({
          status: 'failure',
          message: 'failed uploading'
        });
      })
      .then(function() {
        return fs.removeAsync(images.path);
      });
    });
  },

  getBuild: function(req, res) {
    var project = req.query.project;
    var buildId = req.query.id;

    if (!project || !buildId) {
      res.status(400).json({
        status: 'failure',
        message: 'invalid arguments'
      });
      return;
    }

    storage.hasBuild({
      project: project,
      build: buildId
    })
    .then(function(exists) {
      if (exists) {
        return storage.getBuildInfo({
          project: project,
          build: buildId
        })
        .then(function(info) {
          res.status(200).json(info);
        });
      } else {
        res.status(400).json({
          status: 'failure',
          message: 'unknown build'
        });
        return;
      }
    });
  },

  confirm: function(req, res) {
    var params = req.body;

    var project = params.project;
    var build = params.build;

    if (!project || !build) {
      res.status(400).json({
        status: 'failure',
        message: 'invalid arguments'
      });

      return;
    }

    storage.hasProject(project)
    .then(function(projectExists) {
      if (!projectExists) {
        res.status(400).json({
          status: 'failure',
          message: 'unknown project'
        });

        return;
      }

      storage.hasBuild({
        project: project,
        build: build
      })
      .then(function(buildExists) {
        if (!buildExists) {
          res.status(400).json({
            status: 'failure',
            message: 'unknown build'
          });

          return;
        }

        var info;

        return storage.getBuildInfo({
          project: project,
          build: build
        })
        .then(function(buildInfo) {
          buildInfo.status = 'approved';
          info = buildInfo;

          buildInfo.project = project;

          return storage.updateBuildInfo(buildInfo);
        })
        .then(function() {
          res.status(200).json({
            status: 'success'
          });

          actions.setBuildStatus({
            project: project,
            sha: info.head,
            status: 'success'
          });
        });
      });
    });
  },

  getImage: function(req, res) {
    var params = req.params;

    var getImagePromise = storage.getImage({
      project: params.project,
      sha: params.sha,
      browser: params.browser,
      image: params.file
    });

    serveImage(getImagePromise, res);
  },

  getDiff: function(req, res) {
    var params = req.params;

    var getDiffPromise = storage.getDiff({
      project: params.project,
      build: params.build,
      browser: params.browser,
      image: params.file
    });

    serveImage(getDiffPromise, res);
  }
};

module.exports = Api;
