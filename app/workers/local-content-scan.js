const { getExistingMoviesMap, getExistingTvShowsMap } = require('../services/file.service');
const { dbConnection, dbClose, insertQuery, updateQuery, sanitizedQueryValues } = require('../db/db.helper');
const { findIndex } = require('lodash');

module.exports = async function() {
  let db;
  try {
    db = await dbConnection();
    await syncLocalMovies(db);
    await syncLocalTvShows(db);
  } catch (error) {
    console.error(error);
  } finally {
    await dbClose(db);
  }
}

async function syncLocalMovies(db) {
  const moviesFromFs = await getExistingMoviesMap();
  // Find any new content or out of date content:
  moviesFromFs.forEach(async fsMovie => await updateOrCreateMovie(fsMovie, db));
  // Find any content that no longer exists and delete it from db:
  await cleanupRemovedMovies(moviesFromFs, db);
}

async function updateOrCreateMovie(fsMovie, db) {
  try {
    const dbMovie = await db.get(selectByTokenQuery('local_movies', fsMovie.token));
    if (!dbMovie) {
      await db.run(insertQuery('local_movies', {
        name: fsMovie.name,
        token: fsMovie.token,
        size: fsMovie.size,
        created_at: Date.now(),
      }));
    } else if (dbMovie && (dbMovie.name !== fsMovie.name || dbMovie.size !== fsMovie.size)) {
      await db.run(
        updateQuery(
          'local_movies',
          { name: fsMovie.name, size: fsMovie.size }
        ) + ` WHERE token = "${dbMovie.token}"`
      );
    }
  } catch (error) {
    console.error(error)
  }
}

async function cleanupRemovedMovies(moviesFromFs, db) {
  try {
    const existingMovies = await db.all(`SELECT * from local_movies`);

    existingMovies.forEach(async existingMovie => {
      if (findIndex(moviesFromFs, (r) => r.token === existingMovie.token) < 0) {
        await db.run(deleteByTokenQuery('local_movies', existingMovie.token));
      }
    });
  } catch (error) {
    console.error(error);
  }
}

async function syncLocalTvShows(db) {
  const showsFromFs = await getExistingTvShowsMap();

  // Find any new content or out of date content:
  showsFromFs.forEach(async fsShow => await updateOrCreateShow(fsShow, db));

  // Find any content that no longer exists and delete it from db:
  await cleanupRemovedShows(showsFromFs, db);
}

async function updateOrCreateShow(fsShow, db) {
  try {
    const existingShow = await db.get(selectByTokenQuery('local_tv_shows', fsShow.token));
    if (existingShow && (existingShow.name !== fsShow.name || existingShow.size !== fsShow.size)) {
      await db.run(
        updateQuery(
          'local_tv_shows',
          { name: fs.name, size: fsShow.size }
        ) + ` WHERE token = "${existingShow.token}"`
      );
    } else if (!existingShow) {
      // Insert shows
      await db.run(insertQuery('local_tv_shows', {
        name: fsShow.name,
        token: fsShow.token,
        size: fsShow.size,
        created_at: Date.now(),
      }));
    }
    await syncLocalSeasonsForShow(fsShow, db);
  } catch (error) {
    console.error(error)
  }
}

async function cleanupRemovedShows(fsShows, db) {
  try {
    const existingShows = await db.all(`SELECT *, ROWID from local_tv_shows`);

    existingShows.forEach(async existingShow => {
      if (findIndex(fsShows, (r) => r.token === existingShow.token) < 0) {
        // Find any Seasons we need to remove:
        const seasons = await db.all(`
          SELECT ROWID FROM local_tv_show_seasons WHERE local_tv_show_id = ${existingShow.rowid}
        `);

        // Delete all episodes in season:
        await db.run(`
          DELETE FROM local_tv_show_episodes
          WHERE local_tv_show_season_id IN (${sanitizedQueryValues(...seasons.map(row => row.rowid))})
        `);

        // Delete all seasons for show:
        await db.run(`
          DELETE FROM local_tv_show_seasons
          WHERE local_tv_show_id = ${existingShow.rowid}
        `);

        // Finally, delete the show
        await db.run(deleteByTokenQuery('local_tv_shows', existingShow.token));
      }
    });
  } catch (error) {
    console.error(error);
  }
}

async function syncLocalSeasonsForShow(fsShow, db) {
  try {
    const seasonsFromFs = fsShow.children;

    // Select the ROWID from the show to build the association for the season
    const { rowid } = await db.get(selectByTokenQuery('local_tv_shows', fsShow.token));
    if (!rowid) {
      throw Error('Show does not exist in DB...')
    }

    // Find any new content or out of date content:
    seasonsFromFs.forEach(async fsSeason => updateOrCreateSeason(fsSeason, rowid, db));

    // Find any content that no longer exists and delete it from db:
    await cleanupRemovedSeasons(fsShow, db);
  } catch (error) {
    console.error(error);
  }
}

async function updateOrCreateSeason(fsSeason, showId, db) {
  try {
    const existingSeason = await db.get(selectByTokenQuery('local_tv_show_seasons', fsSeason.token));

    if (existingSeason && (existingSeason.name !== fsSeason.name || existingSeason.size !== fsSeason.size)) {
      await db.run(
        updateQuery(
          'local_tv_show_seasons',
          { name: fsSeason.name, size: fsSeason.size }
        ) + ` WHERE token = "${existingSeason.token}"`
      );
    } else if (!existingSeason) {
      // Insert shows
      await db.run(insertQuery('local_tv_show_seasons', {
        name: fsSeason.name,
        token: fsSeason.token,
        size: fsSeason.size,
        local_tv_show_id: showId,
        created_at: Date.now()
      }));
    }
    await syncLocalEpisodesForSeason(fsSeason, db);
  } catch (error) {
    console.error(error);
  }
}

async function cleanupRemovedSeasons(fsShow, db) {
  try {
    const existingShow = await db.get(selectByTokenQuery('local_tv_shows', fsShow.token))
    const existingSeasons = await db.all(`
      SELECT
        *, ROWID
      FROM local_tv_show_seasons
      WHERE local_tv_show_id = ${existingShow.rowid}
    `);

    existingSeasons.forEach(async existingSeason => {
      if (findIndex(fsShow.children, (r) => r.token === existingSeason.token) < 0) {

        // Delete all episodes in season:
        await db.run(`
          DELETE FROM local_tv_show_episodes
          WHERE local_tv_show_season_id = ${existingSeason.rowid}
        `);

        // Delete season:
        await db.run(`
          DELETE FROM local_tv_show_seasons
          WHERE token = "${existingSeason.token}"
        `);
      }
    });
  } catch (error) {
    console.error(error);
  }
}

async function syncLocalEpisodesForSeason(fsSeason, db) {
  try {
    const episodesFromFs = fsSeason.children;

    // Select the ROWID from the season to build the association for the episodes
    const { rowid } = await db.get(selectByTokenQuery('local_tv_show_seasons', fsSeason.token));
    if (!rowid) {
      throw Error('Season does not exist in DB...')
    }

    // Find any new content or out of date content:
    episodesFromFs.forEach(async fsEpisode => await updateOrCreateEpisode(fsEpisode, rowid, db));

    // Find any content that no longer exists and delete it from db:
    await cleanupRemovedEpisodes(fsSeason, db);
  } catch (error) {
    console.error(error);
  }
}

async function updateOrCreateEpisode(fsEpisode, seasonId, db) {
  try {
    const existingEpisode = await db.get(selectByTokenQuery('local_tv_show_episodes', fsEpisode.token));

    if (existingEpisode && (existingEpisode.name !== fsEpisode.name || existingEpisode.size !== fsEpisode.size)) {
      await db.run(
        updateQuery(
          'local_tv_show_episodes',
          { name: fsEpisode.name, size: fsEpisode.size }
        ) + ` WHERE token = "${existingEpisode.token}"`
      );
    } else if (!existingEpisode) {
      await db.run(insertQuery('local_tv_show_episodes', {
        name: fsEpisode.name,
        token: fsEpisode.token,
        size: fsEpisode.size,
        local_tv_show_season_id: seasonId,
        created_at: Date.now()
      }));
    }
  } catch (error) {
    console.error(error);
  }
}

async function cleanupRemovedEpisodes(fsSeason, db) {
  try {
    const existingSeason = await db.get(selectByTokenQuery('local_tv_show_seasons', fsSeason.token))
    const existingEpisodes = await db.all(`
      SELECT
        *, ROWID
      FROM local_tv_show_episodes
      WHERE local_tv_show_season_id = ${existingSeason.rowid}
    `);

    existingEpisodes.forEach(async existingEpisode => {
      if (findIndex(fsSeason.children, (r) => r.token === existingEpisode.token) < 0) {
        // Delete episode:
        await db.run(`
          DELETE FROM local_tv_show_episodes
          WHERE token = "${existingSeason.token}"
        `);
      }
    });
  } catch (error) {
    console.error(error);
  }
}

function selectByTokenQuery(tableName, token) {
  return `SELECT *, ROWID FROM ${tableName} WHERE token = "${token}";`;
}

function deleteByTokenQuery(tableName, token) {
  return `DELETE FROM ${tableName} WHERE token = "${token}";`;
}
