const Auth = {};
const passport = require("passport");
const crypto = require("crypto");
const renderError = require("../lib/renderError");
const config = require("../config.json");
const Util = require("../lib/util");

/**
 * Generate Gravatar URL from email address
 * @param {string} email - The email address
 * @returns {string|null} The Gravatar URL
 */
function getGravatarUrl(email) {
  if (!email) return null;
  const hash = crypto
    .createHash("md5")
    .update(email.toLowerCase().trim())
    .digest("hex");
  return "https://www.gravatar.com/avatar/" + hash;
}

/**
 * Render the sign in page
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
Auth.signIn = (req, res) => {
  res.render("signin", {
    devMode: config.devMode,
    vpnMode: Util.isVpnMode(),
    admins: config.admins,
  });
};

/**
 * Handle sign out
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Express next middleware
 */
Auth.signOut = (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
};

/**
 * Handle sign in POST
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Express next middleware
 */
Auth.signInPost = (req, res, next) => {
  // Get the appropriate authentication strategy
  const strategy = Util.getAuthStrategy();

  // Save returnTo before authentication (Passport regenerates session on login)
  const returnTo = req.session.returnTo;

  if (Util.isDevMode()) {
    if (Util.isVpnMode()) {
      console.log("🔧 DEV MODE (VPN): Using LDAP authentication");
    } else {
      console.log("🔧 DEV MODE: Using local authentication");
    }
  }

  passport.authenticate(strategy, (err, user, info) => {
    if (err) {
      console.error("Authentication error:", err);
      return next(err);
    }

    if (info) {
      console.info("Auth info:", info);
    }

    if (!user) {
      let message = "Authentication failed";
      if (info && info.message) {
        message += `: ${info.message}`;
      }
      console.log("Login failed:", message);
      return renderError(message, res);
    }

    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }

      // Add Gravatar URL to user object
      req.user.iconURL = getGravatarUrl(req.user.mail);
      req.user.devMode = config.devMode;
      req.user.vpnMode = Util.isVpnMode();

      const formattedUser = {
        username: user.username,
        name: user.name,
        isAdmin: Util.isAdmin(user.username),
      };

      console.log("User logged in:", formattedUser);

      // Redirect to the page they wanted before signing in (use saved value from before session regeneration)
      return res.redirect(returnTo || "/");
    });
  })(req, res, next);
};

/**
 * Return current user info (API endpoint)
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
Auth.whoami = (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      username: req.user.username,
      name: req.user.name,
      mail: req.user.mail,
      isAdmin: Util.isAdmin(req.user.username),
      devMode: config.devMode,
      vpnMode: Util.isVpnMode(),
    });
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
};

module.exports = Auth;
