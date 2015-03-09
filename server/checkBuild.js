'use strict';

var Bluebird = require('bluebird');
var dispatcher = require('./dispatcher');
var storage = require('./utils/storage');

function buildReceived(payload) {
  if (payload === undefined || payload.id === undefined) {
    throw new Error('Payload must contain an id');
  }

  var buildId = payload.id;
  var buildInfo;

  return storage.getBuildInfo(buildId)
  .then(function(info) {
    buildInfo = info;
    return storage.getBrowsersForSha(info.head);
  })
  .then(function(browsers) {
    if (browsers.length < buildInfo.numBrowsers) {
      return;
    }

    return calculateDiffs({
      buildInfo: buildInfo,
      browsers: browsers
    });
  });
}

/*
options.buildInfo string
options.browsers array[string]
*/
function calculateDiffs(options) {

}

dispatcher.on('buildReceived', buildReceived);

if (process.env.NODE_ENV === 'test') {
  var visible = {
    _buildReceived: buildReceived
  };

  Object.defineProperty(visible, '_calculateDiffs', {
    get: function() {
      return calculateDiffs;
    },
    set: function(newFunc) {
      calculateDiffs = newFunc;
    }
  });

  module.exports = visible;
}
