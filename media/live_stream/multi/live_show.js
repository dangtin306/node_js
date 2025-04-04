import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = 3027;

// Hàm tạo độ trễ ngẫu nhiên
function getRandomDelay(min = 100, max = 250) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Hàm xử lý tạo playlist dựa trên thư mục output được truyền vào
function generatePlaylist(outputDir, callback) {
  fs.readdir(outputDir, (err, files) => {
    if (err) {
      callback(err);
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
      callback(new Error('Not enough segments available'));
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
    callback(null, playlist);
  });
}

// Tạo server HTTP
const server = http.createServer(async (req, res) => {
  await delay(getRandomDelay());

  // Xác định luồng dựa trên URL, ví dụ: /live_1/playlist.m3u8 hoặc /live_2/playlist.m3u8
  const urlParts = req.url.split('/');
  // urlParts[0] sẽ là chuỗi rỗng vì url bắt đầu bằng '/'
  const streamName = urlParts[1]; // live_1 hoặc live_2

  if ((req.url === `/${streamName}/playlist.m3u8`) && (streamName === 'live_1' || streamName === 'live_2')) {
    await delay(getRandomDelay());
    const outputDir = path.join(__dirname, 'aac_output', streamName);
    generatePlaylist(outputDir, (err, playlist) => {
      if (err) {
        res.writeHead(404);
        res.end(err.message);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/vnd.apple.mpegurl' });
      res.end(playlist);
    });
  } 
  // Xử lý các file .aac theo đường dẫn: /live_1/xxx.aac hoặc /live_2/xxx.aac
  else if ((streamName === 'live_1' || streamName === 'live_2') && req.url.endsWith('.aac')) {
    await delay(getRandomDelay());
    // Loại bỏ tiền tố "/live_1/" hoặc "/live_2/" để lấy tên file
    const safeUrl = req.url.slice(streamName.length + 2); // +2: dấu '/' sau streamName
    const outputDir = path.join(__dirname, 'aac_output', streamName);
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
  // Các yêu cầu khác trả về lỗi 404
  else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Khởi động server HTTP
server.listen(port, () => {
  console.log(`Live AAC streams available at:`);
  console.log(`http://localhost:${port}/live_1/playlist.m3u8`);
  console.log(`http://localhost:${port}/live_2/playlist.m3u8`);
});
