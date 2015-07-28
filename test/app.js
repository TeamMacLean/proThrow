describe('app', function () {
  var app = require('../app');
  var http = require('http');
  var server;
  describe('start', function () {
    it('should start ok', function (done) {
      server = http.createServer(app);
      server.on('listening', function () {
        //success
        done();
      });
      server.on('error', function (err) {
        //error
        done(err);
      });
      server.listen(8888);
    })
  });
  describe('stop', function () {
    it('should stop ok', function (done) {
      server.close();
      done();
    })
  })
});