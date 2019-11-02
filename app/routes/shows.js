const { wrapAsync } = require('../services/router.service');
const { getExistingTvShowsMap } = require('../services/file.service');

module.exports = (router) => {
  router.get('/', wrapAsync(async (_, res) => {
    res.json(getExistingTvShowsMap());
  }));
};
