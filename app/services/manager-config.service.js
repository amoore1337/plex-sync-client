const { database, insertQuery, updateQuery } = require('../db/db.helper');

let MANAGER_CLIENT;

exports.saveManagerConfig = async function (hostname, clientId, clientSecret) {
  let db;
  try {
    const existingConfig = await getManagerConfig();

    db = await database();
    if (existingConfig) {
      await db.run(
        updateQuery(
          'manager_configs',
          {
            hostname,
            client_id: clientId,
            client_secret: clientSecret,
            created_at: Date.now(),
          }
        ) + ` WHERE client_id = "${existingConfig.client_id}"`
      );
    } else {
      await db.run(insertQuery('manager_configs', {
        hostname,
        client_id: clientId,
        client_secret: clientSecret,
        created_at: Date.now(),
      }));
    }

  } catch (error) {
    console.error(error);
  }
}

exports.getManagerDomain = async function() {
  const client = await getManagerConfig();

  return client.hostname;
}

exports.getManagerConfig = getManagerConfig;

async function getManagerConfig() {
  if (MANAGER_CLIENT) { return MANAGER_CLIENT; }

  let db;
  try {
    db = await database();
    // There should only be a single manager config:
    return await db.get('SELECT * FROM manager_configs');
  } catch (error) {
    console.error(error)
  }
}
