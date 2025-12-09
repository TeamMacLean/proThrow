const ldap = require("ldapjs");
const config = require("../config.json");

module.exports = {
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
      });

      client.bind(config.ldap.bindDn, config.ldap.bindCredentials, (err) => {
        if (err) {
          console.error("LDAP bind error:", err);
          client.unbind();
          return reject(err);
        }

        const opts = {
          scope: "sub",
          filter: `(sAMAccountName=${username})`,
        };

        client.search(config.ldap.searchBase, opts, (err, res) => {
          if (err) {
            client.unbind();
            return reject(err);
          }

          const entries = [];

          res.on("searchEntry", (entry) => {
            entries.push(entry.object);
          });

          res.on("searchReference", () => {
            // Handle referrals if needed
          });

          res.on("error", (err) => {
            client.unbind();
            return reject(err);
          });

          res.on("end", () => {
            client.unbind();
            return resolve(entries);
          });
        });
      });
    });
  },
};
