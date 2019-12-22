const axios = require('axios');
const { Worker } = require('worker_threads');
const { getPathFromHash, getMoviePath, getTvPath } = require('./file.service');
const { startPendingContent, updateContentStatus, completeContent } = require('./content-state-manager.service');
const { refreshPlexLibraryForType } = require('./plex-comm.service');

const MANAGER_DOMAIN = 'https://192.168.1.205:1338';
// const MANAGER_DOMAIN = 'https://localhost:1338';

exports.fetchAvailableShows = function () {
  return axios.get(`${MANAGER_DOMAIN}/api/shows`).then(res => res.data);
}

exports.fetchAvailableMovies = function () {
  return axios.get(`${MANAGER_DOMAIN}/api/movies`).then(res => res.data);
}

exports.downloadContent = async function (token, type) {
  await startPendingContent(token, type);
  const filePath = getPathFromHash(token);
  const rootDir = type === 'movie' ? getMoviePath() : getTvPath();
  const worker = new Worker(require.resolve('../workers/download-content.js'), {
    workerData: { token, filePath, rootDir, type }
  });

  let lastStatus = '';
  worker.on('message', async event => {
    await handleDownloadStatusUpdate(event, lastStatus);
    lastStatus = event.status;
  });

  worker.on('error', (err) => console.error(err));

  worker.on('exit', async statusCode => {
    if (statusCode === 0) {
      await completeContent(token, type);
      // Update Plex library with new content:
      const plexType = ['show', 'season', 'episode'].indexOf(type) > -1 ? 'show' : movie;
      refreshPlexLibraryForType(plexType);
    }
  });

  return true;
}

async function handleDownloadStatusUpdate(event, lastStatus) {
  if (lastStatus != event.status) {
    await updateContentStatus(event.token, event.type, event.status)
  }
}
