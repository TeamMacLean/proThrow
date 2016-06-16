const request = require('supertest');

const app = require('../app');

describe('admin controller', () => {
  describe('index', () => {
    it('should return 200', done => {
      request(app)
        .get('/admin')
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect(200)
        .end(err => {
          if (err) {
            done(err)
          } else {
            done();
          }
        });
    })
  });
});