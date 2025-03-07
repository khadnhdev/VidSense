const OpenAI = require('openai');
const fs = require('fs');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function transcribeVideo(videoPath) {
  try {
    console.log('[Whisper] Bắt đầu trích xuất lời nói...');
    const audioFile = fs.createReadStream(videoPath);
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: process.env.OPENAI_WHISPER_MODEL,
      response_format: "verbose_json",
      timestamp_granularities: ["segment"]
    });
    
    console.log('[Whisper] ✓ Đã trích xuất lời nói thành công');
    console.log(`[Whisper] Số đoạn văn bản: ${transcription.segments.length}`);
    return transcription;
  } catch (error) {
    console.error('[Whisper] ❌ Lỗi khi trích xuất lời nói:', error);
    throw error;
  }
}

module.exports = {
  transcribeVideo
}; 