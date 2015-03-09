'use strict';

var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.use(require('chai-shallow-deep-equal'));

var sinon = require('sinon');
sinon.assert.expose(chai.assert, {
  prefix: ''
});

global.assert = chai.assert;
