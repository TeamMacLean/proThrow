'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _request = require('./request');

var _request2 = _interopRequireDefault(_request);

var _sampleDescription = require('./sampleDescription');

var _sampleDescription2 = _interopRequireDefault(_sampleDescription);

var _sampleImage = require('./sampleImage');

var _sampleImage2 = _interopRequireDefault(_sampleImage);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_request2.default.hasMany(_sampleDescription2.default, 'samplesDescriptions', 'id', 'requestID');
_request2.default.hasMany(_sampleImage2.default, 'samplesImages', 'id', 'requestID');

_sampleDescription2.default.belongsTo(_request2.default, 'request', 'requestID', 'id');

exports.default = {
    Request: _request2.default,
    SampleDescription: _sampleDescription2.default,
    SampleImage: _sampleImage2.default
};