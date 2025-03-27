import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Tính __dirname khi dùng ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đầu vào là URL của m3u8
const inputUrl = 'https://voa-ingest.akamaized.net/hls/live/2035200/161_352R/playlist.m3u8';

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

// FFmpeg: sử dụng segment muxer để tạo file segments ADTS (.aac)
// Cập nhật: segment_time = 4 giây, volume = 0.12
const ffmpeg = spawn('ffmpeg', [
  '-re',                            // Phát theo thời gian thực
  '-stream_loop', '-1',             // Lặp vô hạn
  '-i', inputUrl,                   // Đầu vào là URL m3u8
  '-vn',                            // Bỏ qua video
  '-c:a', 'aac',                    // Sử dụng codec AAC
  '-af', 'volume=1',             // Giảm âm lượng xuống 0.12
  '-b:a', '64k',                    // Bitrate
  '-fflags', '+genpts',             // Tạo PTS nếu chưa có
  '-avoid_negative_ts', 'make_zero',// Tránh timestamp âm
  '-f', 'segment',                  // Sử dụng segment muxer
  '-segment_time', '4',             // Mỗi segment dài 4 giây
  '-segment_format', 'adts',        // Định dạng ADTS (raw AAC)
  path.join(outputDir, 'segment_%d.aac')
]);

ffmpeg.stderr.on('data', (data) => {
  console.error(`FFmpeg error: ${data}`);
});

ffmpeg.on('close', (code) => {
  console.log(`FFmpeg exited with code ${code}`);
});

// Hàm tạo delay ngẫu nhiên từ 75 đến 150ms
function getRandomDelay(min = 100, max = 150) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// HTTP server sử dụng async để chờ delay
const server = http.createServer(async (req, res) => {
  // Delay đầu tiên: chờ 75-150ms
  await delay(getRandomDelay());
  
  if (req.url === '/playlist.m3u8') {
    // Delay thứ hai: chờ 75-150ms nữa trước khi xử lý playlist
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
  
      // Lọc bỏ các file nhỏ (<1KB)
      segments = segments.filter(segment => {
        const filePath = path.join(outputDir, segment);
        const stats = fs.statSync(filePath);
        return stats.size > 1024;
      });
  
      // Nếu số file .aac sau khi lọc ít hơn 5 thì trả về lỗi
      if (segments.length < 5) {
        res.writeHead(404);
        res.end('Not enough segments available');
        return;
      }
  
      // Giữ lại tối đa 4 segment mới nhất
      if (segments.length > 4) {
        segments = segments.slice(-4);
      }
  
      // Vì mỗi segment dài 4 giây
      const targetDuration = 4;
      const match = segments[0].match(/(\d+)/);
      const sequence = match ? parseInt(match[1], 10) : 0;
  
      let playlist = '#EXTM3U\n';
      playlist += '#EXT-X-ALLOW-CACHE:NO\n';
      playlist += '#EXT-X-VERSION:3\n';
      playlist += `#EXT-X-TARGETDURATION:${targetDuration}\n`;
      playlist += `#EXT-X-MEDIA-SEQUENCE:${sequence}\n`;
      segments.forEach(segment => {
        playlist += `#EXTINF:4.000,\n`;
        playlist += segment + '\n';
      });
  
      res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl' });
      res.end(playlist);
    });
  } else {
    // Delay cho file .aac endpoint
    await delay(getRandomDelay());
    // Phục vụ file .aac với header Content-Length
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

server.listen(port, () => {
  console.log(`Live AAC stream available at http://localhost:${port}/playlist.m3u8`);
});
