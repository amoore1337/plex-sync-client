const { getExistingMoviesMap, getExistingTvShowsMap } = require('./file.service');
const { dbConnection, dbClose, insertQuery, updateQuery, findOrCreate } = require('../db/db.helper');
const { find } = require('lodash');

const typeToTableMap = {
  'movie': 'movies',
  'show': 'tv_shows',
  'season': 'tv_show_seasons',
  'episode': 'tv_show_episodes',
};

const inProgressStatuses = [
  'pending',
  'downloading',
  'unpacking',
  'processing',
  'cleaning'
]

exports.startPendingContent = async function (token, type) {
  const db = await dbConnection();
  const contentRequesting = await db.get(`SELECT * FROM remote_${typeToTableMap[type]} WHERE token = "${token}"`);
  await db.run(insertQuery('pending_download_requests', {
    name: contentRequesting.name,
    type,
    token,
    last_event: 'pending',
    size: contentRequesting.size,
    created_at: Date.now(),
  }));
  await dbClose(db);

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
    if (type === 'movie') {
      console.log('marking movie as completed');
      await markMovieAsCompleted(token);
    } else if (type === 'season') {
      await markSeasonAsCompleted(token);
    }

    db = await dbConnection();
    console.log('deleting pending record');
    await db.run(`DELETE FROM pending_download_requests WHERE token = "${token}";`)
    console.log('finished');
  } catch (error) {
    console.error(error);
  } finally {
    await dbClose(db);
  }
}

exports.deletePendingQueue = async function() {
  let db;
  try {
    db = await dbConnection();
    await db.run('DELETE FROM pending_download_requests');
  } catch (error) {
    console.error(error);
  } finally {
    await dbClose(db)
  }
}

async function updatePendingDownloadRecord(token, status) {
  const db = await dbConnection();
  await db.run(updateQuery('pending_download_requests', { last_event: status }) + ` WHERE token = "${token}"`);
  await dbClose(db);
}

async function updateContent(token, type, status) {
  const db = await dbConnection();
  let contentStatus = 'unknown';
  if (inProgressStatuses.indexOf(status) > -1) {
    contentStatus = 'in-progress';
  }

  // If we're updating the status of a season,
  // we need to find the parent and mark its status too.
  if (type === 'season') {
    const showToken = await db.get(`
      SELECT shows.token FROM remote_tv_show_seasons seasons
      LEFT JOIN remote_tv_shows shows ON shows.ROWID = seasons.remote_tv_show_id
      WHERE seasons.token = "${token}"
    `);
    await db.run(updateQuery(`remote_tv_shows`, { status: contentStatus }) + ` WHERE token = "${showToken.token}"`);
  }

  await db.run(updateQuery(`remote_${typeToTableMap[type]}`, { status: contentStatus }) + ` WHERE token = "${token}"`);
  await dbClose(db);
}

async function markMovieAsCompleted(token) {
  let db;
  try {
    db = await dbConnection();
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
  } catch (error) {
    console.error(error);
  } finally {
    await dbClose(db);
  }
}

async function markSeasonAsCompleted(token) {
  let db;
  try {
    db = await dbConnection();
    const dirMap = await getExistingTvShowsMap();

    const remoteShow = await db.get(`
      SELECT shows.* FROM remote_tv_show_seasons seasons
      LEFT JOIN remote_tv_shows shows ON shows.ROWID = seasons.remote_tv_show_id
      WHERE seasons.token = "${token}"
    `);

    const fsShow = find(dirMap, { token: remoteShow.token });
    const fsSeason = find(fsShow.children, { token });

    // Find or create the show record:
    await findOrCreate(db, 'local_tv_shows', {
      name: fsShow.name,
      token: remoteShow.token,
      size: fsShow.size,
    });
    const localShow = await db.get(`SELECT *, ROWID FROM local_tv_shows WHERE token = "${remoteShow.token}"`);

    await db.run(insertQuery('local_tv_show_seasons', {
      name: fsSeason.name,
      token: token,
      size: fsSeason.size,
      local_tv_show_id: localShow.rowid,
      created_at: Date.now(),
    }));
    const localSeason = await db.get(`SELECT *, ROWID FROM local_tv_show_seasons WHERE token = "${token}"`);

    const remoteEpisodes = await db.all(`
      SELECT episodes.* FROM remote_tv_show_seasons seasons
      LEFT JOIN remote_tv_show_episodes episodes ON episodes.remote_tv_show_season_id = seasons.ROWID
      WHERE seasons.token = "${token}"
    `);

    let localEpisodeCount = 0;
    for (let i = 0; i < remoteEpisodes.length; i++) {
      const episode = remoteEpisodes[i];
      const fsEpisode = find(fsSeason.children, { name: episode.name })
      if (!fsEpisode) {
        continue;
      }
      await db.run(insertQuery('local_tv_show_episodes', {
        name: episode.name,
        token: episode.token,
        size: fsEpisode.size,
        local_tv_show_season_id: localSeason.rowid,
        created_at: Date.now(),
      }));
      localEpisodeCount++;

      await db.run(updateQuery('remote_tv_show_episodes', { status: 'completed' }) + ` WHERE token = "${episode.token}"`);
    }

    await db.run(updateQuery('remote_tv_show_seasons', {
      status: remoteEpisodes.length === localEpisodeCount ? 'completed' : 'incomplete'
    }) + ` WHERE token = "${token}"`);

    const totalLocalEpisodes = await db.get(`
      SELECT COUNT(episodes.token) AS episode_count FROM local_tv_shows shows
      LEFT JOIN local_tv_show_seasons seasons ON seasons.local_tv_show_id = shows.ROWID
      LEFT JOIN local_tv_show_episodes episodes ON episodes.local_tv_show_season_id = seasons.ROWID
      WHERE shows.token = "${remoteShow.token}"
    `);

    const totalRemoteEpisodes = await db.get(`
      SELECT COUNT(episodes.token) AS episode_count FROM remote_tv_shows shows
      LEFT JOIN remote_tv_show_seasons seasons ON seasons.remote_tv_show_id = shows.ROWID
      LEFT JOIN remote_tv_show_episodes episodes ON episodes.remote_tv_show_season_id = seasons.ROWID
      WHERE shows.token = "${remoteShow.token}"
    `);

    const newStatus = totalLocalEpisodes.episode_count === totalRemoteEpisodes.episode_count ? 'completed' : 'incomplete';
    await db.run(updateQuery('remote_tv_shows', { status: newStatus }) + ` WHERE token = "${remoteShow.token}"`);
  } catch (error) {
    console.error(error)
  } finally {
    await dbClose(db);
  }
}
