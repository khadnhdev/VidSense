const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'videos.db');
const db = new sqlite3.Database(dbPath);

function initDb() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        title TEXT,
        filename TEXT,
        status TEXT DEFAULT 'processing',
        transcript TEXT,
        frame_descriptions TEXT,
        narrative TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });
  
  console.log('Database initialized');
}

module.exports = {
  db,
  initDb
}; 