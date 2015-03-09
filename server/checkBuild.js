'use strict';

var Bluebird = require('bluebird');
var dispatcher = require('./dispatcher');
var storage = require('./utils/storage');

/*
payload.id string
*/
function buildReceived(payload) {
  if (payload === undefined || payload.id === undefined) {
    return new Bluebird.reject(new Error('Payload must contain an id'));
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

    return diffCommonBrowsers({
      head: buildInfo.head,
      base: buildInfo.base
    });
  });
}

/*
options.buildInfo
  options.buildInfo.head
  options.buildInfo.base
*/
function diffCommonBrowsers(options) {
  var head = options.head;
  var base = options.base;

  return Bluebird.all([
    storage.getBrowsersForSha(head),
    storage.getBrowsersForSha(base)
    ])
  .spread(function(headBrowsers, baseBrowsers) {
    var commonBrowsers = headBrowsers.filter(function(n) {
      return baseBrowsers.indexOf(n) !== -1;
    });

    var imagePromises = commonBrowsers.map(function(browser) {
      return generateDiffImages({
        head: head,
        base: base,
        browser: browser
      });
    });

    return Bluebird.all(imagePromises);

    // if head browsers === base browsers, obv
    // if head browsers is subset of base browsers
    //    use head browsers
    // if base browsers is subset of head browsers
    //    use base browsers

    // use only the browsers they have in common

  });
}

/*
options.head string
options.base string
options.browser string
*/
function generateDiffImages() {}

dispatcher.on('buildReceived', buildReceived);

if (process.env.NODE_ENV === 'test') {
  var visible = {
    _buildReceived: buildReceived
  };

  Object.defineProperty(visible, '_diffCommonBrowsers', {
    get: function() {
      return diffCommonBrowsers;
    },
    set: function(newFunc) {
      diffCommonBrowsers = newFunc;
    }
  });

  module.exports = visible;
}
