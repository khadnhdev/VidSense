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
    11. MỖI ĐOẠN tường thuật cho mỗi khung hình chỉ nên có 20-30 từ, có thể đọc trong khoảng 10 giây. Đây là yêu cầu RẤT QUAN TRỌNG để đảm bảo đồng bộ với tốc độ trình chiếu.
    11. QUAN TRỌNG: KHÔNG bắt đầu bản tường thuật với các câu kiểu như "Được thôi, đây là bản tường thuật dựa trên thông tin bạn cung cấp" hoặc "Đây là bản tường thuật câu chuyện" hay bất kỳ lời giới thiệu tương tự. Hãy bắt đầu trực tiếp vào nội dung câu chuyện.
    `;
    
    const result = await model.generateContent(promptText);
    const response = await result.response;
    console.log('[Gemini] ✓ Đã tạo bản tường thuật thành công');
    
    // Loại bỏ các câu mở đầu không cần thiết
    let narrativeText = response.text();
    
    // Các mẫu câu mở đầu thường gặp cần loại bỏ
    const introPatterns = [
      /^Được thôi,?\s+đây là bản tường thuật.*?\.\s*/i,
      /^Dưới đây là bản tường thuật.*?\.\s*/i,
      /^Đây là bản tường thuật.*?\.\s*/i,
      /^Sau đây là câu chuyện.*?\.\s*/i,
      /^Dựa trên thông tin bạn cung cấp.*?\.\s*/i,
      /^Xin chào,?\s+dưới đây là bản tường thuật.*?\.\s*/i
    ];
    
    // Loại bỏ các câu mở đầu
    for (const pattern of introPatterns) {
      narrativeText = narrativeText.replace(pattern, '');
    }
    
    // Kiểm tra và điều chỉnh độ dài của từng đoạn
    // Thêm logic để tách các đoạn và đảm bảo mỗi đoạn đủ ngắn để đọc trong 10 giây
    const paragraphs = narrativeText.split('\n\n').filter(p => p.trim() !== '');
    
    // Kiểm tra nếu số đoạn quá ít so với số khung hình
    if (paragraphs.length < frameDescriptions.length) {
      console.log('[Gemini] Cảnh báo: Số đoạn tường thuật (' + paragraphs.length + 
                  ') ít hơn số khung hình (' + frameDescriptions.length + ')');
    }
    
    // Tính toán số từ trung bình trong mỗi đoạn
    const wordCounts = paragraphs.map(p => p.split(/\s+/).length);
    const avgWordCount = wordCounts.reduce((sum, count) => sum + count, 0) / wordCounts.length;
    
    console.log('[Gemini] Số từ trung bình mỗi đoạn:', Math.round(avgWordCount));
    
    // Cảnh báo nếu đoạn quá dài để đọc trong 10 giây (giả sử tốc độ đọc ~ 3 từ/giây)
    if (avgWordCount > 35) {
      console.log('[Gemini] Cảnh báo: Đoạn tường thuật có thể quá dài để đọc trong 10 giây');
    }
    
    console.log('[Gemini] Đã xử lý và làm sạch bản tường thuật');
    return narrativeText;
  } catch (error) {
    console.error('[Gemini] ❌ Lỗi khi tạo bản tường thuật:', error);
    throw error;
  }
}

module.exports = {
  generateNarrative
}; 