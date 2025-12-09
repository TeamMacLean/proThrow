/**
 * Render an error page
 * @param {Error|string} err - The error to display
 * @param {object} res - Express response object
 * @param {number} [statusCode=500] - HTTP status code
 */
module.exports = function error(err, res, statusCode = 500) {
  const errorMessage = err instanceof Error ? err.message : err;
  console.error("Error:", errorMessage);

  if (res && !res.headersSent) {
    return res.status(statusCode).render("error", { error: errorMessage });
  }
};
