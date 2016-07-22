#!/usr/bin/env node
const socketUploader = require('./lib/socketUpload');
const socketSearch = require('./lib/socketSearch');
const config = require('./config');

const app = require('./app');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
socketUploader(io);
socketSearch(io);

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

server.listen(config.port, '0.0.0.0', () => {
    console.log('Listening on port', config.port);
});
