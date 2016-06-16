const request = require('supertest');
const app = require('../app');


// make sure the server has started, thats it
describe('index controller', () => {
    describe('index', () => {
        it('should return 200', done => {
            request(app)
                .get('/')
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