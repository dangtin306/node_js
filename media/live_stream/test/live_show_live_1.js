import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = 3027;
const outputDir = path.join(__dirname, 'aac_output', 'live_1'); // Đổi sang thư mục live_1

// Hàm tạo độ trễ ngẫu nhiên
function getRandomDelay(min = 100, max = 250) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Tạo server HTTP
const server = http.createServer(async (req, res) => {
  await delay(getRandomDelay());

  if (req.url === '/playlist.m3u8') {
    await delay(getRandomDelay());
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
      segments = segments.filter(segment => {
        const filePath = path.join(outputDir, segment);
        const stats = fs.statSync(filePath);
        return stats.size > 4096;
      });
      if (segments.length < 3) {
        res.writeHead(404);
        res.end('Not enough segments available');
        return;
      }
      segments = segments.slice(-5);
      const targetDuration = 3;
      const match = segments[0].match(/(\d+)/);
      const sequence = match ? parseInt(match[1], 10) : 0;

      let playlist = '#EXTM3U\n';
      playlist += '#EXT-X-VERSION:3\n';
      playlist += `#EXT-X-TARGETDURATION:${targetDuration}\n`;
      playlist += `#EXT-X-MEDIA-SEQUENCE:${sequence}\n`;
      segments.forEach(segment => {
        playlist += `#EXTINF:3.000,\n${segment}\n`;
      });

      res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl' });
      res.end(playlist);
    });
  } else if (req.url.endsWith('.aac')) {
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

// Khởi động server HTTP
server.listen(port, () => {
  console.log(`Live AAC stream available at http://localhost:${port}/playlist.m3u8`);
});