const { database } = require('../db/db.helper');

exports.getAvailableMovies = async function () {
  const db = await database();
  // TODO: The limit 100 is sorta arbitrary, just felt weird to not limit it at all. Might need pagination eventually
  const movies = await db.all('SELECT * FROM remote_movies LIMIT 100');
  return movies;
}
