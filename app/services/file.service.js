const fs = require('fs');
const path = require('path');
const config = require('nconf');
const { promisify } = require('util');
const { encode } = require('url-safe-base64');
const { sumBy, find, findIndex, merge } = require('lodash');
const disk = require('check-disk-space');
const os = require('os');
const readDirAsync = promisify(fs.readdir);

const OS_ROOT = os.platform() === 'win32' ? 'c:' : '/';
const PROJECT_ROOT = './';

let MOVIE_PATH;
let TV_PATH;

exports.getAvailableDriveSpace = async function() {
  try {
    const { free } = await disk(OS_ROOT);
    return free;
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

exports.mapMediaDir = mapMediaDir;

exports.getPathFromHash = getPathFromHash;

exports.getMoviePath = getMoviePath;

exports.getTvPath = getTvPath;

// ===========================================================================

async function getExistingMoviesMap() {
  return await mapMediaDir(getMoviePath());
}

async function getExistingTvShowsMap() {
  return await mapMediaDir(getTvPath());
}

function getMoviePath() {
  if (MOVIE_PATH) { return MOVIE_PATH }
  let movieDir = config.get('MOVIE_DIR') || '/movies';
  console.log('start: ', movieDir);

  const absolutePath = path.resolve(PROJECT_ROOT, movieDir);
  console.log('absolute: ', absolutePath);
  if (fs.existsSync(absolutePath)) {
    MOVIE_PATH = absolutePath;
  } else {
    // Try looking in relative path
    const relativePath = path.relative(PROJECT_ROOT, `.${movieDir}`);
    console.log('relative: ', relativePath);
    if (fs.existsSync(relativePath)) {
      MOVIE_PATH = relativePath
    }
  }
  console.log('MOVIE PATH: ', MOVIE_PATH);
  return MOVIE_PATH;
}

function getTvPath() {
  if (TV_PATH) { return TV_PATH }
  let tvDir = config.get('TV_DIR') || '/tv_shows';

  const absolutePath = path.resolve(PROJECT_ROOT, tvDir);
  if (fs.existsSync(absolutePath)) {
    TV_PATH = absolutePath;
  } else {
    // Try looking in relative path
    const relativePath = path.relative(PROJECT_ROOT, `.${tvDir}`);
    if (fs.existsSync(relativePath)) {
      TV_PATH = relativePath
    }
  }
  return TV_PATH;
}

function filePathToHash(filePath) {
  return encode(Buffer.from(filePath).toString('base64'));
}

function getPathFromHash(hash) {
  return Buffer.from(hash, 'base64').toString('ascii');
}

// Thin wrapper around mapDir to keep from pasting the same regex all over the place
async function mapMediaDir(dirPath, options) {
  return mapDir(dirPath, merge({ extensions: /\.(mp4|mkv|avi|m4v)$/g, basePath: dirPath }, options));
}

// Options can contain a whitelisted list of file extensions expressed as a regex.
function mapDir(dirPath, options = {}) {
  console.log('dirpath: ', dirPath);
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
      if (details.isDir && details.children) {
        promises.push(mapDir(filePath, options).then(map => { details.children = map; details.size = details.size + sumBy(map, 'size') }));
      }
      dirMap.push(details);
    }
    return Promise.all(promises).then(() => dirMap);
  });
}
