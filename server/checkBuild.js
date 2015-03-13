'use strict';

var Bluebird = require('bluebird');
var dispatcher = require('./dispatcher');
var storage = require('./utils/storage');
var differ = require('./utils/differ');
var constants = require('./constants');

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
      build: buildId,
      head: buildInfo.head,
      base: buildInfo.base
    })
    .then(function(result) {
      if (Object.keys(result).length > 0) {
        return storage.updateBuild(buildId, {
          status: 'failed',
          diff: result
        });
      } else {
        return storage.updateBuild(buildId, {
          status: 'success'
        });
      }
    });
  });
}

/*
options.build string
options.head string
options.base string
*/
function diffCommonBrowsers(options) {
  var build = options.build;
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
        build: build,
        head: head,
        base: base,
        browser: browser
      })
      .then(function(result) {
        if (result.length > 0) {
          return {
            browser: browser,
            images: result
          };
        }
      });
    });

    return Bluebird.all(imagePromises)
    .then(function(browsers) {
      return browsers.filter(function(browser) {
        return browser !== undefined;
      })
      .reduce(function(obj, browser) {
        obj[browser.browser] = browser.images;

        return obj;
      }, {});
    });
  });
}

/*
options.build string
options.head string
options.base string
options.browser string
*/
function diffBrowser(options) {
  var build = options.build;
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
        build: build,
        head: head,
        base: base,
        browser: browser,
        image: image
      })
      .then(function(result) {
        if (result.diff === true) {
          return image;
        }
      });
    });

    return Bluebird.all(imagePromises)
    .then(function(results) {
      return results.filter(function(result) {
        return result !== undefined;
      });
    });
  });
}

/*
options.build string
options.head string
options.base string
options.browser string
options.image string

resolves
{
  diff: true/false
}
*/
function diffImage(options) {
  var build = options.build;
  var head = options.head;
  var base = options.base;
  var browser = options.browser;
  var image = options.image;

  return Bluebird.all([
    storage.getImage({
      sha: head,
      browser: browser,
      image: image
    }),
    storage.getImage({
      sha: base,
      browser: browser,
      image: image
    })
  ])
  .spread(function(headImage, baseImage) {
    return differ.generateDiff(headImage, baseImage)
    .then(function(data) {

      if (data.distance > 0) {
        return storage.saveDiffImage({
          build: build,
          browser: browser,
          imageName: image,
          imageData: data.image
        })
        .then(function() {
          return {
            diff: true
          };
        });
      } else {
        return {
          diff: false
        };
      }
    });
  });
}

dispatcher.on(constants.shaReceived, buildReceived);

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
