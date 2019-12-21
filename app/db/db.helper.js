const Database = require('sqlite-async');
const { merge } = require('lodash');

// Using user_version to determine if/what migrations are needed from array
const MIGRATIONS = [
  // SCHEMA 1
  [
    `
      CREATE TABLE local_tv_shows (
        name TEXT,
        token TEXT,
        size INTEGER,
        created_at INTEGER
      )
    `,
    `
      CREATE TABLE local_tv_show_seasons (
        name TEXT,
        token text,
        size INTEGER,
        local_tv_show_id INTEGER,
        created_at INTEGER
      )
    `,
    `
      CREATE TABLE local_tv_show_episodes (
        name TEXT,
        token text,
        size INTEGER,
        local_tv_show_season_id INTEGER,
        created_at INTEGER
      )
    `,
    `
      CREATE TABLE local_movies (
        name TEXT,
        token TEXT,
        size INTEGER,
        created_at INTEGER
      )
    `,
    `
      CREATE TABLE remote_tv_shows (
        name TEXT,
        token TEXT,
        size INTEGER,
        status TEXT,
        created_at INTEGER
      )
    `,
    `
      CREATE TABLE remote_tv_show_seasons (
        name TEXT,
        token text,
        size INTEGER,
        status TEXT,
        remote_tv_show_id INTEGER,
        created_at INTEGER
      )
    `,
    `
      CREATE TABLE remote_tv_show_episodes (
        name TEXT,
        token text,
        size INTEGER,
        status TEXT,
        remote_tv_show_season_id INTEGER,
        created_at INTEGER
      )
    `,
    `
      CREATE TABLE remote_movies (
        name TEXT,
        token TEXT,
        size INTEGER,
        status TEXT,
        created_at INTEGER
      )
    `,
    `
      CREATE TABLE pending_download_requests (
        name TEXT,
        type TEXT,
        token TEXT,
        last_event TEXT,
        size INTEGER,
        created_at INTEGER
      )
    `,
  ]
];

exports.dbConnection = async function() {
  try {
    const db = await Database.open('./app/db/app.db');
    return db;
  } catch (err) {
    throw Error('Unable to initialize db... ' + err);
  }
}

exports.dbClose = async function(db) {
  if (!db) { return; }
  try {
    await db.close()
    db = null;
  } catch (error) {
    throw Error('Unable to close db... ' + err);
  }
}

exports.runMigrations = async function(db) {
  let queries = [];
  const { user_version } = await db.get('PRAGMA user_version');
  return db.transaction(tx => {
    if (user_version < MIGRATIONS.length) {
      for (var i = user_version; i < MIGRATIONS.length; i++) {
        MIGRATIONS[i].forEach(migration => {
          queries.push(tx.run(migration));
        });
      }
      queries.push(tx.run(`PRAGMA user_version = ${MIGRATIONS.length}`));
      queries.push(tx.run('PRAGMA journal_mode = WAL'));
    }
    return Promise.all(queries);
  });
}

exports.findOrCreate = async function(db, tableName, values) {
  let query = `SELECT *, ROWID FROM ${tableName} WHERE `;
  for (const [key, value] of Object.entries(values)) {
    query += `${key} = ${sanitizedQueryValues(value)} AND `
  }

  const existingRecord = await db.get(query.slice(0, -4));
  if (existingRecord) {
    return;
  };

  await db.run(insertQuery(tableName, merge(values, { created_at: Date.now() })));
}


exports.updateQuery = function(tableName, values) {
  let query = `UPDATE ${tableName} SET `;
  for (const [key, value] of Object.entries(values)) {
    query += `${key} = ${sanitizedQueryValues(value)}, `
  }
  // Remove trailing ', '
  return query.slice(0, -2);

}

exports.insertQuery = insertQuery

exports.sanitizedQueryValues = sanitizedQueryValues;

function insertQuery(tableName, values) {
  return `
    INSERT INTO ${tableName} ( ${Object.keys(values).toString()} )
    VALUES ( ${sanitizedQueryValues(...Object.values(values))} );
  `;
}

function sanitizedQueryValues() {
  let sanitizedValues = '';
  [].forEach.call(arguments, value => {
    // TODO: Find sanitize library and add here.
    if (typeof value === 'string') {
      sanitizedValues += `"${value}",` // Need to wrap strings in "" for query
    } else {
      sanitizedValues += `${value.toString()},`
    }
  });
  // Remote empty and trailing ','
  return sanitizedValues.replace(/(^[,\s]+)|([,\s]+$)/g, '');
}
