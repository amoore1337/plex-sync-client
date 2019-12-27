const { getExistingMoviesMap, getExistingTvShowsMap } = require('../services/file.service');
const { fetchAvailableMovies, fetchAvailableShows } = require('../services/manager-comm.service');
const { database, insertQuery, updateQuery, sanitizedQueryValues, createOrUpdate } = require('../db/db.helper');
const { find, map, difference } = require('lodash');

module.exports = async function() {
  await syncMovies();
}

async function syncMovies() {
  const db = await database();
  const remoteMovies = await fetchAvailableMovies();
  const fsMovies = await getExistingMoviesMap();

  await cleanupRemovedMovies(remoteMovies);

  for (let i = 0; i < remoteMovies.length; i++) {
    const remoteMovie = remoteMovies[i];
    const existingMovie = find(fsMovies, { token: remoteMovie.token });
    const pendingRequest = await db.get(`
      SELECT * FROM pending_content_requests WHERE type = "movie" AND token = "${remoteMovie.token}"`
    );

    if (existingMovie) {
      // Verify remote content record:
      await createOrUpdate(
        'remote_movies',
        { status: 'completed', size: remoteMovie.size, name: remoteMovie.name },
        { token: remoteMovie.token },
      );
      // Verify local content record:
      await createOrUpdate(
        'local_movies',
        { size: existingMovie.size },
        { token: remoteMovie.token },
      );
      // Remove any crufty pending_content records:
      await cleanupPendingContentRequests(remoteMovie.token);
    } else if (pendingRequest) {
      await createOrUpdate(
        'remote_movies',
        { status: 'in-progress', size: remoteMovie.size, name: remoteMovie.name },
        { token: remoteMovie.token },
      );
    } else {
      await createOrUpdate(
        'remote_movies',
        { status: 'not-downloaded', size: remoteMovie.size, name: remoteMovie.name },
        { token: remoteMovie.token },
      );
    }
  }
}

async function cleanupRemovedMovies(remoteMovies) {
  const db = await database();
  const existingTokens = map(await db.all('SELECT token from remote_movies'), 'token');
  const remoteTokens = map(remoteMovies, 'token');

  const removedTokens = difference(existingTokens, remoteTokens);
  if (removedTokens.length) {
    await db.run(`DELETE FROM remote_movies WHERE token IN (${sanitizedQueryValues(removedTokens)})`)
  }
}

async function cleanupPendingContentRequests(token) {
  const db = await database();
  await db.run(`DELETE FROM pending_content_requests WHERE token = "${token}"`);
}

// TV SHOWS:
// In order to get statuses set correctly, start with episodes and work up:
// Loop through shows & seasons to get to all episodes

// Get list of all local episode tokens
// For each remote episode:

// IF episode exists locally:
// Verify remote_episodes record exists in 'completed' status
// Verify local_episodes record exists with proper token from remote
// Remove any pending_ records if exist

// ELSE IF pending_ record exists:
// Verify remote_episodes record exists in 'in-progress' status

// ELSE
// The movie doesn't exist locally so:
// Verify remote_episodes record exists in 'not-downloaded'

// For each season from remote:

// Determine status by checking statuses of all related episodes for season in db

// IF season status is 'completed':
// Verify remote_seasons record exists in 'completed' status
// Verify local_episodes record exists with proper token from remote
// Remove any pending_ records if exist

// ELSE IF pending_ record exists:
// Verify remote_seasons record exists in 'in-progress' status

// ELSE
// The movie doesn't exist locally so:
// Verify remote_seasons record exists in 'not-downloaded'

// Same thing for shows
