const { wrapAsync } = require('../services/router.service');
const { getAvailableShows } = require('../services/manager-comm.service');
const { addStatusToShows } = require('../services/file.service');

module.exports = (router) => {
  router.get('/', wrapAsync(async (_, res) => {
    const shows = await getAvailableShows();
    await addStatusToShows(shows);
    res.json(shows);
  }));
};
