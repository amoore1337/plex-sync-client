const { wrapAsync } = require('../services/router.service');
const { getShows } = require('../services/manager-comm.service');

module.exports = (router) => {
  router.get('/', wrapAsync(async (_, res) => {
    const shows = await getShows();
    res.json(shows);
  }));
};
