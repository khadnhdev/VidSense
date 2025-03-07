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
    const frameFiles = await extractFrames(videoPath, framesDir, duration);
    
    // Cập nhật trạng thái
    await videoModel.updateVideoStatus(videoId, 'describing_frames');
    console.log(`\n[Video ${videoId}] Bước 3: Đang mô tả các khung hình...`);
    
    // Bước 3: Mô tả các khung hình
    const frameDescriptions = await describeFrames(framesDir, frameFiles, transcript);
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
      console.log('[Duration] Metadata:', metadata.format);
      resolve(metadata.format.duration);
    });
  });
}

async function extractFrames(videoPath, outputDir, duration) {
  const frameInterval = parseInt(process.env.FRAME_INTERVAL);
  const frameCount = Math.floor(duration / frameInterval);
  
  console.log(`[Frames] Bắt đầu trích xuất ${frameCount + 1} khung hình...`);
  console.log(`[Frames] Duration: ${duration}s, Interval: ${frameInterval}s`);
  console.log(`[Frames] Output directory: ${outputDir}`);
  
  // Sử dụng phương pháp thumbnail (phương pháp 4) làm phương pháp chính
  try {
    console.log('[Frames] Trích xuất frames bằng thumbnail method...');
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          count: frameCount + 1,
          folder: outputDir,
          filename: 'thumbnail-%i.jpg',
          size: process.env.FRAME_SIZE
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    // Đổi tên từ thumbnail-X thành frame_Y
    const files = await fs.readdir(outputDir);
    const thumbnailFiles = files.filter(file => file.startsWith('thumbnail-') && file.endsWith('.jpg'));
    console.log('[Frames] Files được tạo:', thumbnailFiles.length);
    console.log('[Frames] Danh sách files:', thumbnailFiles);
    
    // Đổi tên các files
    const frameFiles = [];
    for (const file of thumbnailFiles) {
      const match = file.match(/thumbnail-(\d+)\.jpg/);
      if (match) {
        const index = parseInt(match[1]) - 1;
        const timeInSeconds = index * frameInterval;
        const newName = `frame_${timeInSeconds}.jpg`;
        await fs.rename(
          path.join(outputDir, file),
          path.join(outputDir, newName)
        );
        frameFiles.push(newName);
      }
    }
    
    // Kiểm tra lại sau khi đổi tên
    const renamedFiles = await fs.readdir(outputDir);
    console.log('[Frames] Files sau khi đổi tên:', renamedFiles);
    console.log(`[Frames] ✓ Đã trích xuất xong ${frameFiles.length}/${frameCount + 1} khung hình`);
    
    if (frameFiles.length === 0) {
      throw new Error('Không thể trích xuất bất kỳ khung hình nào');
    }
    
    return frameFiles;
  } catch (error) {
    console.error('[Frames] Lỗi khi trích xuất khung hình:', error);
    
    // Phương pháp dự phòng nếu thumbnails không hoạt động
    try {
      console.log('[Frames] Đang thử trích xuất từng khung hình riêng biệt...');
      const extractedFrames = [];
      
      for (let i = 0; i <= frameCount; i++) {
        const timeInSeconds = i * frameInterval;
        console.log(`[Frames] Đang trích xuất khung hình tại ${timeInSeconds}s...`);
        
        await new Promise((resolve, reject) => {
          ffmpeg(videoPath)
            .seekInput(timeInSeconds)
            .outputOptions(['-vframes 1', '-q:v 1'])
            .output(path.join(outputDir, `frame_${timeInSeconds}.jpg`))
            .on('end', resolve)
            .on('error', reject)
            .run();
        });
        
        extractedFrames.push(`frame_${timeInSeconds}.jpg`);
      }
      
      console.log(`[Frames] ✓ Đã trích xuất xong ${extractedFrames.length} khung hình`);
      return extractedFrames;
    } catch (finalError) {
      console.error('[Frames] Tất cả các phương pháp đều thất bại:', finalError);
      return [];
    }
  }
}

async function describeFrames(framesDir, frameFiles, transcript) {
  console.log(`[Descriptions] Bắt đầu mô tả ${frameFiles.length} khung hình...`);
  console.log(`[Descriptions] Danh sách file:`, frameFiles);
  
  const descriptions = [];
  const previousDescriptions = [];
  
  for (const file of frameFiles) {
    const filePath = path.join(framesDir, file);
    const timeMatch = file.match(/frame_(\d+)\.jpg/);
    const timeInSeconds = timeMatch ? parseInt(timeMatch[1]) : 0;
    
    // Tìm lời nói liên quan đến thời điểm hiện tại
    const relevantTranscript = getRelevantTranscript(transcript, timeInSeconds);
    
    console.log(`[Descriptions] Đang mô tả khung hình tại ${timeInSeconds}s...`);
    try {
      const description = await openaiService.describeImage(filePath, {
        timeInSeconds,
        relevantTranscript,
        previousDescriptions: [...previousDescriptions]
      });
      
      const descriptionObj = {
        time: timeInSeconds,
        description
      };
      
      descriptions.push(descriptionObj);
      previousDescriptions.push(descriptionObj);
    } catch (error) {
      console.error(`[Descriptions] Lỗi khi mô tả khung hình ${file}:`, error);
    }
  }
  
  // Sắp xếp theo thời gian
  descriptions.sort((a, b) => a.time - b.time);
  console.log(`[Descriptions] ✓ Đã mô tả xong ${descriptions.length} khung hình`);
  
  return descriptions;
}

// Hàm trích xuất lời nói liên quan đến thời điểm hiện tại
function getRelevantTranscript(transcript, currentTime) {
  try {
    const parsedTranscript = typeof transcript === 'string' ? JSON.parse(transcript) : transcript;
    
    if (!parsedTranscript || !parsedTranscript.segments) {
      return null;
    }
    
    // Tìm các đoạn lời nói trong khoảng thời gian gần thời điểm hiện tại (trước/sau 10 giây)
    const relevantSegments = parsedTranscript.segments.filter(segment => {
      return (segment.start <= currentTime + 10 && segment.end >= currentTime - 10);
    });
    
    return relevantSegments.map(s => s.text).join(' ');
  } catch (error) {
    console.error('[Transcript] Lỗi khi phân tích transcript:', error);
    return null;
  }
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