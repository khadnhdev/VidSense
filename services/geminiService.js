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
    
    Dựa trên những thông tin này, hãy tạo một bản tường thuật như thể bạn đang kể một câu chuyện cho người nghe. Hãy tưởng tượng mỗi khung hình là một phần minh họa trong câu chuyện của bạn.
    
    Hướng dẫn cụ thể:
    1. Kể câu chuyện với phong cách hấp dẫn, dưới góc nhìn người thứ ba
    2. Đặt tên cho các nhân vật xuất hiện (nếu họ không được đề cập tên trong bản ghi âm)
    3. Phân chia câu chuyện thành các đoạn tương ứng với các khung hình chính
    4. Kết hợp những gì nhân vật nói (từ transcript) và những gì nhìn thấy (từ mô tả khung hình)
    5. Tạo một cốt truyện mạch lạc liên kết tất cả các khung hình
    6. Độ dài bản tường thuật phải tương ứng với độ dài của video, đảm bảo có đủ nội dung để đọc trong khi trình chiếu tất cả các khung hình
    7. Bản tường thuật cần ngắn gọn, mang tính tóm tắt
    8. KHÔNG dẫn lại lời thoại trực tiếp, chỉ sử dụng lời thoại để hiểu ngữ cảnh và tóm tắt ý chính
    9. Tập trung vào hành động và diễn biến quan trọng, bỏ qua chi tiết không cần thiết
    10. Giọng điệu tường thuật cần sinh động nhưng súc tích
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