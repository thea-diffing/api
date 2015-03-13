'use strict';

var dispatcher = require('../dispatcher');
var constants = require('../constants');

var Actions = {
  shaReceieved: function(sha) {
    dispatcher.emit(constants.shaReceived, {
      sha: sha
    });
  }
};

module.exports = Actions;
