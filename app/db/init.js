const Database = require('sqlite-async');

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
        size INTEGER,
        created_at INTEGER
      )
    `,
  ]
];

let db;
async function initDb() {
  if (db) { return db }
  console.log('db connection does not exist, opening...');

  try {
    db = await Database.open('./app/db/app.db');
    await runMigrations(db);
    return db;
  } catch (err) {
    throw Error('Unable to initialize db...' + err);
  }
}

async function runMigrations(db) {
  let queries = [];
  const { user_version } = await db.get('PRAGMA user_version');
  return db.transaction(tx => {
    if (user_version < MIGRATIONS.length) {
      for (var i = user_version; i < MIGRATIONS.length; i++) {
        MIGRATIONS[i].forEach(migration => {
          queries.push(tx.run(migration));
        });
      }
      queries.push(tx.run(`PRAGMA user_version = ${MIGRATIONS.length}`))
    }
    return Promise.all(queries);
  });
}

module.exports = initDb();
