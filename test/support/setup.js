'use strict';

var path = require('path');

var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.use(require('chai-shallow-deep-equal'));

var sinon = require('sinon');
sinon.assert.expose(chai.assert, {
  prefix: ''
});

global.__TESTDATA__ = path.join(__dirname, '..', '..', 'test-data');
global.assert = chai.assert;
