const Auth = {};
const passport = require('passport');
const renderError = require('../lib/renderError');
// import config = require('../config.js';
/**
 * render site index
 * @param req {request}
 * @param res {response}
 */
Auth.index = (req, res) => {
    res.render('index');
};

Auth.signIn = (req, res) => {
    res.render('signin');
};

Auth.signOut = (req, res) => {
    req.logout();
    res.redirect('/');
};

Auth.signInPost = (req, res, next) => {

    passport.authenticate('ldapauth', (err, user, info) => {
        if (err) {
            console.error(err);
            return renderError(err, res);
            // return next(err);
        }
        if (info) {
            console.info(info);
        }
        if (!user) {
            let message = 'No such user';
            if (info && info.message) {
                message += `, ${info.message}`;
            }
		console.log(message);
            return renderError(message, res);
        }
        req.logIn(user, err => {
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


module.exports = Auth;
