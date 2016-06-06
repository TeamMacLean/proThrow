var Request = require('../models/request');

var uuid = {};

uuid.generate = function (count, k) {
  var _sym = 'abcdefghijklmnopqrstuvwxyz1234567890';
  var str = '';

  for (var i = 0; i < count; i++) {
    str += _sym[parseInt(Math.random() * (_sym.length))];
  }

  Request.filter({uuid: str}).run().then(function (result) {
    if (!result.length) {
      k(str);
    } else {
      uuid.generate(count, k);
    }
  });
};


module.exports = uuid;