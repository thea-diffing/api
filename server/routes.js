'use strict';

var api = require('./controllers/api');

/**
 * Application routes
 */
module.exports = function(app) {
  // Server API Routes

  /*
  Start a build
  POST params:
  - HEAD sha
  - BASE sha
  - Num Browsers
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
  - sha (40 chars)
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
  - id
  Response:
  {
      id: 203,
      head: {SHA},
      base: {SHA},
      status: "pending"
  }

  {
      id: 203,
      head: {SHA},
      base: {SHA},
      status: "success" // either "failed", "success"
      browsers: ['Chrome 28', 'Firefox 34', 'IE 8'],
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
  - id
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
  app.route('/api/image/:sha/:browser/:file').get(api.getImage);
  app.route('/api/diff/:sha/:browser/:file').get(api.getDiff);

  // All undefined routes should return a 404
  app.route('/*').get(function(req, res) {
    res.send(404);
  });
};
