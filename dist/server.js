#!/usr/bin/env node
'use strict';

var _socketUpload = require('./lib/socketUpload');

var _socketUpload2 = _interopRequireDefault(_socketUpload);

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _app = require('./app');

var _app2 = _interopRequireDefault(_app);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var server = require('http').createServer(_app2.default);
var io = require('socket.io')(server);
(0, _socketUpload2.default)(io);

// var server = http.createServer(app);
//
// server.listen(port);
// server.on('listening', onListening);
//
// function onListening() {
//     var addr = server.address();
//     var bind = typeof addr === 'string'
//         ? 'pipe ' + addr
//         : 'port ' + addr.port;
//     console.log('Listening on', bind);
// }
//
//

server.listen(_config2.default.port, '0.0.0.0', function () {
    console.log('Listening on port', _config2.default.port);
});