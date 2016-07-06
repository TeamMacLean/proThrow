const Auth = {};
import passport from 'passport';
import renderError from '../lib/renderError';
// import config from '../config.js';
import LOG from '../lib/log';
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
            LOG.error(err);
            return next(err);
        }
        if (info) {
            LOG.info(info);
        }
        if (!user) {
            let message = 'No such user';
            if (info && info.message) {
                message += `, ${info.message}`;
            }
            return renderError(message, res);
            //return res.render('error', {error: message});
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


export default Auth;
