const { OpenAI } = require('openai');
const fs = require('fs');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function describeImage(imagePath, context = {}) {
  try {
    console.log('[Vision] Đang mô tả hình ảnh...');
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');
    
    // Xây dựng prompt dựa trên ngữ cảnh
    let promptText = "Mô tả chi tiết về nội dung của hình ảnh này.";
    
    if (context.timeInSeconds !== undefined) {
      promptText += ` Đây là khung hình tại thời điểm ${context.timeInSeconds} giây của video.`;
    }
    
    if (context.relevantTranscript) {
      promptText += ` Lời nói liên quan đến thời điểm này là: "${context.relevantTranscript}"`;
    }
    
    if (context.previousDescriptions && context.previousDescriptions.length > 0) {
      // Chỉ sử dụng 2 mô tả gần nhất để tránh prompt quá dài
      const recentDescriptions = context.previousDescriptions.slice(-2);
      promptText += ` Các khung hình trước đây đã được mô tả như sau: `;
      recentDescriptions.forEach(desc => {
        promptText += `Tại ${desc.time}s: "${desc.description.slice(0, 100)}..." `;
      });
    }
    
    promptText += " Hãy mô tả chi tiết về cảnh vật, con người, hành động và các thay đổi so với khung hình trước đó nếu có.";
    
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: parseInt(process.env.OPENAI_VISION_MAX_TOKENS)
    });
    
    console.log('[Vision] ✓ Đã mô tả hình ảnh thành công');
    return response.choices[0].message.content;
  } catch (error) {
    console.error('[Vision] ❌ Lỗi khi mô tả hình ảnh:', error);
    throw error;
  }
}

// Hàm chuyển đổi văn bản thành giọng nói
async function textToSpeech(text, voice = 'nova') {
  try {
    console.log('[OpenAI TTS] Đang chuyển đổi văn bản thành giọng nói...');
    console.log(`[OpenAI TTS] Giọng đọc: ${voice}, Độ dài văn bản: ${text.length} ký tự`);
    
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,  // 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
      input: text,
    });
    
    // Chuyển đổi ReadableStream thành Buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());
    console.log('[OpenAI TTS] ✓ Đã chuyển đổi thành công');
    
    return buffer;
  } catch (error) {
    console.error('[OpenAI TTS] ❌ Lỗi khi chuyển đổi văn bản thành giọng nói:', error);
    throw error;
  }
}

module.exports = {
  describeImage,
  textToSpeech
}; 