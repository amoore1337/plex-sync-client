const { getAvailableMovies } = require('../services/manager-comm.service');
const { dbConnection, insertQuery, updateQuery } = require('../db/db.helper');
const { findIndex } = require('lodash');

module.exports = async function () {
  await syncRemoteMovies();
  // TODO: Do the same for tv shows
}

async function syncRemoteMovies() {
  const moviesFromRemote = await getAvailableMovies();

  // Find any new content or out of date content:
  moviesFromRemote.forEach(async remoteMovie => await updateOrCreateMovie(remoteMovie));

  // Find any content that no longer exists on remote and delete it from db:
  await cleanupRemovedMovies(moviesFromRemote);
}

async function updateOrCreateMovie(remoteMovie) {
  const db = await dbConnection();
  const localMovie = await db.get(selectByTokenQuery('local_movies', remoteMovie.id));
  const existingRemoteMovie = await db.get(selectByTokenQuery('remote_movies', remoteMovie.id));
  const pendingMovie = await db.get(`
    SELECT * FROM pending_download_requests WHERE token = "${remoteMovie.id}" AND type = "movie"
  `);

  if (localMovie) {
    remoteMovie.status = 'completed';
  } else if (pendingMovie) {
    remoteMovie.status = 'in-progress';
  } else {
    remoteMovie.status = 'not-downloaded';
  }

  if (existingRemoteMovie && existingRemoteMovie.status != remoteMovie.status) {
    await db.run(
      updateQuery(
        'remote_movies',
        { status: remoteMovie.status, size: remoteMovie.size }
      ) + ` WHERE token = ${existingRemoteMovie.token}`
    );
  } else if (!existingRemoteMovie) {
    await db.run(insertQuery('remote_movies', {
      name: remoteMovie.name,
      token: remoteMovie.id,
      size: remoteMovie.size,
      status: remoteMovie.status,
      created_at: Date.now()
    }));
  }
}

async function cleanupRemovedMovies(remoteMovies) {
  const db = await dbConnection();
  const existingMovies = await db.all(`SELECT * from remote_movies`);

  existingMovies.forEach(existingMovie => {
    if (findIndex(remoteMovies, (r) => r.id === existingMovie.id) < 0) {
      db.run(deleteByTokenQuery('remote_movies', existingMovie.id));
    }
  });
}

function selectByTokenQuery(tableName, token) {
  return `SELECT * FROM ${tableName} WHERE token = "${token}";`;
}

function deleteByTokenQuery(tableName, token) {
  return `DELETE FROM ${tableName} WHERE token = "${token}";`;
}
