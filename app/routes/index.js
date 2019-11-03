const changeCase = require('change-case');
const express = require('express');
const routes = require('require-dir')();
const path = require('path');
const history = require('connect-history-api-fallback');

module.exports = (app) => {
  app.get('/ping', (_, res) => { res.send('pong'); });

  Object.keys(routes).forEach((routeName) => {
    const router = express.Router();
    require('./' + routeName)(router);

    app.use('/api/' + changeCase.paramCase(routeName), router);
  });

  // Support history api (aka HTML5 History API used on frontend)
  app.use(history({ index: '/index.html' }));

  // Serve client
  app.use(express.static(path.join(__dirname, '../../client/dist')));
};
