import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cleanupOldFiles, generatePlaylist } from './live_show_process.js';
import get_json_live from './get_json_live.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = 3027;

// Lấy dữ liệu liveInfo từ get_json_live
let liveInfo = await get_json_live();
liveInfo = liveInfo.api_results.mongo_results;

// Tạo mapping từ device_id sang live_control
const deviceIdToLiveControl = {};
liveInfo.forEach(info => {
  deviceIdToLiveControl[info.device_id] = info.live_control;
});

// Lấy danh sách device_id để kiểm tra URL
const deviceIds = Object.keys(deviceIdToLiveControl);

function getRandomDelay(min = 100, max = 250) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const server = http.createServer(async (req, res) => {
  await delay(getRandomDelay());
  const urlParts = req.url.split('/');

  // Kiểm tra định dạng URL: /live/{device_id}/...
  if (urlParts[1] !== 'live' || urlParts.length < 3) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const deviceId = urlParts[2]; // Lấy device_id từ URL

  // Kiểm tra xem device_id có hợp lệ không
  if (!deviceIds.includes(deviceId)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  // Ánh xạ device_id về live_control
  const streamName = deviceIdToLiveControl[deviceId];

  // Xử lý yêu cầu playlist.m3u8
  if (req.url === `/live/${deviceId}/playlist.m3u8`) {
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
  // Xử lý yêu cầu file .aac
  else if (req.url.startsWith(`/live/${deviceId}/`) && req.url.endsWith('.aac')) {
    const safeUrl = req.url.slice(`/live/${deviceId}/`.length);
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
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(port, () => {
  console.log(`Live AAC streams available at:`);
  deviceIds.forEach(deviceId => {
    console.log(`http://localhost:${port}/live/${deviceId}/playlist.m3u8`);
  });

  // Chạy cleanup định kỳ cho từng stream
  liveInfo.forEach(info => {
    const outputDir = path.join(__dirname, 'aac_output', info.live_control);
    setInterval(() => {
      cleanupOldFiles(outputDir);
    }, 10000); // Cleanup mỗi 10 giây
  });
});