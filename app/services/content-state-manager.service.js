// const { getPathFromHash, getMoviePath, getTvPath } = require('./file.service');
const { dbConnection, dbClose, insertQuery } = require('../db/db.helper');

exports.createPendingDownloadRecord = async function (token, type) {
  const db = await dbConnection();
  const tableName = type === 'movies' ? 'remote_movies' : 'remote_tv_show_seasons';
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
  await updatePendingDownloadRecord(token, status);
  await updateContent(token, type, status);
}

async function updatePendingDownloadRecord(token, status) {
  const db = await dbConnection();
  await db.run(updateQuery('pending_download_requests', { status }) + ` WHERE token = "${token}"`);
  await dbClose(db);
}

async function updateContent(token, type, status) {
  const db = await dbConnection();
  const tableName = type === 'movies' ? 'remote_movies' : 'remote_tv_show_seasons';
  const constentStatus = [
    'pending',
    'downloading',
    'unpacking',
    'processing',
    'cleaning'
  ].indexOf(status) > -1 ? 'in-progress' : 'completed';

  await db.run(updateQuery(tableName, { constentStatus }) + ` WHERE token = "${token}"`);
  await dbClose(db);
}
