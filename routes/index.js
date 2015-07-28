var express = require('express');
var router = express.Router();

var index = require('../controllers/index');

router.route('/')
  .get(index.index);

router.route('/new')
  .get(index.new)
  .post(index.newPost);

module.exports = router;
