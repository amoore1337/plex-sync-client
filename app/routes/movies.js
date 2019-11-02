const { wrapAsync } = require('../services/router.service');
const { getExistingMoviesMap } = require('../services/file.service');

module.exports = (router) => {
  router.get('/', wrapAsync(async (_, res) => {
    res.json(getExistingMoviesMap());
  }));
};
