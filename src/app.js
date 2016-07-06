import config from '../config';
import express from 'express';
import path from 'path';
import session from 'express-session';
const rethinkSession = require('session-rethinkdb')(session);
import passport from 'passport';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import util from './lib/util.js';
import thinky from './lib/thinky';
const store = new rethinkSession(thinky.r);
import fs from 'fs-extra';
const app = express();
import routes from './routes';


app.set('views', path.join(__dirname, '../', 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

app.use(session(
    {
        secret: config.secret,
        resave: false,
        saveUninitialized: false,
        store
    }
));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    if (req.user != null) {
        res.locals.signedInUser = {};
        res.locals.signedInUser.username = req.user.username;
        res.locals.signedInUser.name = req.user.name;
        res.locals.signedInUser.fistName = req.user.firstName;
        res.locals.signedInUser.lastName = req.user.lastName;
        res.locals.signedInUser.mail = req.user.mail;
        res.locals.signedInUser.isAdmin = util.isAdmin(req.user.username);
        return next(null, req, res);
    } else {
        return next();
    }
});


//ensure essential folders exist
fs.ensureDir(config.supportingImageRoot, err => {
    if (err) {
        console.err(err);
    }
});
fs.ensureDir(config.supportingImagePreviewRoot, err => {
    if (err) {
        console.err(err);
    }
});

util.setupPassport();

app.use('/', routes);


export default app;
