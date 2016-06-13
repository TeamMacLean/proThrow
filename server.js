#!/usr/bin/env node

var server = require('./app');
var config = require('./config.json');

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


server.listen(config.port, '0.0.0.0', function () {
    console.log('Listening on port', config.port);
});