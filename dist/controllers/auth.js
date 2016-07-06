'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _passport = require('passport');

var _passport2 = _interopRequireDefault(_passport);

var _renderError = require('../lib/renderError');

var _renderError2 = _interopRequireDefault(_renderError);

var _log = require('../lib/log');

var _log2 = _interopRequireDefault(_log);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Auth = {};
// import config from '../config.js';

/**
 * render site index
 * @param req {request}
 * @param res {response}
 */
Auth.index = function (req, res) {
    res.render('index');
};

Auth.signIn = function (req, res) {
    res.render('signin');
};

Auth.signOut = function (req, res) {
    req.logout();
    res.redirect('/');
};

Auth.signInPost = function (req, res, next) {

    _passport2.default.authenticate('ldapauth', function (err, user, info) {
        if (err) {
            _log2.default.error(err);
            return next(err);
        }
        if (info) {
            _log2.default.info(info);
        }
        if (!user) {
            var message = 'No such user';
            if (info && info.message) {
                message += ', ' + info.message;
            }
            return (0, _renderError2.default)(message, res);
            //return res.render('error', {error: message});
        }
        req.logIn(user, function (err) {
            if (err) {
                return next(err);
            }

            //take them to the page they wanted before signing in :)
            if (req.session.returnTo) {
                return res.redirect(req.session.returnTo);
            } else {
                return res.redirect('/');
            }
        });
    })(req, res, next);
};

exports.default = Auth;