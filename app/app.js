const express = require('express');
const bodyParser = require('body-parser');
const config = require('nconf');
const logger = require('winston');
const expressWinston = require('express-winston');
const { initIo } = require('./socket');
const cron = require('node-cron');
const contentScan = require('./workers/content-scan');
const { runMigrations } = require('./db/db.helper');
const { deletePendingQueue, updateConnectedClients } = require('./services/content-state-manager.service');

let app;
let socket;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

module.exports = async (callback) => {

  app = express();

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json({ type: '*/*' }));

  app.use(expressWinston.logger({ winstonInstance: logger, meta: false, msg: "HTTP {{req.method}} {{req.url}}" }));

  // Run any pending migrations when the app starts up:
  try {
    await runMigrations();
  } catch (error) {
    logger.error('Migrations failed: ', error);
  }

  try {
    // Empty queue on start
    await deletePendingQueue();

  } catch (error) {
    logger.error(error);
  }

  // Run every 3 hours:
  cron.schedule('0 0 */3 * * *', contentScan);

  // Run on startup to ensure we're up to date:
  await contentScan();

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

  const server = app.listen(NODE_PORT, () => {
    logger.info('[SERVER] Listening on port ' + NODE_PORT);
    if (callback) { return callback(); }
  });

  socket = initIo(server);

  socket.on('connection', async () => {
    await updateConnectedClients();
  });
};
