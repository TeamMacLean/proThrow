#!/usr/bin/env node

var app = require('./app');
var http = require('http');
var config = require('./config.json');

var port = process.env.PORT || config.port;
app.set('port', port);

var server = http.createServer(app);

server.listen(port);
server.on('listening', onListening);

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  console.log('Listening on', bind);
}
