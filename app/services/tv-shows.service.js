const { database } = require('../db/db.helper');

exports.getAvailableTvShows = async function () {
  const db = await database();
  // TODO: The limit 200 is sorta arbitrary, just felt weird to not limit it at all. Might need pagination eventually
  const shows = await db.all('SELECT *, ROWID FROM remote_tv_shows LIMIT 200');

  // BLEH, this is dumb. Come back to this
  for (let i = 0; i < shows.length; i++) {
    shows[i].seasons = await getSeasonsForShow(shows[i].rowid);
    for (let j = 0; j < shows[i].seasons.length; j++) {
      shows[i].seasons[j].episodes = await getEpisodesForSeason(shows[i].seasons[j].rowid);
    }
  }

  return shows;
}

async function getSeasonsForShow(showId) {
  let db;
  try {
    db = await database();
    return db.all(`
      SELECT *, ROWID FROM remote_tv_show_seasons WHERE remote_tv_show_id = ${showId}
    `);
  } catch (error) {
    console.error(error);
  }
}

async function getEpisodesForSeason(seasonId) {
  let db;
  try {
    db = await database();
    return db.all(`
      SELECT *, ROWID FROM remote_tv_show_episodes WHERE remote_tv_show_season_id = ${seasonId}
    `);
  } catch (error) {
    console.error(error);
  }
}
