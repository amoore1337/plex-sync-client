// UGH, this is extremely verbose and pretty brute force...
// TODO: DRY this up at least...

const { fetchAvailableMovies, getAvailableShows } = require('../services/manager-comm.service');
const { dbConnection, insertQuery, updateQuery, sanitizedQueryValues } = require('../db/db.helper');
const { findIndex } = require('lodash');

module.exports = async function () {
  await syncRemoteMovies();
  await syncRemoteTvShows();
}

async function syncRemoteMovies() {
  const moviesFromRemote = await fetchAvailableMovies();

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

async function syncRemoteTvShows() {
  const showsFromRemote = await getAvailableShows();

  // Find any new content or out of date content:
  showsFromRemote.forEach(async remoteShow => await updateOrCreateShow(remoteShow));
  // TODO: Delete content that is no longer available
}

async function updateOrCreateShow(remoteShow) {
  try {
    const db = await dbConnection();
    const existingRemoteShow = await db.get(selectByTokenQuery('remote_tv_shows', remoteShow.id));

    let episodeCount = {
      local: await getEpisodeCountForShow(remoteShow.id, 'local'),
      remote: await getEpisodeCountForShow(remoteShow.id, 'remote')
    };

    // Determine status of show
    remoteShow.status = 'not-downloaded';
    if (existingRemoteShow && await isShowPendingDownload(existingRemoteShow.rowid)) {
      remoteShow.status = 'in-progress';
    } else if (episodeCount.local === episodeCount.remote) {
      remoteShow.status = 'completed';
    } else if (episodeCount.local > 0 && episodeCount.remote > episodeCount.local) {
      remoteShow.status = 'incomplete';
    }

    if (existingRemoteShow && existingRemoteShow.status != remoteShow.status) {
      await db.run(
        updateQuery(
          'remote_tv_shows',
          { status: remoteShow.status, size: remoteShow.size }
        ) + ` WHERE token = ${existingRemoteShow.token}`
      );
    } else if (!existingRemoteShow) {
      // Insert shows
      await db.run(insertQuery('remote_tv_shows', {
        name: remoteShow.name,
        token: remoteShow.id,
        size: remoteShow.size,
        status: remoteShow.status,
        created_at: Date.now()
      }));
    }
    await syncRemoteSeasonsForShow(remoteShow);
  } catch (error) {
    console.error(error)
  }
}

async function syncRemoteSeasonsForShow(remoteShow) {
  const db = await dbConnection();
  const seasonsFromRemote = remoteShow.children;

  // Select the ROWID from the show to build the association for the season
  const { rowid } = await db.get(selectByTokenQuery('remote_tv_shows', remoteShow.id));
  if (!rowid) {
    throw Error('Show does not exist in DB...')
  }

  // Find any new content or out of date content:
  seasonsFromRemote.forEach(async remoteSeason => updateOrCreateSeason(remoteSeason, rowid));
  // TODO: Delete content that is no longer available
}

async function updateOrCreateSeason(remoteSeason, showId) {
  try {
    const db = await dbConnection();
    const existingRemoteSeason = await db.get(selectByTokenQuery('remote_tv_show_seasons', remoteSeason.id));

    let episodeCount = {
      local: await getEpisodeCountForSeason(remoteSeason.id, 'local'),
      remote: await getEpisodeCountForSeason(remoteSeason.id, 'remote')
    };

    // Determine status of show
    remoteSeason.status = 'not-downloaded';
    if (existingRemoteSeason && await isSeasonPendingDownload(existingRemoteSeason.rowid)) {
      remoteSeason.status = 'in-progress';
    } else if (episodeCount.local === episodeCount.remote) {
      remoteSeason.status = 'completed';
    } else if (episodeCount.local > 0 && episodeCount.remote > episodeCount.local) {
      remoteSeason.status = 'incomplete';
    }

    if (existingRemoteSeason && existingRemoteSeason.status != remoteSeason.status) {
      await db.run(
        updateQuery(
          'remote_tv_show_seasons',
          { status: remoteSeason.status, size: remoteSeason.size }
        ) + ` WHERE token = ${existingRemoteSeason.token}`
      );
    } else if (!existingRemoteSeason) {
      // Insert shows
      await db.run(insertQuery('remote_tv_show_seasons', {
        name: remoteSeason.name,
        token: remoteSeason.id,
        size: remoteSeason.size,
        status: remoteSeason.status,
        remote_tv_show_id: showId,
        created_at: Date.now()
      }));
    }
    await syncRemoteEpisodesForSeason(remoteSeason);
  } catch (error) {
    console.error(error);
  }
}

async function syncRemoteEpisodesForSeason(remoteSeason) {
  const db = await dbConnection();
  const episodesFromRemote = remoteSeason.children;

  // Select the ROWID from the season to build the association for the episodes
  const { rowid } = await db.get(selectByTokenQuery('remote_tv_show_seasons', remoteSeason.id));
  if (!rowid) {
    throw Error('Season does not exist in DB...')
  }

  // Find any new content or out of date content:
  episodesFromRemote.forEach(async remoteEpisode => await updateOrCreateEpisode(remoteEpisode, rowid));
  // TODO: Delete content that is no longer available
}

async function updateOrCreateEpisode(remoteEpisode, seasonId) {
  const db = await dbConnection();
  const localEpisode = await db.get(selectByTokenQuery('local_tv_show_episodes', remoteEpisode.id));
  const existingRemoteEpisode = await db.get(selectByTokenQuery('remote_tv_show_episodes', remoteEpisode.id));
  const pendingEpisode = await db.get(`
    SELECT * FROM pending_download_requests WHERE token = "${remoteEpisode.id}" AND type = "tv"
  `);

  if (localEpisode) {
    remoteEpisode.status = 'completed';
  } else if (pendingEpisode) {
    remoteEpisode.status = 'in-progress';
  } else {
    remoteEpisode.status = 'not-downloaded';
  }

  if (existingRemoteEpisode && existingRemoteEpisode.status != remoteEpisode.status) {
    await db.run(
      updateQuery(
        'remote_tv_show_episodes',
        { status: remoteEpisode.status, size: remoteEpisode.size }
      ) + ` WHERE token = ${existingRemoteEpisode.token}`
    );
  } else if (!existingRemoteEpisode) {
    await db.run(insertQuery('remote_tv_show_episodes', {
      name: remoteEpisode.name,
      token: remoteEpisode.id,
      size: remoteEpisode.size,
      status: remoteEpisode.status,
      remote_tv_show_season_id: seasonId,
      created_at: Date.now()
    }));
  }
}

async function getEpisodeCountForShow(showToken, location = 'local') {
  const db = await dbConnection();
  return db.get(`
    SELECT
      COALESCE(COUNT(episodes.token), 0)
    FROM ${location}_tv_shows shows
    LEFT JOIN ${location}_tv_show_seasons seasons ON seasons.${location}_tv_show_id = shows.ROWID
    LEFT JOIN ${location}_tv_show_episodes episodes ON episodes.${location}_tv_show_season_id = seasons.ROWID
    WHERE shows.token = "${showToken}"
  `);
}

async function getEpisodeCountForSeason(seasonToken, location = 'local') {
  const db = await dbConnection();
  return db.get(`
    SELECT
      COALESCE(COUNT(episodes.token), 0)
    FROM ${location}_tv_show_seasons seasons
    LEFT JOIN ${location}_tv_show_episodes episodes ON episodes.${location}_tv_show_season_id = seasons.ROWID
    WHERE seasons.token = "${seasonToken}"
  `);
}

async function isShowPendingDownload(showId) {
  const db = await dbConnection();

  if (!showId) { return false; }

  const result = await db.all(`
    SELECT token from remote_tv_show_seasons where remote_tv_show_id = ${showId}
  `);

  const pendingCount = await db.get(`
    SELECT
      COALESCE(COUNT(token), 0)
    FROM pending_download_requests pending
    WHERE token IN (${sanitizedQueryValues(...result.map(row => row.token))})
  `);

  return pendingCount > 0;
}

async function isSeasonPendingDownload(seasonId) {
  const db = await dbConnection();

  if (!seasonId) { return false; }

  const result = await db.all(`
    SELECT token from remote_tv_show_episodes where remote_tv_show_season_id = ${seasonId}
  `);

  const pendingCount = await db.get(`
    SELECT
      COALESCE(COUNT(token), 0)
    FROM pending_download_requests pending
    WHERE token IN (${sanitizedQueryValues(...result.map(row => row.token))})
  `);

  return pendingCount > 0;
}

function selectByTokenQuery(tableName, token) {
  return `SELECT *, ROWID FROM ${tableName} WHERE token = "${token}";`;
}

function deleteByTokenQuery(tableName, token) {
  return `DELETE FROM ${tableName} WHERE token = "${token}";`;
}
