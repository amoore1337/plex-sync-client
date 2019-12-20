const axios = require('axios');
const { Worker } = require('worker_threads');
const { getPathFromHash, getMoviePath, getTvPath } = require('./file.service');
const { createPendingDownloadRecord, updateContentStatus } = require('./content-state-manager.service');

const MANAGER_DOMAIN = 'https://192.168.1.205:1338';
// const MANAGER_DOMAIN = 'https://localhost:1338';

exports.fetchAvailableShows = function () {
  return axios.get(`${MANAGER_DOMAIN}/api/shows`).then(res => res.data);
}

exports.fetchAvailableMovies = function () {
  return axios.get(`${MANAGER_DOMAIN}/api/movies`).then(res => res.data);
}

exports.downloadContent = async function (token, type) {
  await createPendingDownloadRecord(token, type);
  const filePath = getPathFromHash(token);
  const rootDir = type === 'movie' ? getMoviePath() : getTvPath();
  const worker = new Worker(require.resolve('../workers/download-content.js'), {
    workerData: { token, filePath, rootDir, type }
  });
  // Listen for download status updates
  // Listen for finished and remove pending record + update local_tv_ tables
  // Return after pending db records have been created
  let lastStatus = '';
  worker.on('message', async event => {
    await handleDownloadStatusUpdate(event, lastStatus);
  });

  worker.on('error', (err) => console.error(err));
  worker.on('exit', (code) => {
    console.log('DONE!! ', code);
  });
  return true;
}

async function handleDownloadStatusUpdate(event, lastStatus) {
  switch (event.status) {
    case 'downloading':
      if (lastStatus != event.status) {
        await updateContentStatus(event.token, event.type, event.status)
      }
      break;

    default:
      break;
  }
}
