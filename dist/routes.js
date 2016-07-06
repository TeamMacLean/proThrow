'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _util = require('./lib/util');

var _util2 = _interopRequireDefault(_util);

var _admin = require('./controllers/admin');

var _admin2 = _interopRequireDefault(_admin);

var _index = require('./controllers/index');

var _index2 = _interopRequireDefault(_index);

var _auth = require('./controllers/auth');

var _auth2 = _interopRequireDefault(_auth);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var router = _express2.default.Router();

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        req.session.returnTo = req.path;
        return res.redirect('/signin');
    }
}

function isAdmin(req, res, next) {
    if (_util2.default.isAdmin(req.user.username)) {
        return next();
    } else {
        return res.send('your not an admin!');
    }
}

router.route('/').get(_index2.default.index);

router.route('/new').all(isAuthenticated).get(_index2.default.new).post(_index2.default.newPost);

exports.default = router;

//USER

router.route('/user/:id').all(isAuthenticated);
//TODO

//ADMIN

router.route('/admin').all(isAuthenticated).all(isAdmin).get(_admin2.default.index);

router.route('/admin/request/:uuid').all(isAuthenticated).all(isAdmin).get(_admin2.default.show);

router.route('/admin/request/:uuid/toggle').all(isAuthenticated).all(isAdmin).get(_admin2.default.toggle);

router.route('/admin/request/:uuid/addnote').all(isAuthenticated).all(isAdmin).post(_admin2.default.addNote);

//AUTH

router.route('/signin').get(_auth2.default.signIn).post(_auth2.default.signInPost);

router.route('/signout').get(_auth2.default.signOut);

router.route('*').get(function (req, res) {
    res.render('404');
});

exports.default = router;