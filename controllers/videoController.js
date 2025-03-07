const fs = require('fs').promises;
const fsSync = require('fs');
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

exports.getSlideshowPage = async (req, res) => {
  try {
    const videoId = req.params.id;
    const video = await videoModel.getVideoById(videoId);
    
    if (!video) {
      return res.status(404).send('Không tìm thấy video');
    }
    
    if (video.status !== 'completed') {
      return res.redirect(`/processing/${videoId}`);
    }
    
    // Đảm bảo thư mục frames tồn tại
    await prepareFrameDirectory(videoId, video);
    
    res.render('slideshow', { video, videoId, formatTime });
  } catch (error) {
    console.error('Lỗi khi lấy trang trình chiếu:', error);
    res.status(500).send('Đã xảy ra lỗi khi tạo trang trình chiếu');
  }
};

exports.getFrameImage = async (req, res) => {
  try {
    const { videoId, frameTime } = req.params;
    const framesDir = path.join(__dirname, '..', 'uploads', `slideframes_${videoId}`);
    const framePath = path.join(framesDir, `frame_${frameTime}.jpg`);
    
    // Kiểm tra file tồn tại
    try {
      await fs.access(framePath);
    } catch (error) {
      return res.status(404).send('Không tìm thấy hình ảnh');
    }
    
    // Gửi file
    res.sendFile(framePath);
  } catch (error) {
    console.error('Lỗi khi lấy hình ảnh frame:', error);
    res.status(500).send('Đã xảy ra lỗi khi lấy hình ảnh');
  }
};

// Hàm đảm bảo thư mục frames tồn tại và có đầy đủ ảnh
async function prepareFrameDirectory(videoId, video) {
  try {
    const framesDir = path.join(__dirname, '..', 'uploads', `slideframes_${videoId}`);
    
    console.log(`[Slideshow] Chuẩn bị frames cho video ${videoId} tại ${framesDir}`);
    
    // Tạo thư mục nếu chưa tồn tại
    try {
      await fs.mkdir(framesDir, { recursive: true });
      console.log(`[Slideshow] Đã tạo thư mục ${framesDir}`);
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    // Kiểm tra xem đã có frames chưa
    const files = await fs.readdir(framesDir);
    console.log(`[Slideshow] Thư mục có ${files.length} files`);
    if (files.length > 0) {
      console.log(`[Slideshow] Đã có frames, không cần tạo lại`);
      return; // Đã có frames, không cần tạo lại
    }
    
    // Lấy mô tả frame từ database
    let frameDescriptions;
    try {
      frameDescriptions = JSON.parse(video.frame_descriptions);
    } catch (e) {
      frameDescriptions = [];
      console.error('Lỗi khi phân tích frame_descriptions:', e);
    }
    
    if (frameDescriptions.length === 0) {
      throw new Error('Không có frame descriptions');
    }
    
    // Nếu frames đã được trích xuất trong quá trình xử lý video, chúng có thể đã bị xóa
    // Ta cần tạo lại frames từ video gốc
    const videoPath = path.join(__dirname, '..', 'uploads', video.filename);
    
    // Kiểm tra video gốc còn tồn tại không
    if (!fsSync.existsSync(videoPath)) {
      throw new Error('Không tìm thấy file video gốc');
    }
    
    // Trích xuất lại frames từ video gốc
    console.log(`[Slideshow] Đang trích xuất frames cho video ${videoId}`);
    
    for (const frame of frameDescriptions) {
      const timeInSeconds = frame.time;
      const outputPath = path.join(framesDir, `frame_${timeInSeconds}.jpg`);
      
      // Bỏ qua nếu file đã tồn tại
      if (fsSync.existsSync(outputPath)) continue;
      
      // Trích xuất frame tại thời điểm cụ thể
      await new Promise((resolve, reject) => {
        const ffmpeg = require('fluent-ffmpeg');
        ffmpeg(videoPath)
          .seekInput(timeInSeconds)
          .outputOptions(['-vframes 1', '-q:v 1'])
          .output(outputPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
      
      console.log(`[Slideshow] Đã trích xuất frame tại ${timeInSeconds}s`);
    }
    
    console.log(`[Slideshow] Đã trích xuất xong tất cả frames cho video ${videoId}`);
  } catch (error) {
    console.error(`[Slideshow] Lỗi khi chuẩn bị frames:`, error);
    throw error;
  }
} 