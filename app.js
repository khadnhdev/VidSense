require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const { initDb } = require('./database');
const videoRoutes = require('./routes/videoRoutes');
const videoController = require('./controllers/videoController');

// Thiết lập multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueId = require('uuid').v4();
    req.videoId = uniqueId;
    const extension = path.extname(file.originalname);
    cb(null, uniqueId + extension);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 500 // 500MB
  },
  fileFilter: function (req, file, cb) {
    // Chỉ chấp nhận video
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('Chỉ được tải lên file video'));
    }
    cb(null, true);
  }
});

const app = express();
const PORT = process.env.PORT || 3000;

// Thiết lập view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Khởi tạo database
initDb();

// Routes
app.use('/', videoRoutes);
app.get('/', videoController.getHomePage);
app.post('/upload', upload.single('video'), videoController.uploadVideo);
app.get('/processing/:id', videoController.getProcessingPage);
app.get('/result/:id', videoController.getResultPage);
app.get('/api/status/:id', videoController.getVideoStatus);
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Thiếu văn bản để chuyển đổi' });
    }
    
    // Giới hạn độ dài văn bản để tránh lỗi
    const truncatedText = text.length > 4096 ? text.substring(0, 4096) : text;
    
    const openaiService = require('./services/openaiService');
    const audioBuffer = await openaiService.textToSpeech(truncatedText, voice);
    
    // Gửi audio dưới dạng response
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length
    });
    
    res.send(audioBuffer);
  } catch (error) {
    console.error('Lỗi khi chuyển đổi TTS:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi chuyển đổi văn bản thành giọng nói' });
  }
});
app.get('/videos', async (req, res) => {
  try {
    const videos = await require('./models/videoModel').getAllVideos();
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/slideshow/:id', videoController.getSlideshowPage);
app.get('/slideshow/', (req, res) => {
  res.redirect('/'); // Chuyển hướng về trang chủ
});
app.get('/frames/:videoId/:frameTime.jpg', videoController.getFrameImage);

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
}); 