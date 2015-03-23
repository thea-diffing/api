'use strict';

var assert = require('chai').assert;
var Bluebird = require('bluebird');
var dispatcher = require('./dispatcher');
var storage = require('./utils/storage');
var differ = require('./utils/differ');
var constants = require('./constants');
var githubUtils = require('./utils/github');

/*
payload.sha string
*/
function diffSha(payload) {
  if (payload === undefined || payload.sha === undefined) {
    return new Bluebird.reject(new Error('Payload must contain a sha'));
  }

  var sha = payload.sha;

  return storage.getBuildsForSha(sha)
  .then(function(builds) {
    var diffBuildPromises = builds.map(function(build) {
      return diffBuild({
        id: build
      });
    });

    return Bluebird.all(diffBuildPromises);
  });
}

function diffBuild(options) {
  assert.isObject(options);
  assert.isString(options.id);

  var buildId = options.id;
  var buildInfo;

  return storage.getBuildInfo(buildId)
  .then(function(info) {
    buildInfo = info;

    if (buildInfo.status === 'pending') {
      console.log('diffing build', buildId);

      return storage.getBrowsersForSha(info.head)
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
            return storage.updateBuildInfo(buildId, {
              status: 'failure',
              diff: result
            })
            .then(function() {
              return githubUtils.setStatus({
                sha: buildInfo.head,
                state: 'failure'
              });
            })
            .then(function() {
              var message = githubUtils.generateMarkdownMessage(buildInfo, result);
              console.log('setting comment');
              return githubUtils.addComment({
                sha: buildInfo.head,
                body: message
              });
            });
          } else {
            return storage.updateBuildInfo(buildId, {
              status: 'success'
            })
            .then(function() {
              return githubUtils.setStatus({
                sha: buildInfo.head,
                state: 'success'
              });
            });
          }
        });
      });
    }
  });
}

function diffCommonBrowsers(options) {
  assert.isObject(options);
  assert.isString(options.build);
  assert.isString(options.head);
  assert.isString(options.base);

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

function diffBrowser(options) {
  assert.isObject(options);
  assert.isString(options.build);
  assert.isString(options.head);
  assert.isString(options.base);
  assert.isString(options.browser);

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
resolves
{
  diff: true/false
}
*/
function diffImage(options) {
  assert.isObject(options);
  assert.isString(options.build);
  assert.isString(options.head);
  assert.isString(options.base);
  assert.isString(options.browser);
  assert.isString(options.image);

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

dispatcher.on(constants.diffSha, diffSha);

if (process.env.NODE_ENV === 'test') {
  var visible = {
    _diffSha: diffSha
  };

  Object.defineProperty(visible, '_diffBuild', {
    get: function() {
      return diffBuild;
    },
    set: function(newFunc) {
      diffBuild = newFunc;
    }
  });

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
