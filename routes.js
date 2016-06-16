const express = require('express');
const router = express.Router();

const Util = require('./lib/util');

const admin = require('./controllers/admin');
const index = require('./controllers/index');
const Auth = require('./controllers/auth');


function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        req.session.returnTo = req.path;
        return res.redirect('/signin');
    }
}

function isAdmin(req, res, next) {
    if (Util.isAdmin(req.user.username)) {
        return next();
    } else {
        return res.send('your not an admin!');
    }
}

router.route('/')
    .get(index.index);

router.route('/new')
    .all(isAuthenticated)
    .get(index.new)
    .post(index.newPost);

module.exports = router;


//ADMIN

router.route('/admin')
    .all(isAuthenticated)
    .all(isAdmin)
    .get(admin.index);

router.route('/admin/request/:uuid')
    .all(isAuthenticated)
    .all(isAdmin)
    .get(admin.show);

router.route('/admin/request/:uuid/toggle')
    .all(isAuthenticated)
    .all(isAdmin)
    .get(admin.toggle);

router.route('/admin/request/:uuid/addnote')
    .all(isAuthenticated)
    .all(isAdmin)
    .post(admin.addNote);

//AUTH

router.route('/signin')
    .get(Auth.signIn)
    .post(Auth.signInPost);

router.route('/signout')
    .get(Auth.signOut);

router.route('*')
    .get((req, res) => {
        res.render('404');
    });


module.exports = router;