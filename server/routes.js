'use strict';

var api = require('./controllers/api'),
    index = require('./controllers');

/**
 * Application routes
 */
module.exports = function(app) {

    // Server API Routes
    app.route('/api/getBranches').get(api.getBranches);
    app.route('/api/getDiffs').get(api.getDiffs);
    app.route('/api/image/:branchName/:browser/:file').get(api.getBranchImage);
    app.route('/api/diff/:branchName/:browser/:file').get(api.getDiff);
    // app.route('/api/:branchName/:file').get(api.downloadRepository);
    // app.route('/api/:project/:file').get(api.getImage);
    // app.route('/api/:project/diff/:diff').get(api.getImage);
    // app.route('/api/confirm').post(api.acceptDiff);
    app.route('/api/upload').post(api.syncImages);

    // All undefined api routes should return a 404
    app.route('/api/*').get(function(req, res) {
        res.send(404);
    });

    app.route('/*').get(index.index);

};
