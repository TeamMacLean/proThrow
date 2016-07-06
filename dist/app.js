'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _expressSession = require('express-session');

var _expressSession2 = _interopRequireDefault(_expressSession);

var _passport = require('passport');

var _passport2 = _interopRequireDefault(_passport);

var _cookieParser = require('cookie-parser');

var _cookieParser2 = _interopRequireDefault(_cookieParser);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _util = require('./lib/util.js');

var _util2 = _interopRequireDefault(_util);

var _thinky = require('./lib/thinky');

var _thinky2 = _interopRequireDefault(_thinky);

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _routes = require('./routes');

var _routes2 = _interopRequireDefault(_routes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var rethinkSession = require('session-rethinkdb')(_expressSession2.default);

var store = new rethinkSession(_thinky2.default.r);

var app = (0, _express2.default)();


app.set('views', _path2.default.join(__dirname, '../', 'views'));
app.set('view engine', 'ejs');

app.use(_bodyParser2.default.json());
app.use(_bodyParser2.default.urlencoded({ extended: false }));
app.use(_express2.default.static(_path2.default.join(__dirname, 'public')));
app.use((0, _cookieParser2.default)());

app.use((0, _expressSession2.default)({
    secret: _config2.default.secret,
    resave: false,
    saveUninitialized: false,
    store: store
}));

app.use(_passport2.default.initialize());
app.use(_passport2.default.session());

app.use(function (req, res, next) {
    if (req.user != null) {
        res.locals.signedInUser = {};
        res.locals.signedInUser.username = req.user.username;
        res.locals.signedInUser.name = req.user.name;
        res.locals.signedInUser.fistName = req.user.firstName;
        res.locals.signedInUser.lastName = req.user.lastName;
        res.locals.signedInUser.mail = req.user.mail;
        res.locals.signedInUser.isAdmin = _util2.default.isAdmin(req.user.username);
        return next(null, req, res);
    } else {
        return next();
    }
});

//ensure essential folders exist
_fsExtra2.default.ensureDir(_config2.default.supportingImageRoot, function (err) {
    if (err) {
        console.err(err);
    }
});
_fsExtra2.default.ensureDir(_config2.default.supportingImagePreviewRoot, function (err) {
    if (err) {
        console.err(err);
    }
});

_util2.default.setupPassport();

app.use('/', _routes2.default);

exports.default = app;