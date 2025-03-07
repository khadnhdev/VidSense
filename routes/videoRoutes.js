const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const videoController = require('../controllers/videoController');

// Cấu hình multer để lưu trữ video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const videoId = uuidv4();
    req.videoId = videoId;
    const ext = path.extname(file.originalname);
    cb(null, `${videoId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /mp4|mov|avi|mkv/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Chỉ chấp nhận file video!'));
  }
});

// Routes
router.get('/', videoController.getHomePage);
router.post('/upload', upload.single('video'), videoController.uploadVideo);
router.get('/processing/:id', videoController.getProcessingPage);
router.get('/result/:id', videoController.getResultPage);
router.get('/status/:id', videoController.getVideoStatus);

module.exports = router; 