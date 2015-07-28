require('chai').should();

describe('uuid', function () {
  var uuid = require('../util/uuid');
  describe('generate', function () {
    it('should generate a uuid', function (done) {
      uuid.generate(10, function (str) {
        str.should.have.length(10);
        done();
      })
    })
  })
});