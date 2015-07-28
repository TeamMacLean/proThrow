var request = require('supertest');

var app = require('../app');
var index = require('../controllers/index');

describe('index controller', function () {
  describe('index', function () {
    it('should return 200', function (done) {
      request(app)
        .get('/')
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
  describe('new', function () {
    it('should return 200', function (done) {
      request(app)
        .get('/new')
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            done(err)
          } else {
            done();
          }
        });
    })
  });
  describe('new post', function () {
    it('should return 200', function (done) {
      request(app)
        .post('/new')
        .type('form')
        .send({species: 'n/a'})
        .send({searchDatabase: 'n/a'})
        .send({tissue: 'n/a'})
        .send({tissueAgeNum: 'n/a'})
        .send({tissueAgeType: 'n/a'})
        .send({growthConditions: 'n/a'})
        .send({samplePrep: 'n/a'})
        .send({analysisType: 'n/a'})
        .send({quantitativeAnalysisRequired: 'n/a'})
        .send({typeOfLabeling: 'n/a'})
        .send({labelUsed: 'n/a'})
        .send({digestion: 'n/a'})
        .send({typeOfPTM: 'n/a'})
        .send({typeOfDigestion: 'n/a'})
        .send({sequenceInfo: 'n/a'})
        .send({preferredOrder: 'n/a'})
        .send({sampleNumber: 'n/a'})
        .send({sampleDescription: 'n/a'})
        .send({supportingImages: 'n/a'})
        .send({supportingImageDescription: 'n/a'})
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            done(err)
          } else {
            done();
          }
        });
    })
  })
});