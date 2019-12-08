const { wrapAsync } = require('../services/router.service');
const { getAvailableMovies } = require('../services/movies.service');

module.exports = (router) => {
  router.get('/', wrapAsync(async (_, res) => {
    let movies = await getAvailableMovies();
    res.json(movies);
  }));
};
