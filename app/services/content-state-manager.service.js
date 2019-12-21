const { getPathFromHash, mapMediaDir, getMoviePath, getTvPath } = require('./file.service');
const { dbConnection, dbClose, insertQuery, updateQuery } = require('../db/db.helper');

exports.createPendingDownloadRecord = async function (token, type) {
  const db = await dbConnection();
  const tableName = type === 'movie' ? 'remote_movies' : 'remote_tv_show_seasons';
  const contentRequesting = await db.get(`SELECT * FROM ${tableName} WHERE token = "${token}"`);
  db.run(insertQuery('pending_download_requests', {
    name: contentRequesting.name,
    type,
    token,
    last_event: 'pending',
    size: contentRequesting.size,
    created_at: Date.now(),
  }));

  await dbClose(db);
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
  try {
    // const tableMap = {
    //   'movie': 'movies',
    //   'show': 'tv_shows',
    //   'season': 'tv_show_seasons',
    //   'episode': 'tv_show_episodes',
    // };
    const db = await dbConnection();

    // TODO: Mark various content as completed (aka more than just movies)
    await markMovieAsCompleted(db, token);
    await db.run(`DELETE FROM pending_download_requests WHERE token = "${token}";`)

    await dbClose(db);
  } catch (error) {
    console.error(error);
  }
}

async function updatePendingDownloadRecord(token, status) {
  const db = await dbConnection();
  await db.run(updateQuery('pending_download_requests', { last_event: status }) + ` WHERE token = "${token}"`);
  await dbClose(db);
}

async function updateContent(token, type, status) {
  const db = await dbConnection();
  const tableName = type === 'movie' ? 'remote_movies' : 'remote_tv_show_seasons';
  const constentStatus = [
    'pending',
    'downloading',
    'unpacking',
    'processing',
    'cleaning'
  ].indexOf(status) > -1 ? 'in-progress' : 'unknown';

  await db.run(updateQuery(tableName, { status: constentStatus }) + ` WHERE token = "${token}"`);
  await dbClose(db);
}

async function markMovieAsCompleted(db, token) {

  const contentPath = `${getMoviePath()}/${getPathFromHash(token)}`
  const dirMap = await mapMediaDir(contentPath);
  const fsMovie = dirMap[0];

  await db.run(insertQuery('local_movies', {
    name: fsMovie.name,
    token: token,
    size: fsMovie.size,
    created_at: Date.now(),
  }));

  await db.run(updateQuery('remote_movies', { status: 'completed' }) + ` WHERE token = "${token}"`);
}
