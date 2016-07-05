const Util = {};

const passport = require('passport');
const LdapStrategy = require('passport-ldapauth');
const config = require('../config.json');

Util.setupPassport = () => {

    passport.serializeUser((user, done) => {
        //console.log('serializeUser was called');
        done(null, user);
    });

    passport.deserializeUser((obj, done) => {
        //console.log('deserializeUser was called');
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

    // var f = [firstName[0]];
    // var l = [firstName[0], lastName[0]];
    var l = firstName[0] + lastName[0];

    for (var i = 1; i < 100; i++) {

        const lLetter = lastName[i];
        // const fLetter = firstName[i];

        //extend last name
        if (lLetter) {
            l = l + lLetter;
        }

        if (!config.initials.filter(function (user) {
                // console.log(user.initial, l, user.initial == l);
                if (user.initial == l) {
                    return user;
                }
            }).length) {
            // return l.join('');
            return l;
        }
    }
    return username;
};

Util.generateYanCode = (firstName, lastName, username) => {
    const moment = require('moment');
    const date = moment().format('YYMMDD');
    const shortName = Util.generateShortName(firstName, lastName, username);
    return shortName + date;
};

Util.toSafeName = unsafeName => unsafeName.replace('&', 'and').replace(/[^a-z0-9]/gi, '_').toLowerCase();

module.exports = Util;