const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const path = require('path');
const fs = require('fs').promises;
const { mkdir, unlink } = require('fs').promises;
const whisperService = require('./whisperService');
const openaiService = require('./openaiService');
const geminiService = require('./geminiService');
const videoModel = require('../models/videoModel');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

console.log('FFmpeg path:', ffmpegPath);
console.log('FFprobe path:', ffprobePath);

async function processVideo(videoId, videoPath) {
  try {
    console.log(`\n[Video ${videoId}] Bắt đầu xử lý video...`);
    console.log(`[Video ${videoId}] File path: ${videoPath}`);

    // Cập nhật trạng thái
    await videoModel.updateVideoStatus(videoId, 'transcribing');
    console.log(`\n[Video ${videoId}] Bước 1: Đang trích xuất lời nói...`);
    
    // Bước 1: Transcribe video
    const transcript = await whisperService.transcribeVideo(videoPath);
    await videoModel.updateVideoTranscript(videoId, transcript);
    console.log(`[Video ${videoId}] ✓ Đã trích xuất lời nói thành công`);
    
    // Cập nhật trạng thái
    await videoModel.updateVideoStatus(videoId, 'extracting_frames');
    console.log(`\n[Video ${videoId}] Bước 2: Đang trích xuất khung hình...`);
    
    // Bước 2: Trích xuất các khung hình
    const framesDir = path.join(__dirname, '..', 'uploads', `frames_${videoId}`);
    await mkdir(framesDir, { recursive: true });
    
    const duration = await getVideoDuration(videoPath);
    console.log(`[Video ${videoId}] Thời lượng video: ${duration}s`);
    await extractFrames(videoPath, framesDir, duration);
    
    // Cập nhật trạng thái
    await videoModel.updateVideoStatus(videoId, 'describing_frames');
    console.log(`\n[Video ${videoId}] Bước 3: Đang mô tả các khung hình...`);
    
    // Bước 3: Mô tả các khung hình
    const frameDescriptions = await describeFrames(framesDir);
    await videoModel.updateVideoFrameDescriptions(videoId, frameDescriptions);
    console.log(`[Video ${videoId}] ✓ Đã mô tả ${frameDescriptions.length} khung hình`);
    
    // Cập nhật trạng thái
    await videoModel.updateVideoStatus(videoId, 'generating_narrative');
    console.log(`\n[Video ${videoId}] Bước 4: Đang tạo bản tường thuật...`);
    
    // Bước 4: Tạo bản tường thuật
    const narrative = await geminiService.generateNarrative(transcript, frameDescriptions);
    await videoModel.updateVideoNarrative(videoId, narrative);
    console.log(`[Video ${videoId}] ✓ Đã tạo bản tường thuật thành công`);
    
    // Dọn dẹp
    await cleanup(framesDir);
    console.log(`\n[Video ${videoId}] ✓ Hoàn tất xử lý video`);
    
  } catch (error) {
    console.error(`\n[Video ${videoId}] ❌ Lỗi khi xử lý video:`, error);
    await videoModel.updateVideoStatus(videoId, 'error');
  }
}

async function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
}

async function extractFrames(videoPath, outputDir, duration) {
  const frameInterval = parseInt(process.env.FRAME_INTERVAL);
  const frameCount = Math.floor(duration / frameInterval);
  
  console.log(`[Frames] Bắt đầu trích xuất ${frameCount + 1} khung hình...`);
  
  for (let i = 0; i <= frameCount; i++) {
    const timeInSeconds = i * frameInterval;
    console.log(`[Frames] Đang trích xuất khung hình tại ${timeInSeconds}s...`);
    
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timeInSeconds],
          filename: `frame_${timeInSeconds}.jpg`,
          folder: outputDir,
          size: process.env.FRAME_SIZE
        })
        .on('end', resolve)
        .on('error', reject);
    });
  }
  
  console.log(`[Frames] ✓ Đã trích xuất xong ${frameCount + 1} khung hình`);
}

async function describeFrames(framesDir) {
  const files = await fs.readdir(framesDir);
  const frameFiles = files.filter(file => file.startsWith('frame_') && file.endsWith('.jpg'));
  
  console.log(`[Descriptions] Bắt đầu mô tả ${frameFiles.length} khung hình...`);
  
  const descriptions = [];
  
  for (const file of frameFiles) {
    const filePath = path.join(framesDir, file);
    const timeMatch = file.match(/frame_(\d+)\.jpg/);
    const timeInSeconds = timeMatch ? parseInt(timeMatch[1]) : 0;
    
    console.log(`[Descriptions] Đang mô tả khung hình tại ${timeInSeconds}s...`);
    const description = await openaiService.describeImage(filePath);
    
    descriptions.push({
      time: timeInSeconds,
      description
    });
  }
  
  // Sắp xếp theo thời gian
  descriptions.sort((a, b) => a.time - b.time);
  console.log(`[Descriptions] ✓ Đã mô tả xong ${descriptions.length} khung hình`);
  
  return descriptions;
}

async function cleanup(framesDir) {
  try {
    const files = await fs.readdir(framesDir);
    for (const file of files) {
      await unlink(path.join(framesDir, file));
    }
    await fs.rmdir(framesDir);
    console.log(`Đã dọn dẹp thư mục ${framesDir}`);
  } catch (error) {
    console.error('Lỗi khi dọn dẹp:', error);
  }
}

module.exports = {
  processVideo
}; 