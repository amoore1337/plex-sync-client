const server = require('./app/app.js');
const config = require('nconf');
const winston = require('winston');

// Load Environment variables from .env file
require('dotenv').config();

// Set up configs
config.use('memory');
config.argv();
config.env();

const consoleFormat = winston.format.printf(({ timestamp, level, message, meta }) => {
  return `[${level} - ${timestamp}] > ${message}`;
});

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console()
  ],
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.splat(),
    consoleFormat,
  ),
  ignoreRoute: function (req, res) { return false; }
});
winston.add(logger);

// Load config file for the environment
// require('./config/environments/' + config.get('NODE_ENV'));

logger.info('[APP] Starting server initialization');

process.on('uncaughtException', function (exception) {
  logger.error(exception);
});

process.on('unhandledRejection', (reason, p) => {
  logger.error(reason);
});

server();
