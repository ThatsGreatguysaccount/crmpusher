const env = require('../config/environment');

function getConnectionInfo(req, res) {
  res.json({
    host: env.PUBLIC_HOST || env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });
}

module.exports = { getConnectionInfo };
