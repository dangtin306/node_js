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
async function cleanupOldSegments() {
  try {
    // Đọc danh sách file trong thư mục output
    const files = await fs.promises.readdir(outputDir);
    let segments = files.filter(file => file.endsWith('.aac')).sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0], 10);
      const numB = parseInt(b.match(/\d+/)[0], 10);
      return numA - numB;
    });

    // Lọc các file có kích thước > 4096 byte
    const validSegments = [];
    for (const segment of segments) {
      const filePath = path.join(outputDir, segment);
      try {
        const stats = await fs.promises.stat(filePath);
        if (stats.size > 4096) {
          validSegments.push(segment);
        }
      } catch (err) {
        console.error(`Error getting stats for file ${filePath}:`, err);
      }
    }

    // Nếu số file hợp lệ vượt quá 20, xóa những file cũ hơn
    if (validSegments.length > 20) {
      const deleteSegments = validSegments.slice(0, validSegments.length - 20);
      for (const segment of deleteSegments) {
        const filePath = path.join(outputDir, segment);
        try {
          await fs.promises.unlink(filePath);
          // console.log(`Deleted old file ${filePath}`);
        } catch (err) {
          console.error(`Error deleting file ${filePath}:`, err);
        }
      }
    }
  } catch (err) {
    console.error("Error cleaning up segments:", err);
  }
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

      // Sử dụng try/catch để tránh lỗi nếu file không tồn tại
      segments = segments.filter(segment => {
        const filePath = path.join(outputDir, segment);
        try {
          const stats = fs.statSync(filePath);
          return stats.size > 4096;
        } catch (err) {
          console.error(`Error accessing file ${filePath}:`, err);
          return false;
        }
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
