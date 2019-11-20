const { wrapAsync } = require('../services/router.service');
const { getMovies } = require('../services/manager-comm.service');

module.exports = (router) => {
  router.get('/', wrapAsync(async (_, res) => {
    const movies = await getMovies();
    res.json(movies);
  }));
};
