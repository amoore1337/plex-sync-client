const { database, insertQuery, updateQuery } = require('../db/db.helper');
const axios = require('axios');
const logger = require('winston');

let PLEX_CLIENT;

exports.savePlexConfig = async function (hostname, token) {
  let db;
  try {
    const existingConfig = await getPlexConfig();

    db = await database();
    if (existingConfig) {
      await db.run(
        updateQuery(
          'plex_configs',
          {
            hostname,
            token,
            created_at: Date.now(),
          }
        ) + ` WHERE hostname = "${existingConfig.hostname}"`
      );
    } else {
      await db.run(insertQuery('plex_configs', {
        hostname,
        port: 32400,
        token,
        created_at: Date.now(),
      }));
    }

  } catch (error) {
    logger.error(error);
  }
}

exports.getPlexDomain = async function () {
  const client = await getPlexConfig();

  return client.hostname;
}

exports.getPlexConfig = getPlexConfig;

exports.fetchPlexSections = fetchPlexSections;

exports.refreshPlexSection = refreshPlexSection;

// According to Plex, type can be 'movie' or 'show'
exports.refreshPlexLibraryForType = async function (type) {
  const sections = await fetchPlexSections();
  sections.MediaContainer.Directory.forEach(async section => {
    if (section.type == type) {
      await refreshPlexSection(section.key);
    }
  });
}

async function fetchPlexSections() {
  try {
    const plexClient = await getPlexConfig();
    response = await axios.get(`${plexClient.hostname}/library/sections?X-Plex-Token=${plexClient.token}`);
    return response.data;
  } catch (error) {
    logger.error(error);
  }
}

async function refreshPlexSection(sectionId) {
  try {
    const plexClient = await getPlexConfig();
    response = await axios.get(`${plexClient.hostname}/library/sections/${sectionId}/refresh?X-Plex-Token=${plexClient.token}`);
    return response.data;
  } catch (error) {
    logger.error(error);
  }
}

async function getPlexConfig() {
  if (PLEX_CLIENT) { return PLEX_CLIENT; }

  let db;
  try {
    db = await database();
    // There should only be a single manager config:
    return await db.get('SELECT * FROM plex_configs');
  } catch (error) {
    logger.error(error)
  }
}
