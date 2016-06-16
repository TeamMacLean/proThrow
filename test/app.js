describe('app', () => {
  const app = require('../app');
  const http = require('http');
  let server;
  describe('start', () => {
    it('should start ok', done => {
      server = http.createServer(app);
      server.on('listening', () => {
        done();
      });
      server.on('error', err => {
        done(err);
      });
      server.listen(8888);
    })
  });
  describe('stop', () => {
    it('should stop ok', done => {
      server.close();
      done();
    })
  })
});