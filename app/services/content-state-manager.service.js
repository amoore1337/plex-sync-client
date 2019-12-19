// const { getPathFromHash, getMoviePath, getTvPath } = require('./file.service');
const { dbConnection, dbClose, insertQuery } = require('../db/db.helper');
const path = require('path');

exports.createPendingDownloadRecord = async function (token, type) {
  const db = await dbConnection();
  const tableName = type === 'movies' ? 'remote_movies' : 'remote_tv_show_seasons';
  const contentRequesting = await db.get(`SELECT * FROM ${tableName} WHERE token = "${token}"`);
  db.run(insertQuery('pending_download_requests', {
    name: contentRequesting.name,
    type,
    token,
    size: contentRequesting.size,
    created_at: Date.now(),
  }));

  await dbClose(db);
}
