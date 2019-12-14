const { wrapAsync } = require('../services/router.service');
const { getAvailableTvShows } = require('../services/tv-shows.service');

module.exports = (router) => {
  router.get('/', wrapAsync(async (_, res) => {
    const shows = await getAvailableTvShows();
    res.json(shows);
  }));
};
