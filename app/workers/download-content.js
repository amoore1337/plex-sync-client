const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const axios = require('axios');
const compressing = require('compressing');
const { parentPort, workerData } = require('worker_threads');

const UNPACK_DIR = '../../unpack';
const MANAGER_DOMAIN = 'https://192.168.1.205:1338';
// const MANAGER_DOMAIN = 'https://localhost:1338';

(async () => {
  const { token, filePath, type, rootDir } = workerData;
  const typeToRouteMap = { 'movies': 'm', 'shows': 's' };
  const url = `${MANAGER_DOMAIN}/api/checkout/${typeToRouteMap[type]}`;
  const noPaddingToken = token.replace(/\./g, '');

  // The tar file retrieved from Manager:
  const downloadTarPath = path.resolve(__dirname, UNPACK_DIR, `${noPaddingToken}.tar`);
  // The directory extracted from the tar file:
  const extractedPath = path.resolve(__dirname, UNPACK_DIR, noPaddingToken);
  // The name of the media file/directory returned by Manager:
  const contentName = path.basename(filePath);
  // The path to the extracted media content:
  const contentPath = path.resolve(__dirname, extractedPath, contentName);
  // The path we need to move the content to:
  const destinationPath = `${rootDir}/${filePath}`

  const writer = fs.createWriteStream(downloadTarPath);

  const { data, headers } = await axios({
    url,
    method: 'POST',
    responseType: 'stream',
    data: { token },
  });
  const totalSize = headers['content-length'];

  // Throttle how frequently we notify of download updates to once every 5% of progress
  let lastProgressUpdate = 0
  let received = 0
  data.on('data', chunk => {
    received += chunk.length
    const progress = percentComplete(received, totalSize)
    if (progress > lastProgressUpdate && progress % 5 === 0) {
      console.log("GOT SOME MORE DATA  ", progress), "%";
      lastProgressUpdate = progress;
    }
  });

  writer.on('error', err => console.error(err));
  data.pipe(writer);

  writer.on('finish', async () => {
    console.log('beginning decompression...');
    await unpackFile();
    console.log('moving media...');
    await moveMedia();
    console.log('cleaning up files...');
    await removeTar();
    await removeTempDir();
  });

  parentPort.postMessage("Howdy!!");

  // === Helper functions: ===

  async function unpackFile() {
    return await compressing.tgz.uncompress(
      downloadTarPath,
      extractedPath,
    );
  }

  async function moveMedia() {
    // Replace the content if it already exists for some reason
    return await fsExtra.move(contentPath, destinationPath, { overwrite: true });
  }

  async function removeTar() {
    return await fsExtra.remove(downloadTarPath);
  }

  async function removeTempDir() {
    return await fsExtra.remove(extractedPath);
  }

  function percentComplete(downloadedSize, totalSize) {
    return Math.round((downloadedSize / totalSize) * 100)
  }

})();
