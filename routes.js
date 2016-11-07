const express = require('express');
const router = express.Router();

const Util = require('./lib/util');
const admin = require('./controllers/admin');
const index = require('./controllers/index');
const Auth = require('./controllers/auth');
const Users = require('./controllers/users');
const Requests = require('./controllers/requests');


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
    .get(Requests.new)
    .post(Requests.newPost);


//REQUEST

router.route('/request/:id')
    .all(isAuthenticated)
    .all(isAdmin)
    .get(Requests.show);

router.route('/request/:id/edit')
    .all(isAuthenticated)
//    .all(isAdmin)
    .get(Requests.edit);

router.route('/request/:id/clone')
    .all(isAuthenticated)
    .get(Requests.clone);

// router.route('/request/:id/toggle')
//     .all(isAuthenticated)
//     .all(isAdmin)
//     .get(admin.toggle);

// router.route('/request/:id/addnote')
//     .all(isAuthenticated)
//     .all(isAdmin)
//     .post(admin.addNote);


//USER
router.route('/user/:username')
    .all(isAuthenticated)
    .get(Users.show);
//TODO

//ADMIN

router.route('/admin')
    .all(isAuthenticated)
    .all(isAdmin)
    .get(admin.index);

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
