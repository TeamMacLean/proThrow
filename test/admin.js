var request = require('supertest');

var app = require('../app');

describe('admin controller', function () {
  describe('index', function () {
    it('should return 200', function (done) {
      request(app)
        .get('/admin')
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect(200)
        .end(function (err) {
          if (err) {
            done(err)
          } else {
            done();
          }
        });
    })
  });
});