const { parseString } = require('xml2js');
const axios = require('axios');

const PLEX_DOMAIN = 'https://192.168.1.205:32400';
const PLEX_TOKEN = 'zAws9zrtH3z8H744pJXh';

exports.fetchPlexSections = fetchPlexSections;

exports.refreshPlexSection = refreshPlexSection;

// According to Plex, type can be 'movie' or 'show'
exports.refreshPlexLibraryForType = async function(type) {
  const sections = await fetchPlexSections();
  sections.MediaContainer.Directory.forEach(async section => {
    if (section.type == type) {
      await refreshPlexSection(section.key);
    }
  });
}

async function fetchPlexSections() {
  response = await axios.get(`${PLEX_DOMAIN}/library/sections?X-Plex-Token=${PLEX_TOKEN}`);
  return response.data;
}

async function refreshPlexSection(sectionId) {
  response = await axios.get(`${PLEX_DOMAIN}/library/sections/${sectionId}/refresh?X-Plex-Token=${PLEX_TOKEN}`);
  return response.data;
}
