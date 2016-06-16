const request = require('supertest');

const app = require('../app');

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
  describe('new', () => {
    it('should return 200', done => {
      request(app)
        .get('/new')
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err)
          } else {
            done();
          }
        });
    })
  });
  describe('new post', () => {
    it('should return 200', done => {
      request(app)
        .post('/new')
        .type('form')
        .send({species: 'test'})
        .send({searchDatabase: 'test'})
        .send({tissue: 'test'})
        .send({tissueAgeNum: 'test'})
        .send({tissueAgeType: 'test'})
        .send({growthConditions: 'test'})
        .send({samplePrep: 'test'})
        .send({analysisType: 'test'})
        .send({quantitativeAnalysisRequired: 'test'})
        .send({typeOfLabeling: 'test'})
        .send({labelUsed: 'test'})
        .send({digestion: 'test'})
        .send({typeOfPTM: 'test'})
        .send({typeOfDigestion: 'test'})
        .send({sequenceInfo: 'test'})
        .send({preferredOrder: 'test'})
        .send({sampleNumber: 'test'})
        .send({sampleDescription: 'test'})
        .send({supportingImages: 'test'})
        .send({supportingImageDescription: 'test'})
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err)
          } else {
            done();
          }
        });
    });
    //TODO delete test after done
  })
});