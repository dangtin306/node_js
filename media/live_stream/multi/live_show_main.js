import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cleanupOldFiles, generatePlaylist } from './live_show_process.js';
import get_json_live from './get_json_live.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = 3027;
let liveInfo = await get_json_live();
liveInfo = liveInfo.api_results.mongo_results;
// console.log(liveInfo);
const liveControls = liveInfo.map(info => info.live_control);

function getRandomDelay(min = 100, max = 250) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const server = http.createServer(async (req, res) => {
  await delay(getRandomDelay());
  const urlParts = req.url.split('/');
  const streamName = urlParts[1];

  if (liveControls.includes(streamName) && req.url === `/${streamName}/playlist.m3u8`) {
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
  } else if (liveControls.includes(streamName) && req.url.endsWith('.aac')) {
    const safeUrl = req.url.slice(streamName.length + 2);
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
  liveControls.forEach(control => {
    console.log(`http://localhost:${port}/${control}/playlist.m3u8`);
  });

  // Chạy cleanup định kỳ cho từng stream
  liveControls.forEach(control => {
    const outputDir = path.join(__dirname, 'aac_output', control);
    setInterval(() => {
      cleanupOldFiles(outputDir);
    }, 10000); // cleanup mỗi 10 giây
  });
});
