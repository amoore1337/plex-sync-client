const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { parentPort, workerData } = require('worker_threads');

const MANAGER_DOMAIN = 'https://192.168.1.205:1338';
// const MANAGER_DOMAIN = 'https://localhost:1338';

(async () => {
  const token = workerData.token;
  const url = `${MANAGER_DOMAIN}/api/checkout/movies/${token}`;
  const filePath = path.resolve(__dirname, directory, 'tmp.tar');
  const writer = fs.createWriteStream(filePath);

  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (err) {
    console.error(err.toJSON());
  }
  // Use manager-comm.service to start file download
  // Grab logic from test script and post messages back to parent with download status updates
  parentPort.postMessage("Howdy!!");
})();
