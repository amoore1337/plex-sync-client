const { wrapAsync } = require('../services/router.service');
const { getAvailableMovies } = require('../services/manager-comm.service');
const { addStatusToMovies } = require('../services/file.service');

module.exports = (router) => {
  router.get('/', wrapAsync(async (_, res) => {
    let movies = await getAvailableMovies();
    await addStatusToMovies(movies);
    res.json(movies);
  }));
};
