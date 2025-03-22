const { URL } = require("url");

function sanitizeFilename(url) {
  const urlObj = new URL(url);
  return urlObj.hostname.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

module.exports = {
  sanitizeFilename,
};
