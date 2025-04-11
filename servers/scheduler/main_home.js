import express from 'express';
import fs from 'fs';
import http from 'http';
import https from 'https';
import main_process from "./main_process.js";
import cors from "cors";
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { upload_files_audio } from '../../media/audio/upload_file.js';

// Tạo __dirname cho ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

httpServer.listen(1884, () => {
    console.log('HTTP server listening on port 1884');
});

httpsServer.listen(1885, () => {
    console.log('HTTPS server listening on port 1885');
});
