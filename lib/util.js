const Util = {};
const passport = require("passport");
const LdapStrategy = require("passport-ldapauth");
const LocalStrategy = require("passport-local").Strategy;
const config = require("../config.json");
const Request = require("../models/request");

/**
 * Determine if we should use LDAP authentication
 * - In production (devMode: false): always use LDAP
 * - In dev mode with VPN_MODE env var: use LDAP
 * - In dev mode without VPN: use local auth
 */
const shouldUseLdap = () => {
  if (!config.devMode) {
    return true; // Production always uses LDAP
  }
  // In dev mode, check for VPN_MODE environment variable
  return process.env.VPN_MODE === "true";
};

/**
 * Setup passport authentication strategies
 */
Util.setupPassport = () => {
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((obj, done) => {
    done(null, obj);
  });

  const useLdap = shouldUseLdap();

  if (useLdap) {
    // LDAP authentication for production or dev:vpn mode
    console.log(
      config.devMode
        ? "🔧 DEV MODE (VPN): Using LDAP authentication strategy"
        : "🔒 PRODUCTION: Using LDAP authentication strategy"
    );

    passport.use(
      "ldapauth",
      new LdapStrategy(
        {
          server: {
            url: config.ldap.url,
            bindDn: config.ldap.bindDn,
            bindCredentials: config.ldap.bindCredentials,
            searchBase: config.ldap.searchBase,
            searchFilter: config.ldap.searchFilter,
          },
        },
        (userLdap, done) => {
          const user = {
            id: userLdap.sAMAccountName,
            username: userLdap.sAMAccountName,
            firstName: userLdap.givenName,
            lastName: userLdap.sn,
            name: userLdap.name,
            mail: userLdap.mail,
            memberOf: userLdap.memberOf,
          };

          done(null, user);
        }
      )
    );
  } else {
    // Local authentication for dev mode without VPN
    console.log("🔧 DEV MODE: Using local authentication strategy");
    console.log(`   Allowed users: ${config.admins.join(", ")}`);

    passport.use(
      "local",
      new LocalStrategy(
        {
          usernameField: "username",
          passwordField: "password",
        },
        (username, password, done) => {
          // Check if user is an admin (only admins can login in dev mode)
          if (!config.admins || !config.admins.includes(username)) {
            return done(null, false, {
              message: "User not authorized in dev mode",
            });
          }

          // Check if password field has any text (any non-empty password works in dev mode)
          if (!password || password.trim() === "") {
            return done(null, false, { message: "Password cannot be empty" });
          }

          // Create a mock user object for dev mode
          const user = {
            id: username,
            username: username,
            firstName: "Dev",
            lastName: "User",
            name: `Dev User (${username})`,
            mail: `${username}@dev.local`,
            memberOf: ["dev-admins"],
          };

          console.log(`✅ DEV MODE: User ${username} logged in successfully`);
          return done(null, user);
        }
      )
    );
  }
};

/**
 * Get the authentication strategy name to use
 */
Util.getAuthStrategy = () => {
  return shouldUseLdap() ? "ldapauth" : "local";
};

/**
 * Check if we're in dev mode
 */
Util.isDevMode = () => config.devMode;

/**
 * Check if we're in VPN mode (dev with LDAP)
 */
Util.isVpnMode = () => config.devMode && process.env.VPN_MODE === "true";

/**
 * Determine if current user is an admin
 * @param {string} username
 * @returns {boolean}
 */
Util.isAdmin = (username) => config.admins.indexOf(username) > -1;

/**
 * Generate safe name
 * @param {string} name
 * @param {Array} list
 * @param {Function} cb
 */
Util.generateSafeName = (name, list, cb) => {
  const safeName = Util.toSafeName(name);
  let canHave = false;
  let testName = safeName;
  let testCount = 1;

  const filter = (res) => res.safeName === testName;

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

/**
 * Generate short name initials
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} username
 * @returns {string}
 */
Util.generateShortName = (firstName, lastName, username) => {
  firstName = firstName.toLowerCase();
  lastName = lastName.toLowerCase();

  let l = firstName[0] + lastName[0];

  for (let i = 1; i < 100; i++) {
    const lLetter = lastName[i];
    if (lLetter) {
      l = l + lLetter;
    }
    if (
      !config.initials.filter((user) => {
        if (user.initial === l) {
          return user;
        }
      }).length
    ) {
      return l;
    }
  }
  return username;
};

/**
 * Generate JAN code for a request
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} username
 * @returns {Promise<string>}
 */
Util.generateJanCode = (firstName, lastName, username) => {
  return new Promise((resolve, reject) => {
    const moment = require("moment");
    const date = moment().format("YYMMDD");

    let initials = "";

    const foundInitials = config.initials.filter((i) => {
      return i.username === username;
    });

    if (foundInitials.length > 0) {
      initials = foundInitials[0].code;
    } else {
      initials = Util.generateShortName(firstName, lastName, username);
    }

    const initialsAndDate = initials + date;
    let janCode = initialsAndDate;
    let addonPosition = 0;

    const addons = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    let canHave = false;
    Request.run()
      .then((allRequests) => {
        while (!canHave) {
          if (
            allRequests.filter((f) => {
              return f.janCode === janCode;
            }).length < 1
          ) {
            canHave = true;
            return resolve(janCode);
          } else {
            janCode = initialsAndDate + addons[addonPosition];
            addonPosition++;
          }
        }
      })
      .catch((err) => {
        return reject(err);
      });
  });
};

/**
 * Get URI safe version of string
 * @param {string} unsafeName
 * @returns {string}
 */
Util.toSafeName = (unsafeName) =>
  unsafeName
    .replace("&", "and")
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();

module.exports = Util;
