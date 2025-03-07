const videoModel = require('../models/videoModel');
const videoProcessingService = require('../services/videoProcessingService');
const path = require('path');
const { getStatusText, formatTime } = require('../utils/helpers');

exports.getHomePage = (req, res) => {
  res.render('index');
};

exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('Không có file được tải lên');
    }

    const videoId = req.videoId;
    const title = req.body.title || path.parse(req.file.originalname).name;
    const filename = req.file.filename;

    // Lưu thông tin video vào database
    await videoModel.saveVideo(videoId, title, filename);

    // Bắt đầu xử lý video (không đồng bộ)
    videoProcessingService.processVideo(videoId, path.join(__dirname, '..', 'uploads', filename))
      .catch(err => console.error('Lỗi khi xử lý video:', err));

    // Chuyển hướng đến trang processing
    res.redirect(`/processing/${videoId}`);
  } catch (error) {
    console.error('Lỗi khi upload video:', error);
    res.status(500).send('Đã xảy ra lỗi khi xử lý video');
  }
};

exports.getProcessingPage = async (req, res) => {
  try {
    const videoId = req.params.id;
    const video = await videoModel.getVideoById(videoId);
    
    if (!video) {
      return res.status(404).send('Không tìm thấy video');
    }
    
    res.render('processing', { video, getStatusText });
  } catch (error) {
    console.error('Lỗi khi lấy trang xử lý:', error);
    res.status(500).send('Đã xảy ra lỗi khi lấy trang xử lý');
  }
};

exports.getResultPage = async (req, res) => {
  try {
    const videoId = req.params.id;
    const video = await videoModel.getVideoById(videoId);
    
    if (!video) {
      return res.status(404).send('Không tìm thấy video');
    }
    
    if (video.status !== 'completed') {
      return res.redirect(`/processing/${videoId}`);
    }
    
    res.render('result', { video, formatTime });
  } catch (error) {
    console.error('Lỗi khi lấy trang kết quả:', error);
    res.status(500).send('Đã xảy ra lỗi khi lấy trang kết quả');
  }
};

exports.getVideoStatus = async (req, res) => {
  try {
    const videoId = req.params.id;
    const video = await videoModel.getVideoById(videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Không tìm thấy video' });
    }
    
    res.json({ status: video.status });
  } catch (error) {
    console.error('Lỗi khi lấy trạng thái video:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy trạng thái video' });
  }
}; 