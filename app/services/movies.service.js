const { dbConnection } = require('../db/db.helper');

exports.getAvailableMovies = async function () {
  const db = await dbConnection();
  // TODO: The limit 100 is sorta arbitrary, just felt weird to not limit it at all. Might need pagination eventually
  return db.all('SELECT * FROM remote_movies LIMIT 100');
}
