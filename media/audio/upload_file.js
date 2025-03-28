import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

// Tạo __dirname cho ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đảm bảo thư mục uploads tồn tại (sử dụng đường dẫn tuyệt đối)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const random10Digits = () => {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
};

// Cấu hình storage với multer: lưu file với tên cố định "upload.mp3"
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'upload.mp3');
  }
});

// Cấu hình multer với giới hạn file 100MB
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// Hàm upload_files_audio để gọi middleware upload.single('audio') thủ công
export const upload_files_audio = (req, res) => {
  upload.single('audio')(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ message: 'Upload thất bại', error: err.message });
    }
    // Sau khi upload thành công, tạo JSON trả về
    const file_name = random10Digits();
    const src = `https://node_js.hust.media/play_audio_upload?ver=${file_name}`;
    const json = {
      src: src,
      file_name: file_name
    };
    // Gửi phản hồi JSON về client
    return res.json(json);
  });
};
