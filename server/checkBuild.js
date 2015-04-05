'use strict';

var assert = require('chai').assert;
var Bluebird = require('bluebird');
var dispatcher = require('./dispatcher');
var storage = require('./utils/storage');
var constants = require('./constants');
var actions = require('./actions');

var config;

/*
payload.sha string
*/
function diffSha(options) {
  assert.isObject(options);
  assert.isString(options.project);
  assert.isString(options.sha);

  return storage.getBuildsForSha({
    project: options.project,
    sha: options.sha
  })
  .then(function(builds) {
    var diffBuildPromises = builds.map(function(build) {
      return diffBuild({
        project: options.project,
        build: build
      });
    });

    return Bluebird.all(diffBuildPromises);
  });
}

function diffBuild(options) {
  assert.isObject(options);
  assert.isString(options.project);
  assert.isString(options.build);

  var project = options.project;
  var build = options.build;
  var buildInfo;

  return storage.getBuildInfo({
    project: project,
    build: build
  })
  .then(function(info) {
    buildInfo = info;

    if (buildInfo.status === 'pending') {
      return storage.getBrowsersForSha({
        project: project,
        sha: info.head
      })
      .then(function(browsers) {
        if (browsers.length < buildInfo.numBrowsers) {
          return;
        }

        return diffCommonBrowsers({
          project: project,
          build: build,
          head: buildInfo.head,
          base: buildInfo.base
        })
        .then(function(result) {
          if (Object.keys(result).length > 0) {
            return storage.updateBuildInfo({
              project: project,
              build: build,
              status: 'failed',
              diff: result
            })
            .then(function() {
              actions.setBuildStatus({
                project: project,
                sha: buildInfo.head,
                status: 'failure'
              });

              var message = generateMarkdownMessage({
                project: project,
                build: build
              }, result);

              actions.addComment({
                project: project,
                sha: buildInfo.head,
                comment: message
              });
            });
          } else {
            return storage.updateBuildInfo({
              project: project,
              build: build,
              status: 'success'
            })
            .then(function() {
              actions.setBuildStatus({
                project: project,
                sha: buildInfo.head,
                status: 'success'
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
  assert.isString(options.project);
  assert.isString(options.build);
  assert.isString(options.head);
  assert.isString(options.base);

  var project = options.project;
  var build = options.build;
  var head = options.head;
  var base = options.base;

  return Bluebird.all([
    storage.getBrowsersForSha({
      project: project,
      sha: head
    }),
    storage.getBrowsersForSha({
      project: project,
      sha: base
    })
  ])
  .spread(function(headBrowsers, baseBrowsers) {
    var commonBrowsers = headBrowsers.filter(function(n) {
      return baseBrowsers.indexOf(n) !== -1;
    });

    var imagePromises = commonBrowsers.map(function(browser) {
      return diffBrowser({
        project: project,
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
  assert.isString(options.project);
  assert.isString(options.build);
  assert.isString(options.head);
  assert.isString(options.base);
  assert.isString(options.browser);

  var project = options.project;
  var build = options.build;
  var head = options.head;
  var base = options.base;
  var browser = options.browser;

  return Bluebird.all([
    storage.getImagesForShaBrowser({
      project: project,
      sha: head,
      browser: browser
    }),
    storage.getImagesForShaBrowser({
      project: project,
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
        project: project,
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
  assert.isString(options.project);
  assert.isString(options.build);
  assert.isString(options.head);
  assert.isString(options.base);
  assert.isString(options.browser);
  assert.isString(options.image);

  var project = options.project;
  var build = options.build;
  var head = options.head;
  var base = options.base;
  var browser = options.browser;
  var image = options.image;

  return Bluebird.all([
    storage.getImage({
      project: project,
      sha: head,
      browser: browser,
      image: image
    }),
    storage.getImage({
      project: project,
      sha: base,
      browser: browser,
      image: image
    })
  ])
  .spread(function(headImage, baseImage) {
    var differ = config.getDiffer();

    return differ.generateDiff(headImage, baseImage)
    .then(function(data) {

      if (data.distance > 0) {
        return storage.saveDiffImage({
          project: project,
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

function generateMarkdownMessage(buildInfo, diffBrowsers) {
  assert.isObject(buildInfo);
  assert.isString(buildInfo.project);
  assert.isString(buildInfo.build);

  assert.isObject(diffBrowsers);

  var browsers = Object.keys(diffBrowsers);

  var lines = ['Diffs found in ' + browsers.length + ' browser(s): ' + browsers.join(', ')];
  var url = config.getUrl();

  var browserGroups = browsers.map(function(browser) {
    var imagesPaths = diffBrowsers[browser].map(function(image) {
      return url + '/api/diff/' + buildInfo.project + '/' + buildInfo.build + '/' + browser + '/' + image;
    })
    .map(function(url) {
      return '![' + url + '](' + url + ')';
    });

    var browserString = [
      '<h3>' + browser + '</h3>'
    ]
    .concat(imagesPaths);

    return browserString.join('\n');

  }).join('\n\n');

  lines = lines.concat(browserGroups);

  var body = lines.join('\n');
  return body;
}

function CheckBuild(newConfig) {
  config = newConfig;
}

CheckBuild.prototype = {
  register: function() {
    dispatcher.on(constants.diffSha, diffSha);
  }
};

if (process.env.NODE_ENV === 'test') {
  CheckBuild.prototype._diffSha = diffSha;

  Object.defineProperty(CheckBuild.prototype, '_diffBuild', {
    get: function() {
      return diffBuild;
    },

    set: function(newFunc) {
      diffBuild = newFunc;
    }
  });

  Object.defineProperty(CheckBuild.prototype, '_diffCommonBrowsers', {
    get: function() {
      return diffCommonBrowsers;
    },

    set: function(newFunc) {
      diffCommonBrowsers = newFunc;
    }
  });

  Object.defineProperty(CheckBuild.prototype, '_diffBrowser', {
    get: function() {
      return diffBrowser;
    },

    set: function(newFunc) {
      diffBrowser = newFunc;
    }
  });

  Object.defineProperty(CheckBuild.prototype, '_diffImage', {
    get: function() {
      return diffImage;
    },

    set: function(newFunc) {
      diffImage = newFunc;
    }
  });

  Object.defineProperty(CheckBuild.prototype, '_generateMarkdownMessage', {
    get: function() {
      return generateMarkdownMessage;
    },

    set: function(newFunc) {
      generateMarkdownMessage = newFunc;
    }
  });
}

module.exports = CheckBuild;
