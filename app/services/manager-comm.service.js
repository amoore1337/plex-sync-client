const axios = require('axios');

const MANAGER_DOMAIN = 'https://192.168.1.205:1338';
// const MANAGER_DOMAIN = 'https://localhost:1338';

exports.getAvailableShows = function () {
  return axios.get(`${MANAGER_DOMAIN}/api/shows`).then(res => res.data);
}

exports.fetchAvailableMovies = function () {
  return axios.get(`${MANAGER_DOMAIN}/api/movies`).then(res => res.data);
}
