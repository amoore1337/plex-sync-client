const express = require('express');
const bodyParser = require('body-parser');
const config = require('nconf');
const logger = require('winston');
const expressWinston = require('express-winston');
const cron = require('node-cron');
const contentScan = require('./workers/content-scan');
// const remoteContentScan = require('./workers/remote-content-scan');
const { runMigrations } = require('./db/db.helper');
const { fetchAccessTokenForManager } = require('./services/auth.service');
const { deletePendingQueue } = require('./services/content-state-manager.service');

let app;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

module.exports = async (callback) => {

  app = express();

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json({ type: '*/*' }));

  app.use(expressWinston.logger({
    transports: [
      new logger.transports.Console()
    ],
    format: logger.format.combine(
      logger.format.colorize(),
      logger.format.json()
    ),
    meta: false,
    msg: "HTTP {{req.method}} {{req.url}}",
    expressFormat: true,
    colorize: false,
    ignoreRoute: function (req, res) { return false; }
  }));

  // Run any pending migrations when the app starts up:
  try {
    await runMigrations();
  } catch (error) {
    logger.error('Migrations failed: ', error);
  }

  // cron.schedule('*/1 * * * *', remoteContentScan);
  try {
    // Empty queue on start
    await deletePendingQueue();

    const validToken = await fetchAccessTokenForManager();
    // Only load content on startup if we have credentials for manager
    if (validToken) {
      await contentScan();
    }
  } catch (error) {
    console.error(error);
  }

  logger.info('[SERVER] Initializing routes');
  require('./routes/index')(app);

  // Basic Error handler
  app.use(function (err, _, res, next) {
    res.status(err.statusCode || 500);
    const errorJson = {
      message: err.message,
    }

    res.json(errorJson);
    next(err);
  });

  const NODE_PORT = config.get('NODE_PORT') || 1337;

  app.listen(NODE_PORT, () => {
    logger.info('[SERVER] Listening on port ' + NODE_PORT);
    if (callback) { return callback(); }
  });
};
