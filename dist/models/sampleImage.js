'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _thinky = require('../lib/thinky.js');

var _thinky2 = _interopRequireDefault(_thinky);

var _config = require('../../config.js');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var type = _thinky2.default.type;

var SampleImage = _thinky2.default.createModel('SampleImage', {
    id: type.string(),
    uid: type.string().required(),
    requestID: type.string(),
    name: type.string().required(),
    path: type.string().required(),
    description: type.string()
});

SampleImage.define('getURL', function () {
    return _config2.default.supportingImageRootURL + this.uid;
});
exports.default = SampleImage;