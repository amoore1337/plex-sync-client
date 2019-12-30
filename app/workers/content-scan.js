const { getExistingMoviesMap, getExistingTvShowsMap } = require('../services/file.service');
const { fetchAvailableMovies, fetchAvailableShows } = require('../services/manager-comm.service');
const { database, sanitizedQueryValues, createOrUpdate } = require('../db/db.helper');
const { find, map, difference } = require('lodash');
const moment = require('moment');

module.exports = async function() {
  console.log('[SYNC] Syncing content with remote @ ', moment().format('MMMM Do YYYY, h:mm:ss a'));

  try {
    const remoteMovies = await fetchAvailableMovies();
    // TODO: This is dumb but a placeholder till error handling is fixed
    if (remoteMovies.error) {
      throw new Error(remoteMovies.error);
    }
    const fsMovies = await getExistingMoviesMap();
    await syncMovies(fsMovies, remoteMovies);
  } catch (error) {
    console.error('Unable to sync movies:');
    console.error(error);
  }

  try {
    const remoteShows = await fetchAvailableShows();
    // TODO: This is dumb but a placeholder till error handling is fixed
    if (remoteShows.error) {
      throw new Error(remoteShows.error);
    }
    const fsShows = await getExistingTvShowsMap();
    await syncEpisodes(fsShows, remoteShows);
    await syncSeasons(fsShows, remoteShows);
    await syncShows(fsShows, remoteShows);
  } catch (error) {
    console.error('Unable to sync tv shows:');
    console.error(error);
  }
}

async function syncMovies(fsMovies, remoteMovies) {
  const db = await database();

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
        { size: existingMovie.size, name: remoteMovie.name },
        { token: remoteMovie.token },
      );
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
    await db.run(`DELETE FROM remote_movies WHERE token IN (${sanitizedQueryValues(...removedTokens)})`)
  }
}

async function syncEpisodes(fsShows, remoteShows) {
  const db = await database();
  await cleanupRemovedEpisodes(remoteShows);

  const fsEpisodes = getAllEpisodes(fsShows);
  const remoteEpisodes = getAllEpisodes(remoteShows);
  for (let i = 0; i < remoteEpisodes.length; i++) {
    const remoteEpisode = remoteEpisodes[i];
    const existingEpisode = find(fsEpisodes, { token: remoteEpisode.token });
    const pendingRequest = await db.get(`
      SELECT * FROM pending_content_requests WHERE type = "movie" AND token = "${remoteEpisode.token}"`
    );

    if (existingEpisode) {
      // Verify remote content record:
      await createOrUpdate(
        'remote_episodes',
        {
          status: 'completed',
          size: remoteEpisode.size,
          name: remoteEpisode.name,
          season_token: remoteEpisode.season_token,
        },
        { token: remoteEpisode.token },
      );
      // Verify local content record:
      await createOrUpdate(
        'local_episodes',
        {
          size: existingEpisode.size,
          name: remoteEpisode.name,
          season_token: remoteEpisode.season_token,
        },
        { token: remoteEpisode.token },
      );
    } else if (pendingRequest) {
      await createOrUpdate(
        'remote_episodes',
        {
          status: 'in-progress',
          size: remoteEpisode.size,
          name: remoteEpisode.name,
          season_token: remoteEpisode.season_token,
        },
        { token: remoteEpisode.token },
      );
    } else {
      await createOrUpdate(
        'remote_episodes',
        {
          status: 'not-downloaded',
          size: remoteEpisode.size,
          name: remoteEpisode.name,
          season_token: remoteEpisode.season_token,
        },
        { token: remoteEpisode.token },
      );
    }
  }
}

async function cleanupRemovedEpisodes(remoteShows) {
  const db = await database();
  const existingTokens = map(await db.all('SELECT token FROM remote_episodes'), 'token');
  const remoteTokens = map(getAllEpisodes(remoteShows), 'token');
  const removedTokens = difference(existingTokens, remoteTokens);

  if (removedTokens.length) {
    await db.run(`DELETE FROM remote_episodes WHERE token IN (${sanitizedQueryValues(...removedTokens)})`);
  }
}

async function syncSeasons(fsShows, remoteShows) {
  const db = await database();
  await cleanupRemovedSeasons(remoteShows);

  const fsSeasons = getAllSeasons(fsShows);
  const remoteSeasons = getAllSeasons(remoteShows);

  for (let i = 0; i < remoteSeasons.length; i++) {
    const remoteSeason = remoteSeasons[i];
    const existingSeason = find(fsSeasons, { token: remoteSeason.token });
    const episodeStatuses = map(
      await db.all(`SELECT DISTINCT status FROM remote_episodes WHERE season_token = "${remoteSeason.token}"`),
      'status',
    );

    if (episodeStatuses.length === 1 && episodeStatuses[0] === 'completed') { // completed
      // Verify remote content record:
      await createOrUpdate(
        'remote_seasons',
        {
          status: 'completed',
          size: remoteSeason.size,
          name: remoteSeason.name,
          show_token: remoteSeason.show_token,
        },
        { token: remoteSeason.token },
      );
      // Verify local content record:
      await createOrUpdate(
        'local_seasons',
        {
          size: existingSeason.size,
          name: remoteSeason.name,
          show_token: remoteSeason.show_token,
        },
        { token: remoteSeason.token },
      );
    } else if (episodeStatuses.indexOf('in-progress') > -1) { // in-progress
      await createOrUpdate(
        'remote_seasons',
        {
          status: 'in-progress',
          size: remoteSeason.size,
          name: remoteSeason.name,
          show_token: remoteSeason.show_token,
        },
        { token: remoteSeason.token },
      );
    } else if (episodeStatuses.length === 1 && episodeStatuses[0] === 'not-downloaded') { //not-downloaded
      await createOrUpdate(
        'remote_seasons',
        {
          status: 'not-downloaded',
          size: remoteSeason.size,
          name: remoteSeason.name,
          show_token: remoteSeason.show_token,
        },
        { token: remoteSeason.token },
      );
    } else { // incomplete
      await createOrUpdate(
        'remote_seasons',
        {
          status: 'incomplete',
          size: remoteSeason.size,
          name: remoteSeason.name,
          show_token: remoteSeason.show_token,
        },
        { token: remoteSeason.token },
      );
    }
  }
}

async function cleanupRemovedSeasons(remoteShows) {
  const db = await database();
  const existingTokens = map(await db.all('SELECT token FROM remote_seasons'), 'token');
  const remoteTokens = map(getAllSeasons(remoteShows), 'token');

  const removedTokens = difference(existingTokens, remoteTokens);
  if (removedTokens.length) {
    await db.run(`DELETE FROM remote_seasons WHERE token IN (${sanitizedQueryValues(...removedTokens)})`);
    await db.run(`DELETE FROM remote_episodes WHERE season_token IN (${sanitizedQueryValues(...removedTokens)})`);
  }
}

async function syncShows(fsShows, remoteShows) {
  const db = await database();
  await cleanupRemovedShows(remoteShows);

  for (let i = 0; i < remoteShows.length; i++) {
    const remoteShow = remoteShows[i];
    const existingShow = find(fsShows, { token: remoteShow.token });
    const seasonStatuses = map(
      await db.all(`SELECT DISTINCT status FROM remote_seasons WHERE show_token = "${remoteShow.token}"`),
      'status',
    );

    if (seasonStatuses.length === 1 && seasonStatuses[0] === 'completed') { // completed
      // Verify remote content record:
      await createOrUpdate(
        'remote_shows',
        {
          status: 'completed',
          size: remoteShow.size,
          name: remoteShow.name,
        },
        { token: remoteShow.token },
      );
      // Verify local content record:
      await createOrUpdate(
        'local_seasons',
        {
          size: existingShow.size,
          name: remoteShow.name,
        },
        { token: remoteShow.token },
      );
    } else if (seasonStatuses.indexOf('in-progress') > -1) { // in-progress
      await createOrUpdate(
        'remote_shows',
        {
          status: 'in-progress',
          size: remoteShow.size,
          name: remoteShow.name,
        },
        { token: remoteShow.token },
      );
    } else if (seasonStatuses.length === 1 && seasonStatuses[0] === 'not-downloaded') { //not-downloaded
      await createOrUpdate(
        'remote_shows',
        {
          status: 'not-downloaded',
          size: remoteShow.size,
          name: remoteShow.name,
        },
        { token: remoteShow.token },
      );
    } else { // incomplete
      await createOrUpdate(
        'remote_shows',
        {
          status: 'incomplete',
          size: remoteShow.size,
          name: remoteShow.name,
        },
        { token: remoteShow.token },
      );
    }
  }
}

async function cleanupRemovedShows(remoteShows) {
  const db = await database();
  const existingTokens = map(await db.all('SELECT token FROM remote_shows'), 'token');
  const remoteTokens = map(remoteShows, 'token');

  const removedTokens = difference(existingTokens, remoteTokens);
  if (removedTokens.length) {
    const existingSeasonTokens = map(
      await db.all(`SELECT token FROM remote_seasons WHERE show_token IN (${sanitizedQueryValues(...removedTokens)})`),
      'token'
    );
    await db.run(`DELETE FROM remote_shows WHERE token IN (${sanitizedQueryValues(...removedTokens)})`);
    await db.run(`DELETE FROM remote_seasons WHERE token IN (${sanitizedQueryValues(...existingSeasonTokens)})`);
    await db.run(`DELETE FROM remote_episodes WHERE season_token IN (${sanitizedQueryValues(...existingSeasonTokens)})`);
  }
}

function getAllEpisodes(showsMap) {
  if (!showsMap) { return []; }
  const allSeasons = getAllSeasons(showsMap);
  let episodes = [];
  for (let i = 0; i < allSeasons.length; i++) {
    const season = allSeasons[i];
    if (season.children) {
      season.children.forEach(episode => {
        episodes.push({
          name: episode.name,
          size: episode.size,
          token: episode.token,
          season_token: season.token,
        });
      });
    }
  }
  return episodes;
}

function getAllSeasons(showsMap) {
  if (!showsMap) { return []; }
  let seasons = [];
  for (let i = 0; i < showsMap.length; i++) {
    const show = showsMap[i];
    if (show.children) {
      show.children.forEach(season => {
        seasons.push({
          name: season.name,
          size: season.size,
          token: season.token,
          show_token: show.token,
          children: season.children,
        });
      });
    }
  }
  return seasons;
}
