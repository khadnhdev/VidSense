const { db } = require('../database');

function saveVideo(id, title, filename) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO videos (id, title, filename) VALUES (?, ?, ?)',
      [id, title, filename],
      function(err) {
        if (err) return reject(err);
        resolve(id);
      }
    );
  });
}

function getVideoById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM videos WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function updateVideoStatus(id, status) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE videos SET status = ? WHERE id = ?',
      [status, id],
      function(err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

function updateVideoTranscript(id, transcript) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE videos SET transcript = ? WHERE id = ?',
      [JSON.stringify(transcript), id],
      function(err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

function updateVideoFrameDescriptions(id, descriptions) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE videos SET frame_descriptions = ? WHERE id = ?',
      [JSON.stringify(descriptions), id],
      function(err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

function updateVideoNarrative(id, narrative) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE videos SET narrative = ?, status = "completed" WHERE id = ?',
      [narrative, id],
      function(err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

async function getAllVideos() {
  return await db.all('SELECT * FROM videos ORDER BY created_at DESC');
}

module.exports = {
  saveVideo,
  getVideoById,
  updateVideoStatus,
  updateVideoTranscript,
  updateVideoFrameDescriptions,
  updateVideoNarrative,
  getAllVideos
}; 