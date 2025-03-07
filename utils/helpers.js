exports.getStatusText = (status) => {
  switch(status) {
    case 'processing': return 'Đang chuẩn bị';
    case 'transcribing': return 'Đang trích xuất lời nói';
    case 'extracting_frames': return 'Đang trích xuất khung hình';
    case 'describing_frames': return 'Đang mô tả khung hình';
    case 'generating_narrative': return 'Đang tạo bản tường thuật';
    case 'completed': return 'Đã hoàn tất';
    case 'error': return 'Lỗi';
    default: return status;
  }
};

exports.formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}; 