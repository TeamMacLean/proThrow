'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _request = require('../models/request');

var _request2 = _interopRequireDefault(_request);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var uuid = {};

uuid.generate = function (count, k) {
  var _sym = 'abcdefghijklmnopqrstuvwxyz1234567890';
  var str = '';

  for (var i = 0; i < count; i++) {
    str += _sym[parseInt(Math.random() * _sym.length)];
  }

  _request2.default.filter({ uuid: str }).run().then(function (result) {
    if (!result.length) {
      k(str);
    } else {
      uuid.generate(count, k);
    }
  });
};

exports.default = uuid;