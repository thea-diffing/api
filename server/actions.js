'use strict';

var dispatcher = require('./dispatcher');
var constants = require('./constants');

var Actions = {
  diffSha: function(sha) {
    dispatcher.emit(constants.diffSha, {
      sha: sha
    });
  }
};

module.exports = Actions;
