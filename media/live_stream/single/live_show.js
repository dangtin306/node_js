import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = 3027;
const outputDir = path.join(__dirname, 'aac_output');

// Hàm tạo độ trễ ngẫu nhiên
function getRandomDelay(min = 100, max = 250) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Hàm dọn dẹp các file .aac cũ, chỉ giữ lại 20 file mới nhất
function cleanupOldSegments() {
  fs.readdir(outputDir, (err, files) => {
    if (err) {
      console.error("Error reading directory:", err);
      return;
    }
    let segments = files.filter(file => file.endsWith('.aac')).sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0], 10);
      const numB = parseInt(b.match(/\d+/)[0], 10);
      return numA - numB;
    });

    // Lọc các file có kích thước > 4096 byte
    segments = segments.filter(segment => {
      const filePath = path.join(outputDir, segment);
      try {
        const stats = fs.statSync(filePath);
        return stats.size > 4096;
      } catch (err) {
        console.error(err);
        return false;
      }
    });

    if (segments.length > 20) {
      const deleteSegments = segments.slice(0, segments.length - 20);
      deleteSegments.forEach(segment => {
        const filePath = path.join(outputDir, segment);
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(`Error deleting file ${filePath}:`, err);
          } else {
            console.log(`Deleted old file ${filePath}`);
          }
        });
      });
    }
  });
}

// Chạy cleanupOldSegments mỗi 10 giây
setInterval(cleanupOldSegments, 10000);

// Tạo server HTTP
const server = http.createServer(async (req, res) => {
  await delay(getRandomDelay());

  // Cho phép tất cả CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Xử lý preflight request
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/playlist.m3u8') {
    await delay(getRandomDelay());
    fs.readdir(outputDir, (err, files) => {
      if (err) {
        res.writeHead(500, { 'Access-Control-Allow-Origin': '*' });
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
        res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
        res.end('Not enough segments available');
        return;
      }

      // Lấy 5 file .aac mới nhất để tạo playlist
      const keepSegments = segments.slice(-5);
      const targetDuration = 3;
      const match = keepSegments[0].match(/(\d+)/);
      const sequence = match ? parseInt(match[1], 10) : 0;

      let playlist = '#EXTM3U\n';
      playlist += '#EXT-X-VERSION:3\n';
      playlist += `#EXT-X-TARGETDURATION:${targetDuration}\n`;
      playlist += `#EXT-X-MEDIA-SEQUENCE:${sequence}\n`;
      keepSegments.forEach(segment => {
        playlist += `#EXTINF:3.000,\n${segment}\n`;
      });

      res.writeHead(200, { 
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*' 
      });
      res.end(playlist);
    });
  } else if (req.url.endsWith('.aac')) {
    await delay(getRandomDelay());
    const safeUrl = req.url.startsWith('/') ? req.url.slice(1) : req.url;
    const filePath = path.join(outputDir, safeUrl);
    fs.stat(filePath, (err, stats) => {
      if (err) {
        res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
        res.end('Not Found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'audio/aac',
        'Content-Length': stats.size,
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
    });
  }
});

// Khởi động server HTTP
server.listen(port, () => {
  console.log(`Live AAC stream available at http://localhost:${port}/playlist.m3u8`);
});
