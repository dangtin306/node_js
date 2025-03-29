import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

// Tính __dirname khi dùng ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đầu vào mặc định
let inputUrl = 'https://voa-ingest.akamaized.net/hls/live/2035200/161_352R/playlist.m3u8';

// Thư mục lưu file AAC
const outputDir = path.join(__dirname, 'aac_output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
} else {
  fs.readdirSync(outputDir).forEach(file => fs.unlinkSync(path.join(outputDir, file)));
}

const port = 3027;

// Biến lưu FFmpeg process
let ffmpegProcess = null;

// Khởi động FFmpeg với URL đầu vào
function startFFmpeg() {
  if (ffmpegProcess) {
    ffmpegProcess.kill(); // Dừng FFmpeg cũ nếu đang chạy
  }
  ffmpegProcess = spawn('ffmpeg', [
    '-re',                            // Phát thời gian thực
    '-stream_loop', '-1',             // Lặp vô hạn
    '-i', inputUrl,                   // URL đầu vào
    '-vn',                            // Bỏ video
    '-c:a', 'aac',                    // Codec AAC
    '-af', 'volume=1',                // Điều chỉnh âm lượng
    '-b:a', '64k',                    // Bitrate âm thanh
    '-f', 'segment',                  // Chia thành segments
    '-segment_time', '4',             // Mỗi segment 4 giây
    '-segment_format', 'adts',        // Định dạng AAC
    path.join(outputDir, 'segment_%d.aac')
  ]);

  ffmpegProcess.stderr.on('data', (data) => {
    console.error(`FFmpeg error: ${data}`);
  });

  ffmpegProcess.on('close', (code) => {
    console.log(`FFmpeg exited with code ${code}`);
  });
}

// Chạy FFmpeg lần đầu
startFFmpeg();

// Tạo server HTTP
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Hỗ trợ CORS

  if (req.url === '/playlist.m3u8') {
    fs.readdir(outputDir, (err, files) => {
      if (err) {
        res.writeHead(500);
        res.end('Server error');
        return;
      }
      let segments = files.filter(file => file.endsWith('.aac')).sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)[0], 10);
        const numB = parseInt(b.match(/\d+/)[0], 10);
        return numA - numB;
      });
      if (segments.length < 5) {
        res.writeHead(404);
        res.end('Not enough segments');
        return;
      }
      segments = segments.slice(-4); // Lấy 4 segment cuối
      const sequence = parseInt(segments[0].match(/\d+/)[0], 10);
      let playlist = '#EXTM3U\n';
      playlist += '#EXT-X-VERSION:3\n';
      playlist += '#EXT-X-TARGETDURATION:4\n';
      playlist += `#EXT-X-MEDIA-SEQUENCE:${sequence}\n`;
      segments.forEach(segment => {
        playlist += `#EXTINF:4.000,\n${segment}\n`;
      });
      res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl' });
      res.end(playlist);
    });
  } else if (req.url.endsWith('.aac')) {
    const filePath = path.join(outputDir, req.url.slice(1));
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'audio/aac' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  }
});

// Tích hợp Socket.IO để chuyển luồng
const io = new Server(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('Đã kết nối Socket.IO');
  socket.on('updatelive', (jsonData) => {
    const linkLiveValue = jsonData.linklive;
    if (!isNaN(linkLiveValue)) {
      // Cập nhật inputUrl dựa trên linklive
      if (linkLiveValue == 1) inputUrl = 'http://127.0.0.1:8000/huyenkyanh';
      else if (linkLiveValue == 2) inputUrl = 'http://truyenthanh.vov.link:8000/1C9DC294F850';
      else if (linkLiveValue == 3) inputUrl = 'http://icecast.vov.link:8000/08D1F999EED0';
      else if (linkLiveValue == 4) inputUrl = 'http://icecast.vov.link:8000/48E729B55BEC';
      
      startFFmpeg(); // Khởi động lại FFmpeg với luồng mới
      console.log(`Đã chuyển sang luồng: ${inputUrl}`);
    }
  });
  socket.on('disconnect', () => {
    console.log('Đã ngắt kết nối Socket.IO');
  });
});

// Khởi động server
server.listen(port, () => {
  console.log(`Server chạy tại http://localhost:${port}/playlist.m3u8`);
});