const fs = require('fs');
const path = require('path');
const config = require('nconf');
const { promisify } = require('util');
const { encode } = require('url-safe-base64');
const { sumBy, find, findIndex } = require('lodash');
const disk = require('diskusage');
const os = require('os');

const osRoot = os.platform() === 'win32' ? 'c:' : '/';
const readDirAsync = promisify(fs.readdir);

let MOVIE_DIR;
let TV_DIR;
let UNPACK_DIR;

exports.getAvailableDriveSpace = async function() {
  try {
    const { available } = await disk.check(osRoot);
    return available
  } catch (err) {
    return 0
  }
};

exports.addStatusToMovies = async function(availableMovies) {
  const localMovies = await getExistingMoviesMap();
  for (var i = 0; i < availableMovies.length; i++) {
    let movie = availableMovies[i];
    // TODO: This isn't quite right, a movie can be 'in-progress' too, will need to check download queue for that
    movie.status = findIndex(localMovies, { id: movie.id }) > -1 ? 'completed' : 'not-downloaded';
  }
  return availableMovies;
};

exports.addStatusToShows = async function(availableShows) {
  const localShows = await getExistingTvShowsMap();

  for (var i = 0; i < availableShows.length; i++) {
    let show = availableShows[i];
    // TODO: This is a brute force opproach and could easily be optimized. It also needs to account for 'in-progress' shows/seasons.
    const localShow = find(localShows, { id: show.id });
    if (!localShow) {
      show.status = 'not-downloaded';
      show.children.forEach((season) => season.status = 'not-downloaded');
      continue;
    }
    for (var j = 0; j < show.children.length; j++) {
      let season = show.children[j];
      season.status = findIndex(localShow.children, { id: season.id }) > -1 ? 'completed' : 'not-downloaded';
    }
    show.status = findIndex(show.children, (s) => ['not-downloaded', 'in-progress'].indexOf(s.status) > -1) > -1 ? 'incomplete' : 'completed';
  }
  return availableShows;
};

exports.getExistingMoviesMap = getExistingMoviesMap;

exports.getExistingTvShowsMap = getExistingTvShowsMap;

exports.getPathFromHash = getPathFromHash;

exports.getMovieDir = getMovieDir;

// ===========================================================================

function getExistingMoviesMap() {
  return mapDir(getMovieDir(), { extensions: /\.(mp4|mkv|avi|m4v)$/g, basePath: getMovieDir() });
}

function getExistingTvShowsMap() {
  return mapDir(getTvDir(), { extensions: /\.(mp4|mkv|avi|m4v)$/g, basePath: getTvDir() });
}

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

function filePathToHash(filePath) {
  return encode(Buffer.from(filePath).toString('base64'));
}

function getPathFromHash(hash) {
  return Buffer.from(hash, 'base64').toString('ascii');
}

// Options can contain a whitelisted list of file extensions expressed as a regex.
function mapDir(dirPath, options = {}) {
  return readDirAsync(dirPath).then(files => {
    const dirMap = [];
    const promises = [];
    for (var i = 0; i < files.length; i++) {
      const filePath = `${dirPath}/${files[i]}`;
      const stats = fs.statSync(filePath);

      if (options.extensions && stats.isFile() && !files[i].match(options.extensions)) {
        continue;
      }

      const token = options.basePath ? filePathToHash(path.relative(options.basePath, filePath)) : filePathToHash(filePath);
      const details = {
        token,
        name: files[i],
        isDir: stats.isDirectory(),
        size: stats.size,
        children: [],
      };
      if (details.isDir) {
        promises.push(mapDir(filePath, options).then(map => { details.children = map; details.size = details.size + sumBy(map, 'size') }));
      }
      dirMap.push(details);
    }
    return Promise.all(promises).then(() => dirMap);
  });
}
