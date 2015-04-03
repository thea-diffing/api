'use strict';

var Bluebird = require('bluebird');
var assert = require('chai').assert;
var fs = Bluebird.promisifyAll(require('fs-extra'));

var storage = require('../utils/storage');
var actions = require('../actions');
var githubUtils = require('../utils/github');

var configuration;

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
  // assert.isObject(config);

  configuration = config;
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
        project: result.id
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
      return githubUtils.setStatus({
        sha: head,
        state: 'pending'
      })
      .then(function() {
        res.status(200).json({
          status: 'success',
          build: result.id
        });
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
    })
    .catch(function() {
      res.status(500).json({
        status: 'failure',
        message: 'failed uploading'
      });
    })
    .then(function() {
      actions.diffSha(sha);
      return fs.removeAsync(images.path);
    });
  },

  getBuild: function(req, res) {
    var project = req.body.project;
    var buildId = req.body.id;

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
    throw new Error('not implemented');
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
