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
  const { token, filePath, rootDir } = workerData;
  console.log(token, '  ', filePath);
  const url = `${MANAGER_DOMAIN}/api/checkout/movies/${token}`;
  const noPaddingToken = token.replace(/\./g, '');

  const tempTar = path.resolve(__dirname, UNPACK_DIR, `${noPaddingToken}.tar`);
  const tempDirPath = path.resolve(__dirname, UNPACK_DIR, noPaddingToken);
  const outputDir = filePath.slice((filePath.lastIndexOf('/') + 1), filePath.length);
  const outputPath = path.resolve(__dirname, tempDirPath, outputDir);
  const destinationPath = `${rootDir}/${outputDir}`
  console.log("temp values: ", tempTar, '  ', tempDirPath);
  console.log("output values: ", outputDir, '  ', outputPath);
  console.log("destination values: ", destinationPath);

  const writer = fs.createWriteStream(tempTar);

  const { data, headers } = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });
  const totalSize = headers['content-length'];
  console.log("total size: ", totalSize);

  let counter = 0
  let received = 0
  data.on('data', chunk => {
    received += chunk.length
    if (counter++ > 300) {
      console.log("GOT SOME MORE DATA  ", chunk.length, "   ", received);
      counter = 0
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

  async function unpackFile() {
    return await compressing.tgz.uncompress(
      tempTar,
      tempDirPath,
    );
  }

  async function moveMedia() {
    return await fsExtra.move(outputPath, destinationPath);
  }

  async function removeTar() {
    return await fsExtra.remove(tempTar);
  }

  async function removeTempDir() {
    return await fsExtra.remove(tempDirPath);
  }
})();
