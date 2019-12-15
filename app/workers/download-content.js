const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { parentPort, workerData } = require('worker_threads');

const UNPACK_DIR = '../../unpack';
const MANAGER_DOMAIN = 'https://192.168.1.205:1338';
// const MANAGER_DOMAIN = 'https://localhost:1338';

(async () => {
  const token = workerData.token;
  const url = `${MANAGER_DOMAIN}/api/checkout/movies/${token}`;
  const filePath = path.resolve(__dirname, UNPACK_DIR, 'tmp.tar');
  const writer = fs.createWriteStream(filePath);

  const promise = axios({
    url,
    method: 'GET',
    responseType: 'stream',
  }).then(response => {
    parentPort.postMessage("Testing 123");
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }).catch(err => console.error(err));

  parentPort.postMessage("Howdy!!");
  // Use manager-comm.service to start file download
  // Grab logic from test script and post messages back to parent with download status updates
  return promise;
})();
