import express from 'express';
import fs from 'fs';
import http from 'http';
import https from 'https';
import main_process from "./main_process.js";
import cors from "cors";
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

// Tạo __dirname cho ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đảm bảo thư mục uploads tồn tại (sử dụng đường dẫn tuyệt đối)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình HTTPS với chứng chỉ và khóa riêng (nếu có)
const httpsOptions = {
    protocol: 'https'
};
const httpOptions = {
    protocol: 'http'
};

const app = express();

app.use(cors());
app.use(express.json({ limit: '100mb' }));

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

// Route upload file
app.post('/main_2/audio/files/upload_files', upload.single('audio'), (req, res) => {
    console.log('req.file:', req.file);
    console.log('req.body:', req.body);
    res.json({ message: 'Upload thành công' });
});

// Route chính (ví dụ)
app.get('/', (req, res) => {
    const currentProtocol = req.secure ? 'https' : 'http';
    res.send(`Hello, you're using ${currentProtocol}!\n`);
});

// Middleware catch-all: nếu không match route cụ thể, gọi main_process
app.use((req, res, next) => {
    if (req.url === '/favicon.ico') {
        return res.sendStatus(204);
    }
    main_process(req, res);
});

// Khởi tạo server HTTP
const httpServer = http.createServer(httpOptions, app);
// Khởi tạo server HTTPS
const httpsServer = https.createServer(httpsOptions, app);

httpServer.listen(2999, () => {
    console.log('HTTP server listening on port 2999');
});

httpsServer.listen(2998, () => {
    console.log('HTTPS server listening on port 2998');
});
