const ldap = require("ldapjs");
const config = require("../config.json");

/** Give up on a directory that accepts the connection and then stalls. */
const LDAP_TIMEOUT_MS = 5000;

/**
 * Escape a value for use inside an LDAP search filter (RFC 4515).
 *
 * The only current caller passes a username that originated from the directory
 * itself, so this is defence rather than a live fix - but an unescaped `*` here
 * turns an exact lookup into a wildcard match, which would attach the wrong
 * person's name to a request.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeFilterValue(value) {
  return String(value).replace(/[\\*()\0]/g, (char) => {
    return {
      "\\": "\\5c",
      "*": "\\2a",
      "(": "\\28",
      ")": "\\29",
      "\0": "\\00",
    }[char];
  });
}

module.exports = {
  escapeFilterValue,

  /**
   * Get user name from LDAP by username
   * @param {string} username - The username to lookup
   * @returns {Promise<Array>} Promise resolving to array of matching entries
   */
  getNameFromUsername(username) {
    return new Promise((resolve, reject) => {
      // In dev mode without VPN, return mock data
      if (config.devMode && process.env.VPN_MODE !== "true") {
        console.log(`🔧 DEV MODE: Mock LDAP lookup for ${username}`);
        return resolve([
          {
            sAMAccountName: username,
            name: `Dev User (${username})`,
            mail: `${username}@dev.local`,
          },
        ]);
      }

      const client = ldap.createClient({
        url: config.ldap.url,
        connectTimeout: LDAP_TIMEOUT_MS,
        timeout: LDAP_TIMEOUT_MS,
      });

      // Settle and tear down exactly once, however the attempt ends. Several
      // paths below could previously leave the client connected forever, and
      // this helper is what makes the socket-level 'error' handler safe.
      let settled = false;
      const finish = (err, entries) => {
        if (settled) return;
        settled = true;
        try {
          client.unbind();
        } catch (_e) {
          client.destroy();
        }
        if (err) return reject(err);
        return resolve(entries);
      };

      // ldapjs emits 'error' on the client as an event, not a rejection. With
      // no listener attached, a directory that refuses or drops the connection
      // raised an unhandled 'error' and took the whole process down - and this
      // runs once per row of the admin dashboard, so a brief directory outage
      // while an admin loaded that page killed the app.
      client.on("error", (err) => {
        console.error("LDAP client error:", err.message);
        finish(err);
      });

      // Guards the case where the connection is accepted and then goes quiet,
      // which no ldapjs callback covers.
      const timer = setTimeout(() => {
        finish(new Error("LDAP lookup timed out"));
      }, LDAP_TIMEOUT_MS);
      const done = (err, entries) => {
        clearTimeout(timer);
        finish(err, entries);
      };

      client.bind(config.ldap.bindDn, config.ldap.bindCredentials, (err) => {
        if (err) {
          console.error("LDAP bind error:", err.message);
          return done(err);
        }

        const opts = {
          scope: "sub",
          filter: `(sAMAccountName=${escapeFilterValue(username)})`,
        };

        client.search(config.ldap.searchBase, opts, (searchErr, res) => {
          if (searchErr) return done(searchErr);

          const entries = [];
          res.on("searchEntry", (entry) => entries.push(entry.object));
          res.on("searchReference", () => {
            // Handle referrals if needed
          });
          res.on("error", (resErr) => done(resErr));
          res.on("end", () => done(null, entries));
        });
      });
    });
  },
};
