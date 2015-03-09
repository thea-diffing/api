'use strict';

var dispatcher = require('../server/dispatcher');
require('mocha-sinon');

describe('module/dispatcher', function() {
  it('does not trigger on different event', function() {
    var spy = this.sinon.spy();

    dispatcher.on('event', spy);
    dispatcher.emit('e');

    assert.equal(spy.callCount, 0);
  });

  it('does trigger on event', function() {
    var spy = this.sinon.spy();

    dispatcher.on('event', spy);
    dispatcher.emit('event');

    assert(spy.calledOnce);
  });
});
