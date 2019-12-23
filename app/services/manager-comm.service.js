const axios = require('axios');
const { Worker } = require('worker_threads');
const { getPathFromHash, getMoviePath, getTvPath } = require('./file.service');
const { fetchAccessTokenForManager } = require('./auth.service');
const { getManagerConfig, getManagerDomain } = require('./manager-config.service');
const { startPendingContent, updateContentStatus, completeContent } = require('./content-state-manager.service');
const { refreshPlexLibraryForType } = require('./plex-comm.service');

let oauthToken = '';
const comm = axios.create();

comm.interceptors.request.use(async config => {
  const managerConfig = await getManagerConfig();
  if (!managerConfig) { return Promise.reject('No Client configured.'); }

  if (!oauthToken) {
    oauthToken = await fetchAccessTokenForManager();
  }
  config.headers.Authorization = `Bearer ${oauthToken}`;
  config.headers.Client_Id = managerConfig.client_id;
  return config;
}, err => Promise.reject(err));

exports.fetchAvailableShows = async function () {
  const hostname = await getManagerDomain();
  return comm.get(`${hostname}/api/shows`).then(res => res.data);
}

exports.fetchAvailableMovies = async function () {
  const hostname = await getManagerDomain();
  return comm.get(`${hostname}/api/movies`).then(res => res.data);
}

exports.downloadContent = async function (token, type) {
  await startPendingContent(token, type);
  const filePath = getPathFromHash(token);
  const rootDir = type === 'movie' ? getMoviePath() : getTvPath();
  const oauthToken = await fetchAccessTokenForManager();
  const managerClient = await getManagerConfig();
  const worker = new Worker(require.resolve('../workers/download-content.js'), {
    workerData: {
      token,
      filePath,
      rootDir,
      type,
      clientId: managerClient.client_id,
      hostname: managerClient.hostname,
      oauthToken,
    }
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
      const plexType = ['show', 'season', 'episode'].indexOf(type) > -1 ? 'show' : 'movie';
      await refreshPlexLibraryForType(plexType);
    }
  });

  return true;
}

async function handleDownloadStatusUpdate(event, lastStatus) {
  if (lastStatus != event.status) {
    await updateContentStatus(event.token, event.type, event.status)
  }
}
