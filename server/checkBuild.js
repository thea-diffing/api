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
  })
  .then(function(result) {

  })
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
      return diffBrowser({
        head: head,
        base: base,
        browser: browser
      });
    });

    return Bluebird.all(imagePromises);
  });
}

/*
options.head string
options.base string
options.browser string
*/
function diffBrowser(options) {
  var head = options.head;
  var base = options.base;
  var browser = options.browser;

  return Bluebird.all([
    storage.getImagesForShaBrowser({
      sha: head,
      browser: browser
    }),
    storage.getImagesForShaBrowser({
      sha: base,
      browser: browser
    })
  ])
  .spread(function(headImages, baseImages) {
    var commonImages = headImages.filter(function(image) {
      return baseImages.indexOf(image) !== -1;
    });

    var imagePromises = commonImages.map(function(image) {
      return diffImage({
        head: head,
        base: base,
        browser: browser,
        image: image
      });
    });

    return Bluebird.all(imagePromises);
  });
}

/*
options.head string
options.base string
options.browser string
options.image string
*/
function diffImage(options) {
  // console.log('foo', options);
}

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

  Object.defineProperty(visible, '_diffBrowser', {
    get: function() {
      return diffBrowser;
    },
    set: function(newFunc) {
      diffBrowser = newFunc;
    }
  });

  Object.defineProperty(visible, '_diffImage', {
    get: function() {
      return diffImage;
    },
    set: function(newFunc) {
      diffImage = newFunc;
    }
  });

  module.exports = visible;
}
