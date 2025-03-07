const OpenAI = require('openai');
const fs = require('fs');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function describeImage(imagePath) {
  try {
    console.log('[Vision] Đang mô tả hình ảnh...');
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');
    
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Mô tả chi tiết về nội dung của hình ảnh này." },
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

module.exports = {
  describeImage
}; 