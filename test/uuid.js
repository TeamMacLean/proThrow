require('chai').should();

describe('uuid', () => {
  const uuid = require('../lib/uuid');
  describe('generate', () => {
    it('should generate a uuid', done => {
      uuid.generate(10, str => {
        str.should.have.length(10);
        done();
      })
    })
  })
});