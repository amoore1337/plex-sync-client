const { database } = require('../db/db.helper');

exports.getAvailableTvShows = async function () {
  const db = await database();
  // TODO: The limit 200 is sorta arbitrary, just felt weird to not limit it at all. Might need pagination eventually
  const shows = await db.all('SELECT * FROM remote_shows LIMIT 200');

  // BLEH, this is dumb. Come back to this
  for (let i = 0; i < shows.length; i++) {
    shows[i].seasons = await getSeasonsForShow(shows[i].token);
    for (let j = 0; j < shows[i].seasons.length; j++) {
      shows[i].seasons[j].episodes = await getEpisodesForSeason(shows[i].seasons[j].token);
    }
  }

  return shows;
}

async function getSeasonsForShow(showToken) {
  let db;
  try {
    db = await database();
    return db.all(`SELECT * FROM remote_seasons WHERE show_token = "${showToken}"`);
  } catch (error) {
    console.error(error);
  }
}

async function getEpisodesForSeason(seasonToken) {
  let db;
  try {
    db = await database();
    return db.all(`SELECT * FROM remote_episodes WHERE season_token = "${seasonToken}"`);
  } catch (error) {
    console.error(error);
  }
}
