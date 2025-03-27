import express from 'express';
import fs from 'fs';
import http from 'http';
import https from 'https';
import main_process from "./main_process.js";
import cors from "cors";

// Cấu hình HTTPS với chứng chỉ và khóa riêng
const httpsOptions = {
    //   key: fs.readFileSync('path/to/private.key'),
    //   cert: fs.readFileSync('path/to/certificate.crt')
    protocol: 'https'
};
const httpOptions = {
    //   key: fs.readFileSync('path/to/private.key'),
    //   cert: fs.readFileSync('path/to/certificate.crt')
    protocol: 'http'
};

// Khởi tạo ứng dụng Express
const app = express();

app.use(cors()); // Tự động thêm CORS vào tất cả API
// Middleware để phân tích cú pháp JSON
app.use(express.json({ limit: '100mb' })); // You can adjust the limit as needed
// Middleware xử lý favicon
app.use((req, res) => {
    if (req.url === '/favicon.ico') {
        res.sendStatus(204); // Bỏ qua favicon
    } else {
        const currentProtocol = req.secure ? 'https' : 'http'; // Kiểm tra giao thức
        // console.log(`Hello, you're using ${currentProtocol}!\n`);
        server(req, res);  // Call the server function here
    }
});

// // Route chính
// app.get('/', (req, res) => {
//     const currentProtocol = req.secure ? 'https' : 'http'; // Kiểm tra giao thức
//     res.send(`Hello, you're using ${currentProtocol}!\n`);
// });

// Khởi tạo server HTTP
const httpServer = http.createServer(httpOptions, app);

// Khởi tạo server HTTPS
const httpsServer = https.createServer(httpsOptions, app);

// Lắng nghe HTTP trên cổng 2999 và HTTPS trên cổng 2998
httpServer.listen(2999, () => {
    console.log('HTTP server listening on port 2999');
});

httpsServer.listen(2998, () => {
    console.log('HTTPS server listening on port 2998');
});

// Hàm xử lý request riêng
const server = (req, res) => {
    main_process(req, res);
};