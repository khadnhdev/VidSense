# AI Video Slideshow

Ứng dụng web tạo trình chiếu từ video sử dụng AI để phân tích nội dung và tạo tường thuật tự động.

## Tính năng

- Trích xuất lời nói từ video (Whisper AI)
- Phân tích nội dung và tạo tường thuật (Gemini AI)
- Tạo trình chiếu tự động với âm thanh và tường thuật
- Giọng đọc tự động cho từng phân đoạn
- Nhạc nền cho trình chiếu

## Cài đặt

1. Clone repository:
   ```
   git clone https://github.com/your-username/video-slideshow-creator.git
   cd video-slideshow-creator
   ```

2. Cài đặt các gói phụ thuộc:
   ```
   npm install
   ```

3. Tạo file `.env` và cấu hình các API key:
   ```
   OPENAI_API_KEY=your_openai_key
   GOOGLE_API_KEY=your_google_key
   ```

4. Tạo các thư mục cần thiết:
   ```
   mkdir -p uploads public/audio public/background
   ```

5. Thêm file nhạc nền (tùy chọn):
   - Đặt file nhạc nền vào thư mục `public/background` với tên `background.mp3`.

## Sử dụng

1. Khởi động server:
   ```
   npm start
   ```

2. Truy cập ứng dụng tại `http://localhost:3000`.

3. Tải lên video và đợi quá trình xử lý hoàn tất.

4. Xem trình chiếu với đầy đủ tính năng.

## Yêu cầu hệ thống

- Node.js 14.x trở lên
- FFmpeg (được cài đặt tự động thông qua ffmpeg-static)
- Kết nối Internet (để sử dụng API của OpenAI và Google)

## Giấy phép

MIT License