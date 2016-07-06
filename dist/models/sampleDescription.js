'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _thinky = require('../lib/thinky.js');

var _thinky2 = _interopRequireDefault(_thinky);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var type = _thinky2.default.type;

var SampleDescription = _thinky2.default.createModel('SampleDescription', {
    id: type.string(),
    requestID: type.string(),
    position: type.number().required(),
    sampleNumber: type.string().required(),
    sampleDescription: type.string().required()
});

exports.default = SampleDescription;