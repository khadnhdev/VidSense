const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function generateNarrative(transcript, frameDescriptions) {
  try {
    console.log('[Gemini] Bắt đầu tạo bản tường thuật...');
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });
    
    const promptText = `
    Tôi có thông tin về một video, bao gồm bản ghi âm có mốc thời gian và mô tả các khung hình chính được chụp mỗi 10 giây.
    
    Bản ghi âm:
    ${JSON.stringify(transcript, null, 2)}
    
    Mô tả các khung hình:
    ${JSON.stringify(frameDescriptions, null, 2)}
    
    Dựa trên những thông tin này, hãy viết lại một bản mô tả chi tiết về video từ góc nhìn người kể chuyện, theo dòng thời gian.
    Hãy kết hợp cả thông tin từ bản ghi âm và mô tả hình ảnh để tạo ra một bản tường thuật mạch lạc và chi tiết.
    `;
    
    const result = await model.generateContent(promptText);
    const response = await result.response;
    console.log('[Gemini] ✓ Đã tạo bản tường thuật thành công');
    return response.text();
  } catch (error) {
    console.error('[Gemini] ❌ Lỗi khi tạo bản tường thuật:', error);
    throw error;
  }
}

module.exports = {
  generateNarrative
}; 