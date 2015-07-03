var express = require('express');
var router = express.Router();

var index = require('../controllers/index');

router.route('/')
  .get(index.index);

router.route('/new')
  .get(index.new)
  .post(function (req, res) {
    res.send('not ready yet');
  });

module.exports = router;
