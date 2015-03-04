'use strict';

var fs = require('fs-extra');
var path = require('path');

var root = path.join(__dirname, '..', '..');
var dataPath = path.join(root, 'data');
var buildsPath = path.join(root, 'builds');

var Storage = {
  init: function() {
    fs.ensureDirSync(dataPath);
    fs.ensureDirSync(buildsPath);
  },

  startBuild: function() {
    return new Promise(function(resolve, reject) {
      // create a guid
      // create a folder
      // store a json file in folder
      // if failure reject
      // otherwise resolve with the build guid
    });
  }
};

module.exports = Storage;
