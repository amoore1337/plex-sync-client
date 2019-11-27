const { getExistingMoviesMap } = require('../services/file.service');
const dbConnection = require('../db/init');

module.exports = async function() {
  const db = await dbConnection;
  const moviesFromFs = await getExistingMoviesMap();
  for (var i = 0; i < moviesFromFs.length; i++) {
    const fsMovie = moviesFromFs[i];
    const dbMovie = await db.get(selectByTokenQuery('local_movies', fsMovie.id));
    console.log('exising movie? ', dbMovie);
    if (!dbMovie) {
      await db.run(insertQuery('local_movies', {
        name: fsMovie.name,
        token: fsMovie.id,
        size: fsMovie.size,
        created_at: Date.now()
      }))
    }
  }
}

function insertQuery(tableName, values) {
  console.log('inserting: ', tableName, values);
  return `
    INSERT INTO ${tableName} ( ${Object.keys(values).toString()} )
    VALUES ( ${sanitizedQueryValues(Object.values(values))} );
  `;
}

function sanitizedQueryValues(values) {
  let sanitizedValues = '';
  values.forEach(value => {
    // TODO: Find sanitize library and add here.
    if (typeof value === 'string') {
      sanitizedValues += `"${value}" ` // Need to wrap strings in "" for query
    } else {
      sanitizedValues += `${value.toString()} `
    }
  });
  return sanitizedValues.trim().split(' ').join(',');
}

function selectByTokenQuery(tableName, token) {
  return `SELECT * FROM ${tableName} WHERE token = "${token}";`;
}
