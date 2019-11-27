const { getExistingMoviesMap } = require('../services/file.service');
const { dbConnection, insertQuery } = require('../db/db.helper');

module.exports = async function() {
  const db = await dbConnection();
  const moviesFromFs = await getExistingMoviesMap();
  for (var i = 0; i < moviesFromFs.length; i++) {
    const fsMovie = moviesFromFs[i];
    const dbMovie = await db.get(selectByTokenQuery('local_movies', fsMovie.id));
    if (!dbMovie) {
      await db.run(insertQuery('local_movies', {
        name: fsMovie.name,
        token: fsMovie.id,
        size: fsMovie.size,
        created_at: Date.now()
      }));
    }
  }
}

function selectByTokenQuery(tableName, token) {
  return `SELECT * FROM ${tableName} WHERE token = "${token}";`;
}
