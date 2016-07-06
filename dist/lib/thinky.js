'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _thinky = require('thinky');

var _thinky2 = _interopRequireDefault(_thinky);

var _config = require('../../config');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var thinky = new _thinky2.default({
    db: _config.dbName
});

exports.default = thinky;