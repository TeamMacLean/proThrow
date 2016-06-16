const Request = require('../models/request');

const uuid = {};

uuid.generate = (count, k) => {
  const _sym = 'abcdefghijklmnopqrstuvwxyz1234567890';
  let str = '';

  for (let i = 0; i < count; i++) {
    str += _sym[parseInt(Math.random() * (_sym.length))];
  }

  Request.filter({uuid: str}).run().then(result => {
    if (!result.length) {
      k(str);
    } else {
      uuid.generate(count, k);
    }
  });
};


module.exports = uuid;