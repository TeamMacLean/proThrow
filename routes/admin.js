var express = require('express');
var router = express.Router();

var admin = require('../controllers/admin');

router.route('/admin')
  .get(admin.index);

router.route('/admin/request/:uuid')
  .get(admin.show);

router.route('/admin/request/:uuid/toggle')
  .get(admin.toggle);

router.route('/admin/request/:uuid/addnote')
  .post(admin.addNote);
module.exports = router;
