import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

// Tính __dirname khi dùng ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đầu vào mặc định là URL của m3u8
let inputUrl = 'https://str.vov.gov.vn/vovlive/vov1vov5Vietnamese.sdp_aac/playlist.m3u8';

// Thư mục output cho các segments .aac
const outputDir = path.join(__dirname, 'aac_output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
} else {
  fs.readdirSync(outputDir).forEach(file => {
    fs.unlinkSync(path.join(outputDir, file));
  });
}

const port = 3027;
let ffmpegProcess = null;

// Hàm khởi động (hoặc khởi động lại) ffmpeg với đầu vào hiện tại
function startFFmpeg() {
  // Nếu có tiến trình ffmpeg đang chạy thì kill nó
  if (ffmpegProcess) {
    ffmpegProcess.kill();
  }
  console.log(`Khởi động ffmpeg với đầu vào: ${inputUrl}`);
  ffmpegProcess = spawn('ffmpeg', [
    '-re',                            // Phát theo thời gian thực
    '-stream_loop', '-1',             // Lặp vô hạn
    '-i', inputUrl,                   // URL đầu vào (có thể thay đổi)
    '-vn',                            // Bỏ qua video
    '-c:a', 'aac',                    // Sử dụng codec AAC
    '-af', 'volume=0.7',             // Giảm âm lượng xuống (0.15)
    '-b:a', '64k',                    // Bitrate
    '-fflags', '+genpts',             // Tạo PTS nếu chưa có
    '-avoid_negative_ts', 'make_zero',// Tránh timestamp âm
    '-f', 'segment',                  // Sử dụng segment muxer
    '-segment_time', '3',             // Mỗi segment dài 3 giây
    '-segment_format', 'adts',        // Định dạng ADTS (raw AAC)
    path.join(outputDir, 'segment_%d.aac')
  ]);

  ffmpegProcess.stderr.on('data', (data) => {
    console.error(`FFmpeg error: ${data}`);
  });

  ffmpegProcess.on('close', (code) => {
    console.log(`FFmpeg exited with code ${code}`);
  });
}

// Khởi chạy ffmpeg lần đầu
startFFmpeg();

// Hàm tạo delay ngẫu nhiên (trong khoảng 150-350ms)
function getRandomDelay(min = 150, max = 350) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// HTTP server sử dụng async để chờ delay trước khi xử lý request
const server = http.createServer(async (req, res) => {
  // Delay đầu tiên: chờ 150-350ms
  await delay(getRandomDelay());
  
  if (req.url === '/playlist.m3u8') {
    // Delay thứ hai: chờ 150-350ms nữa trước khi xử lý playlist
    await delay(getRandomDelay());
    
    fs.readdir(outputDir, (err, files) => {
      if (err) {
        res.writeHead(500);
        res.end('Server error');
        return;
      }
      // Lọc các file .aac và sắp xếp theo thứ tự tăng dần (dựa vào số trong tên file)
      let segments = files.filter(file => file.endsWith('.aac')).sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)[0], 10);
        const numB = parseInt(b.match(/\d+/)[0], 10);
        return numA - numB;
      });
  
      // Lọc bỏ các file nhỏ (<4KB)
      segments = segments.filter(segment => {
        const filePath = path.join(outputDir, segment);
        const stats = fs.statSync(filePath);
        return stats.size > 4096; // 4KB
      });
  
      // Nếu số file .aac sau khi lọc ít hơn 6 thì trả về lỗi
      if (segments.length < 6) {
        res.writeHead(404);
        res.end('Not enough segments available');
        return;
      }
  
      // Giữ lại tối đa 5 segment mới nhất
      if (segments.length > 5) {
        segments = segments.slice(-5);
      }
  
      // Vì mỗi segment dài 3 giây, EXTINF cố định là 3.000
      const targetDuration = 3;
      const match = segments[0].match(/(\d+)/);
      const sequence = match ? parseInt(match[1], 10) : 0;
  
      let playlist = '#EXTM3U\n';
      playlist += '#EXT-X-ALLOW-CACHE:NO\n';
      playlist += '#EXT-X-VERSION:3\n';
      playlist += `#EXT-X-TARGETDURATION:${targetDuration}\n`;
      playlist += `#EXT-X-MEDIA-SEQUENCE:${sequence}\n`;
      segments.forEach(segment => {
        playlist += `#EXTINF:3.000,\n`;
        playlist += segment + '\n';
      });
  
      res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl' });
      res.end(playlist);
    });
  } else if (req.url.endsWith('.aac')) {
    // Delay cho file .aac endpoint
    await delay(getRandomDelay());
    const safeUrl = req.url.startsWith('/') ? req.url.slice(1) : req.url;
    const filePath = path.join(outputDir, safeUrl);
    fs.stat(filePath, (err, stats) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 
        'Content-Type': 'audio/aac',
        'Content-Length': stats.size
      });
      fs.createReadStream(filePath).pipe(res);
    });
  }
});

// Tích hợp Socket.IO để chuyển đổi đầu vào (input stream)
const io = new Server(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('Đã kết nối Socket.IO');
  socket.on('updatelive', (jsonData) => {
    const linkLiveValue = jsonData.linklive;
    if (!isNaN(linkLiveValue)) {
      // Cập nhật inputUrl dựa trên giá trị linklive
      if (linkLiveValue == 1) inputUrl = 'http://127.0.0.1:8000/huyenkyanh';
      else if (linkLiveValue == 2) inputUrl = 'https://live.mediatech.vn/live/2859591eef2e92249b682db021f4247c364/playlist.m3u8';
      else if (linkLiveValue == 3) inputUrl = 'http://icecast.vov.link:8000/08D1F999EED0';
      else if (linkLiveValue == 4) inputUrl = 'http://icecast.vov.link:8000/48E729B55BEC';
      
      console.log(`Đã chuyển sang luồng: ${inputUrl}`);
      startFFmpeg(); // Khởi động lại ffmpeg với đầu vào mới
    }
  });
  socket.on('disconnect', () => {
    console.log('Đã ngắt kết nối Socket.IO');
  });
});

// Khởi động server HTTP
server.listen(port, () => {
  console.log(`Live AAC stream available at http://localhost:${port}/playlist.m3u8`);
});
