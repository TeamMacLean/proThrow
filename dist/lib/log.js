'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = new _winston2.default.Logger({
    colors: {
        success: 'green',
        info: 'blue',
        warn: 'yellow',
        error: 'red'
    },
    levels: {
        success: 3,
        info: 2,
        warn: 1,
        error: 0
    },
    transports: [new _winston2.default.transports.Console({
        level: 'success',
        colorize: true,
        timestamp: true
    })]
});

exports.default = {
    info: function info() {
        for (var _len = arguments.length, inputs = Array(_len), _key = 0; _key < _len; _key++) {
            inputs[_key] = arguments[_key];
        }

        logger.info(inputs.join(' '));
    },
    warn: function warn() {
        for (var _len2 = arguments.length, inputs = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            inputs[_key2] = arguments[_key2];
        }

        logger.warn(inputs.join(' '));
    },
    error: function error() {
        for (var _len3 = arguments.length, inputs = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
            inputs[_key3] = arguments[_key3];
        }

        logger.error(inputs.join(' '));
    },
    success: function success() {
        for (var _len4 = arguments.length, inputs = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
            inputs[_key4] = arguments[_key4];
        }

        logger.success(inputs.join(' '));
    }
};