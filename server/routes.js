'use strict';

var assert = require('chai').assert;

/**
 * Application routes
 */
module.exports = function(options) {
  assert.isObject(options);
  assert.isDefined(options.app);
  assert.isDefined(options.api);

  var app = options.app;
  var api = options.api;

  // Server API Routes

  /*
  Create a new project to hold builds
  POST params:

  service: {
    name: DVCS Name,
    options: DVCS Options
  }

  Example:

  service: {
    name: "github",
    options: {
      user: "VisualTesting",
      repository: "test-example"
    }
  }

  Response:
  {
    status: "failure",
    message: "unsupported DVCS"
  }

  {
    status: "success",
    project: GUID
  }

  */
  app.route('/api/createProject').post(api.createProject);

  /*
  Start a build
  POST params:
  - project string
  - head string
  - base string
  - numBrowsers int
  Response:
  {
      status: "success",
      build: GUID
  }

  {
      status: "failure",
      message: "invalid arguments"
  }
  */
  app.route('/api/startBuild').post(api.startBuild);

  /*
  Upload a tarball with the images
  POST params:
  - project string
  - sha string
  - browser name
  - files
    - images (a tar of the images)
  Response:
  {
      status: "success"
  }

  {
      status: "failure",
      message: "failed uploading"
  }
  */
  app.route('/api/upload').post(api.upload);

  /*
  Get a build details
  GET Params
  - project string
  - id string
  Response:
  {
      id: 203,
      head: {SHA},
      base: {SHA},
      status: "pending"
  }

  {
      build: 203,
      head: {SHA},
      base: {SHA},
      status: "success" // either "failed", "success"
      diffs: {
          'Chrome 28': [
              'homepage.navbar.700.png',
              'homepage.navbar.1300.png',
              'homepage.search.700.png',
              'homepage.search.1300.png'
          ],
          'IE 8': [
              'homepage.navbar.700.png',
              'homepage.search.700.png'
          ]
      }
  }

  {
      status: "failure",
      message: "unknown build"
  }
  */
  app.route('/api/getBuild').get(api.getBuild);

  /*
  Approve a build
  POST Params
  - project string
  - build string
  Response:
  {
      status: "success"
  }

  {
      status: "failure",
      message: "unknown build"
  }
  */
  app.route('/api/confirm').post(api.confirm);

  /*
  Get the image for the SHA. These routes can be used to in <img> tags
  */
  app.route('/api/image/:project/:sha/:browser/:file').get(api.getImage);
  app.route('/api/diff/:project/:build/:browser/:file').get(api.getDiff);

  // All undefined routes should return a 404
  app.route('/*').get(function(req, res) {
    res.sendStatus(404);
  });
};
