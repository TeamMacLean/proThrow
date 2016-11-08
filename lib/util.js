const Util = {};

const passport = require('passport');
const LdapStrategy = require('passport-ldapauth');
const config = require('../config.js');
const Request = require('../models/request');

Util.setupPassport = () => {

    passport.serializeUser((user, done) => {
        done(null, user);
    });

    passport.deserializeUser((obj, done) => {
        done(null, obj);
    });

    passport.use(new LdapStrategy({
        server: {
            url: config.ldap.url,
            bindDn: config.ldap.bindDn,
            bindCredentials: config.ldap.bindCredentials,
            searchBase: config.ldap.searchBase,
            searchFilter: config.ldap.searchFilter
        }
    }, (userLdap, done) => {

        //if(userLdap.company === 'TSL'){ //TODO check company is TSL
        //}

        const user = {
            id: userLdap.sAMAccountName,
            username: userLdap.sAMAccountName,
            firstName: userLdap.givenName,
            lastName: userLdap.sn,
            name: userLdap.name,
            mail: userLdap.mail,
            memberOf: userLdap.memberOf
        };

        done(null, user);
    }));
};

Util.isAdmin = username => config.admins.indexOf(username) > -1;

Util.generateSafeName = (name, list, cb) => { //$path, $filename
    const safeName = Util.toSafeName(name);
    let canHave = false;
    let testName = safeName;
    let testCount = 1;

    const filter = res => res.safeName === testName;

    while (!canHave) {

        const dupes = list.filter(filter);

        if (dupes.length) {
            testCount += 1;
            testName = `${safeName}_${testCount}`;
        } else {
            canHave = true;
            cb(testName);
        }
    }
};

Util.generateShortName = (firstName, lastName, username) => {
    firstName = firstName.toLowerCase();
    lastName = lastName.toLowerCase();

    let l = firstName[0] + lastName[0];

    for (let i = 1; i < 100; i++) {

        const lLetter = lastName[i];
        if (lLetter) {
            l = l + lLetter;
        }
        if (!config.initials.filter(user => {
                if (user.initial == l) {
                    return user;
                }
            }).length) {
            return l;
        }
    }
    return username;
};

Util.generateJanCode = (firstName, lastName, username) => {

    return new Promise((good, bad) => {
        const moment = require('moment');
        const date = moment().format('YYMMDD');

        var initials = '';

        var foundInitals = config.initials.filter(function (i) {
            return i.username == username;
        });

        if (foundInitals.length > 0) {
            initials = foundInitals[0].code;
        } else {
            initials = Util.generateShortName(firstName, lastName, username);
        }

        var initialsAndDate = initials + date;
        var janCode = initialsAndDate;
        var addonPostition = 0;

        var addons = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        var canHave = false;
        Request.run()
            .then((allRequests)=> {
                while (!canHave) {
                    if (allRequests.filter((f)=> {
                            return f.janCode == janCode;
                        }).length < 1) {
                        canHave = true;
                        return good(janCode);
                    } else {
                        janCode = initialsAndDate + addons[addonPostition];
                        addonPostition++;
                    }
                }
            })
            .catch((err)=> {
                return bad(err);
            })
    });
};

Util.toSafeName = unsafeName => unsafeName.replace('&', 'and').replace(/[^a-z0-9]/gi, '_').toLowerCase();

module.exports = Util;
