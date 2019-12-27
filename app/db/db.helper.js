const Database = require('sqlite-async');
const { merge } = require('lodash');

// Using user_version to determine if/what migrations are needed from array
const MIGRATIONS = [
  // SCHEMA 1
  [
    `
      CREATE TABLE local_shows (
        name TEXT,
        token TEXT,
        size INTEGER,
        created_at INTEGER
      )
    `,
    `
      CREATE TABLE local_seasons (
        name TEXT,
        token text,
        size INTEGER,
        show_token TEXT,
        created_at INTEGER
      )
    `,
    `
      CREATE TABLE local_episodes (
        name TEXT,
        token text,
        size INTEGER,
        season_token TEXT,
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
      CREATE TABLE remote_shows (
        name TEXT,
        token TEXT,
        size INTEGER,
        status TEXT,
        created_at INTEGER
      )
    `,
    `
      CREATE TABLE remote_seasons (
        name TEXT,
        token text,
        size INTEGER,
        status TEXT,
        show_token TEXT,
        created_at INTEGER
      )
    `,
    `
      CREATE TABLE remote_episodes (
        name TEXT,
        token text,
        size INTEGER,
        status TEXT,
        season_token TEXT,
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
      CREATE TABLE pending_content_requests (
        name TEXT,
        type TEXT,
        token TEXT,
        last_event TEXT,
        size INTEGER,
        created_at INTEGER
      )
    `,
    // This whole Plex sync is pretty hacky, including the schema.
    //
    // Feels wrong to record a token like this in the db but should
    // be safe enough for now since the library is only accessible inside
    // the local network.
    //
    // Plex doesn't give a great way of obtaining a token outside of inspecting
    // requests from the UI or asking the User to authenticate. Will have to
    // investigate other solutions to make this suck less. Or at the very least,
    // salt/hash the token in the db to just feel less icky.
    `
      CREATE TABLE plex_configs (
        hostname TEXT,
        port INTEGER,
        token TEXT,
        movies_section_id INTEGER,
        tv_shows_section_id INTEGER,
        created_at INTEGER
      )
    `,
    `
      CREATE TABLE manager_configs (
        hostname TEXT,
        client_id TEXT,
        client_secret TEXT,
        created_at INTEGER
      )
    `,
  ]
];

exports.database = database;

exports.runMigrations = async function() {
  let queries = [];
  const db = await database();
  const { user_version } = await db.get('PRAGMA user_version');
  return db.transaction(tx => {
    if (user_version < MIGRATIONS.length) {
      for (var i = user_version; i < MIGRATIONS.length; i++) {
        MIGRATIONS[i].forEach(migration => {
          queries.push(tx.run(migration));
        });
      }
      queries.push(tx.run(`PRAGMA user_version = ${MIGRATIONS.length}`));
      // queries.push(tx.run('PRAGMA journal_mode = WAL'));
    }
    return Promise.all(queries);
  });
}

exports.findOrCreate = async function(tableName, values) {
  const db = await database();
  let query = `SELECT *, ROWID FROM ${tableName} WHERE ${parameterizedWhere(values)}`;

  const existingRecord = await db.get(query);
  if (existingRecord) {
    return;
  };

  await db.run(insertQuery(tableName, merge(values, { created_at: Date.now() })));
}

exports.createOrUpdate = async function(tableName, values, selector) {
  const db = await database();
  let query = `SELECT *, ROWID FROM ${tableName} WHERE ${parameterizedWhere(selector)}`;

  const existingRecord = await db.get(query);
  if (existingRecord) {
    let requiresUpdate = false;
    for (const [key, value] of Object.entries(values)) {
      if (existingRecord[key] !== value) {
        requiresUpdate = true;
        break;
      }
    }

    if (requiresUpdate) {
      await db.run(updateQuery(tableName, values));
    }
  } else {
    // Merge selector values back into insert values:
    values = merge(values, selector);
    await db.run(insertQuery(tableName, merge(values, { created_at: Date.now() })));
  }
}


exports.updateQuery = updateQuery;

exports.insertQuery = insertQuery;

exports.sanitizedQueryValues = sanitizedQueryValues;

let db;
async function database() {
  if (db) { return db; }
  try {
    db = await Database.open('./app/db/app.db');
    await db.run('PRAGMA journal_mode = WAL');
    return db;
  } catch (err) {
    throw Error('Unable to initialize db... ' + err);
  }
}

function insertQuery(tableName, values) {
  return `
    INSERT INTO ${tableName} ( ${Object.keys(values).toString()} )
    VALUES ( ${sanitizedQueryValues(...Object.values(values))} );
  `;
}

function updateQuery(tableName, values) {
  let query = `UPDATE ${tableName} SET `;
  for (const [key, value] of Object.entries(values)) {
    query += `${key} = ${sanitizedQueryValues(value)}, `
  }
  // Remove trailing ', '
  return query.slice(0, -2);
}

function parameterizedWhere(values) {
  let query = '';
  for (const [key, value] of Object.entries(values)) {
    query += `${key} = ${sanitizedQueryValues(value)} AND `
  }
  // Chop off trailing 'AND `
  return query.slice(0, -4);
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
