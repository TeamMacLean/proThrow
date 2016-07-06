'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _passport = require('passport');

var _passport2 = _interopRequireDefault(_passport);

var _passportLdapauth = require('passport-ldapauth');

var _passportLdapauth2 = _interopRequireDefault(_passportLdapauth);

var _config = require('../../config.js');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Util = {};

Util.setupPassport = function () {

    _passport2.default.serializeUser(function (user, done) {
        done(null, user);
    });

    _passport2.default.deserializeUser(function (obj, done) {
        done(null, obj);
    });

    _passport2.default.use(new _passportLdapauth2.default({
        server: {
            url: _config2.default.ldap.url,
            bindDn: _config2.default.ldap.bindDn,
            bindCredentials: _config2.default.ldap.bindCredentials,
            searchBase: _config2.default.ldap.searchBase,
            searchFilter: _config2.default.ldap.searchFilter
        }
    }, function (userLdap, done) {

        //if(userLdap.company === 'TSL'){ //TODO check company is TSL
        //}

        var user = {
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

Util.isAdmin = function (username) {
    return _config2.default.admins.indexOf(username) > -1;
};

Util.generateSafeName = function (name, list, cb) {
    //$path, $filename
    var safeName = Util.toSafeName(name);
    var canHave = false;
    var testName = safeName;
    var testCount = 1;

    var filter = function filter(res) {
        return res.safeName === testName;
    };

    while (!canHave) {

        var dupes = list.filter(filter);

        if (dupes.length) {
            testCount += 1;
            testName = safeName + '_' + testCount;
        } else {
            canHave = true;
            cb(testName);
        }
    }
};

Util.generateShortName = function (firstName, lastName, username) {
    firstName = firstName.toLowerCase();
    lastName = lastName.toLowerCase();

    // var f = [firstName[0]];
    // var l = [firstName[0], lastName[0]];
    var l = firstName[0] + lastName[0];

    for (var i = 1; i < 100; i++) {

        var lLetter = lastName[i];
        // const fLetter = firstName[i];

        //extend last name
        if (lLetter) {
            l = l + lLetter;
        }

        if (!_config2.default.initials.filter(function (user) {
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

Util.generateYanCode = function (firstName, lastName, username) {
    var moment = require('moment');
    var date = moment().format('YYMMDD');
    var shortName = Util.generateShortName(firstName, lastName, username);
    return shortName + date;
};

Util.toSafeName = function (unsafeName) {
    return unsafeName.replace('&', 'and').replace(/[^a-z0-9]/gi, '_').toLowerCase();
};

exports.default = Util;