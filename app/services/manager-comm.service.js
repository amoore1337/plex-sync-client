const axios = require('axios');
const { Worker } = require('worker_threads');

const MANAGER_DOMAIN = 'https://192.168.1.205:1338';
// const MANAGER_DOMAIN = 'https://localhost:1338';

exports.fetchAvailableShows = function () {
  return axios.get(`${MANAGER_DOMAIN}/api/shows`).then(res => res.data);
}

exports.fetchAvailableMovies = function () {
  return axios.get(`${MANAGER_DOMAIN}/api/movies`).then(res => res.data);
}

exports.downloadContent = async function (token) {
  const worker = new Worker(require.resolve('../workers/download-content.js'), {
    workerData: { token }
  });
  // Create "pending" db record
  // Listen for download status updates
  // Listen for finished and remove pending record + update local_tv_ tables
  // Return after pending db records have been created
  worker.on('message', message => console.log("GOT MESSAGE: ", message));
  worker.on('exit', (code) => {
    console.log('DONE!! ', code);
  });
  return true;
}
