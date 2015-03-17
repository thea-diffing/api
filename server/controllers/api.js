'use strict';

var Bluebird = require('bluebird');
var fs = Bluebird.promisifyAll(require('fs-extra'));

var storage = require('../utils/storage');
var actions = require('../actions');

function Api() {}

Api.prototype = {
  startBuild: function(req, res) {
    var params = req.body;

    var head = params.head;
    var base = params.base;
    var numBrowsers = params.numBrowsers;

    if (!head || !base || !numBrowsers) {
      res.status(400).json({
        status: 'failure',
        message: 'invalid arguments'
      });
      return;
    }

    storage.startBuild({
      head: head,
      base: base,
      numBrowsers: numBrowsers
    })
    .then(function(result) {
      res.status(200).json({
        status: 'success',
        build: result.id
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

    var sha;
    var browser;
    var files;
    var images;

    try {
      sha = params.sha;
      browser = params.browser;
      files = req.files;
      images = files.images;
    }
    finally {
      if (!sha || !browser || !files || !images) {
        res.status(400).json({
          status: 'failure',
          message: 'invalid arguments'
        });
        return;
      }
    }

    // TODO: validate the structure of the tar file
    storage.saveImages({
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
    var buildId = req.body.id;

    if (!buildId) {
      res.status(400).json({
        status: 'failure',
        message: 'invalid arguments'
      });
      return;
    }

    storage.hasBuild(buildId)
    .then(function(exists) {
      if (exists) {
        return storage.getBuildInfo(buildId)
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

    var sha = params.sha;
    var browser = params.browser;
    var file = params.file;

    if (!sha || !browser || !file) {
      res.status(400).json({
        status: 'failure',
        message: 'invalid arguments'
      });
      return;
    }

    storage.getImage({
      sha: sha,
      browser: browser,
      image: file
    })
    .then(function(image) {
      res.setHeader('Content-Type', 'image/png');
      image.pack().pipe(res);
    }, function() {
      res.sendStatus(404);
    })
    .catch(function() {
      res.sendStatus(500);
    });
  },

  getDiff: function(req, res) {
    throw new Error('not implemented');
  }
};

module.exports = new Api();
