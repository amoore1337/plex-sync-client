const { getExistingMoviesMap, getExistingTvShowsMap } = require('./file.service');
const { database, insertQuery, updateQuery, findOrCreate } = require('../db/db.helper');
const { find } = require('lodash');

// TODO: Now that this only the plural version of the type,
// find lib to pluralize instead of this map.
const typeToTableMap = {
  'movie': 'movies',
  'show': 'shows',
  'season': 'seasons',
  'episode': 'episodes',
};

const inProgressStatuses = [
  'pending',
  'downloading',
  'unpacking',
  'processing',
  'cleaning'
]

exports.startPendingContent = async function (token, type) {
  const db = await database();
  const contentRequesting = await db.get(`SELECT * FROM remote_${typeToTableMap[type]} WHERE token = "${token}"`);
  await db.run(insertQuery('pending_content_requests', {
    name: contentRequesting.name,
    type,
    token,
    last_event: 'pending',
    size: contentRequesting.size,
    created_at: Date.now(),
  }));

  await updateContent(token, type, 'pending');
}

exports.updateContentStatus = async function(token, type, status) {
  try {
    await updatePendingDownloadRecord(token, status);
    await updateContent(token, type, status);
  } catch (error) {
    console.error(error);
  }
}

exports.completeContent = async function(token, type) {
  console.log('completing!');
  let db;
  try {
    db = await database();
    console.log(await db.get('PRAGMA journal_mode'));
    if (type === 'movie') {
      console.log('marking movie as completed');
      await markMovieAsCompleted(db, token);
    } else if (type === 'season') {
      await markSeasonAsCompleted(db, token);
    }

    console.log('deleting pending record');
    await db.run(`DELETE FROM pending_content_requests WHERE token = "${token}"`)
    console.log('finished');
  } catch (error) {
    console.error(error);
  }
}

exports.deletePendingQueue = async function() {
  let db;
  try {
    db = await database();
    await db.run('DELETE FROM pending_content_requests');
  } catch (error) {
    console.error(error);
  }
}

async function updatePendingDownloadRecord(token, status) {
  const db = await database();
  await db.run(updateQuery('pending_content_requests', { last_event: status }) + ` WHERE token = "${token}"`);
}

async function updateContent(token, type, status) {
  const db = await database();
  let contentStatus = 'unknown';
  if (inProgressStatuses.indexOf(status) > -1) {
    contentStatus = 'in-progress';
  }

  // If we're updating the status of a season,
  // we need to find the parent and mark its status too.
  if (type === 'season') {
    const showToken = await db.get(`
      SELECT shows.token FROM remote_seasons seasons
      LEFT JOIN remote_shows shows ON shows.token = seasons.show_token
      WHERE seasons.token = "${token}"
    `);
    await db.run(updateQuery(`remote_shows`, { status: contentStatus }) + ` WHERE token = "${showToken.token}"`);
  }

  await db.run(updateQuery(`remote_${typeToTableMap[type]}`, { status: contentStatus }) + ` WHERE token = "${token}"`);
}

async function markMovieAsCompleted(db, token) {
  const dirMap = await getExistingMoviesMap();
  const fsMovie = find(dirMap, { token });

  console.log('adding local movie')
  await db.run(insertQuery('local_movies', {
    name: fsMovie.name,
    token: token,
    size: fsMovie.size,
    created_at: Date.now(),
  }));

  console.log('updating remote movie');
  await db.run(updateQuery('remote_movies', { status: 'completed' }) + ` WHERE token = "${token}"`);
}

async function markSeasonAsCompleted(db, token) {
  const dirMap = await getExistingTvShowsMap();

  const remoteShow = await db.get(`
    SELECT shows.* FROM remote_seasons seasons
    LEFT JOIN remote_shows shows ON shows.token = seasons.show_token
    WHERE seasons.token = "${token}"
  `);

  const fsShow = find(dirMap, { token: remoteShow.token });
  const fsSeason = find(fsShow.children, { token });

  // Find or create the show record:
  await findOrCreate('local_shows', {
    name: fsShow.name,
    token: remoteShow.token,
    size: fsShow.size,
  });

  await db.run(insertQuery('local_seasons', {
    name: fsSeason.name,
    token: token,
    size: fsSeason.size,
    show_token: remoteShow.token,
    created_at: Date.now(),
  }));

  const remoteEpisodes = await db.all(`
    SELECT episodes.* FROM remote_seasons seasons
    LEFT JOIN remote_episodes episodes ON episodes.season_token = seasons.token
    WHERE seasons.token = "${token}"
  `);

  let localEpisodeCount = 0;
  for (let i = 0; i < remoteEpisodes.length; i++) {
    const remoteEpisode = remoteEpisodes[i];
    const fsEpisode = find(fsSeason.children, { name: remoteEpisode.name })
    if (!fsEpisode) {
      continue;
    }
    await db.run(insertQuery('local_episodes', {
      name: remoteEpisode.name,
      token: remoteEpisode.token,
      size: fsEpisode.size,
      season_token: token,
      created_at: Date.now(),
    }));
    localEpisodeCount++;

    await db.run(updateQuery('remote_episodes', { status: 'completed' }) + ` WHERE token = "${remoteEpisode.token}"`);
  }

  await db.run(updateQuery('remote_seasons', {
    status: remoteEpisodes.length === localEpisodeCount ? 'completed' : 'incomplete'
  }) + ` WHERE token = "${token}"`);

  const totalLocalEpisodes = await db.get(`
    SELECT COUNT(episodes.token) AS episode_count FROM local_shows shows
    LEFT JOIN local_seasons seasons ON seasons.show_token = shows.token
    LEFT JOIN local_episodes episodes ON episodes.season_token = seasons.token
    WHERE shows.token = "${remoteShow.token}"
  `);

  const totalRemoteEpisodes = await db.get(`
    SELECT COUNT(episodes.token) AS episode_count FROM remote_shows shows
    LEFT JOIN remote_seasons seasons ON seasons.show_token = shows.token
    LEFT JOIN remote_episodes episodes ON episodes.season_token = seasons.token
    WHERE shows.token = "${remoteShow.token}"
  `);

  const newStatus = totalLocalEpisodes.episode_count === totalRemoteEpisodes.episode_count ? 'completed' : 'incomplete';
  await db.run(updateQuery('remote_shows', { status: newStatus }) + ` WHERE token = "${remoteShow.token}"`);
}
