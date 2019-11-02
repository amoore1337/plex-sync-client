const compressing = require('compressing');
const fs = require('fs');
const dirTree = require('directory-tree');
const path = require('path');
const pump = require('pump');
const config = require('nconf');
const logger = require('winston');

let MOVIE_DIR;
let TV_DIR;
let PACKAGING_DIR;

exports.compressMovie = function (inputPath) {
  // Verify dir is configured before trying to zip
  if (!getMovieDir()) {
    const err = new Error('Movie directory does not exist.');
    err.httpCode = 404;
    return Promise.reject(err);
  }

  const compressStream = new compressing.tgz.Stream();
  compressStream.addEntry(moviePath(inputPath));
  const destStream = fs.createWriteStream(packagingPath(inputPath));

  return new Promise((resolve, reject) => {
    pump(compressStream, destStream, (err) => { if (!err) { resolve(); } else { reject(err); } });
  })
}

exports.compressTvShow = function (inputPath) {
  // Verify dir is configured before trying to zip
  if (!getTvDir()) {
    const err = new Error('TV directory does not exist.');
    err.httpCode = 404;
    return Promise.reject(err);
  }

  const compressStream = new compressing.tgz.Stream();
  compressStream.addEntry(tvPath(inputPath));
  const destStream = fs.createWriteStream(packagingPath(inputPath));

  return new Promise((resolve, reject) => {
    pump(compressStream, destStream, (err) => { if (!err) { resolve(); } else { reject(err); } });
  })
}

exports.packagingPath = packagingPath;

exports.removePackagedFile = function(inputPath) {
  fs.unlinkSync(packagingPath(inputPath));
}

exports.getExistingMoviesMap = function() {
  return dirTree(getMovieDir(), { extensions: /\.(mp4|mkv|avi)/ })
}

exports.getExistingTvShowsMap = function() {
  return dirTree(getTvDir(), { extensions: /\.(mp4|mkv|avi)/ })
}

// ===========================================================================

function getMovieDir() {
  if (!MOVIE_DIR) { MOVIE_DIR = config.get('MOVIE_DIR') || '/movies'; }

  if (!fs.existsSync(MOVIE_DIR)) {
    // Try looking in relative path
    if (fs.existsSync(`.${MOVIE_DIR}`)) {
      MOVIE_DIR = `.${MOVIE_DIR}`
    } else {
      MOVIE_DIR = null;
    }
  }
  return MOVIE_DIR;
}

function getTvDir() {
  if (!TV_DIR) { TV_DIR = config.get('TV_DIR') || '/tv_shows'; }

  if (!fs.existsSync(TV_DIR)) {
    // Try looking in relative path
    if (fs.existsSync(`.${TV_DIR}`)) {
      TV_DIR = `.${TV_DIR}`
    } else {
      TV_DIR = null;
    }
  }
  return TV_DIR;
}

function moviePath(relPath) {
  return path.resolve(`${getMovieDir()}/${relPath}`);
}

function tvPath(relPath) {
  return path.resolve(`${getTvDir()}/${relPath}`);
}

function packagingPath(relPath) {
  if (!PACKAGING_DIR) { PACKAGING_DIR = initPackagingPath(); }

  const fileName = `${path.parse(relPath).name}.tar`;
  return path.resolve(`${PACKAGING_DIR}/${fileName}`);
}

function initPackagingPath() {
  const path = config.get('PACKAGING_DIR') || '/packaging';
  if (fs.existsSync(path)) { return path; }

  const tempPath = `.${path}`;
  if (!fs.existsSync(tempPath)) {
    logger.warn(`Volume ${path} does not exist, creating temp dir.`);
    fs.mkdirSync(tempPath);
  }
  return tempPath;
}
