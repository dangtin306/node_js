import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let inputUrl = 'https://str.vov.gov.vn/vovlive/vov1vov5Vietnamese.sdp_aac/playlist.m3u8';
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
let globalSegmentNumber = 0;
let switchSegmentNumber = null;

function updateGlobalSegmentNumber() {
  const files = fs.readdirSync(outputDir).filter(file => file.startsWith('segment_') && file.endsWith('.aac'));
  let max = globalSegmentNumber;
  for (let file of files) {
    let match = file.match(/segment_(\d+)\.aac/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > max) {
        max = num;
      }
    }
  }
  globalSegmentNumber = max + 1;
}

async function startFFmpeg() {
  if (ffmpegProcess) {
    console.log(`Killing previous ffmpegProcess (PID: ${ffmpegProcess.pid})`);
    // Kill toàn bộ process group bằng cách sử dụng số âm của PID
    try {
      // ffmpegProcess.kill();
      exec(`taskkill /F /PID ${ffmpegProcess.pid} /T`, (err, stdout, stderr) => {
        if (err) {
          console.error(`Lỗi khi kill ffmpegProcess: ${err}`);
        } else {
          console.log(`ffmpegProcess đã được kill: ${stdout}`);
        }
        // Sau khi taskkill chạy xong, ta có thể chờ sự kiện close nếu cần
        ffmpegProcess.once('close', () => {
          console.log('FFmpeg process has been closed');
        });
      });
    } catch (e) {
      console.error(`Lỗi khi kill ffmpegProcess: ${e}`);
    }
    await new Promise(resolve => {
      ffmpegProcess.once('close', () => {
        console.log('FFmpeg process has been closed');
        resolve();
      });
    });
  }
  updateGlobalSegmentNumber();
  let startNumber = globalSegmentNumber;
  console.log(`Khởi động FFmpeg với đầu vào: ${inputUrl} (bắt đầu từ số ${startNumber})`);

  // Spawn ffmpeg với option detached: true để tạo process group riêng
  ffmpegProcess = spawn('ffmpeg', [
    '-re',
    '-stream_loop', '-1',
    '-i', inputUrl,
    '-vn',
    '-c:a', 'aac',
    '-af', 'volume=0.12',
    '-b:a', '64k',
    '-fflags', '+genpts',
    '-copyts',
    '-avoid_negative_ts', 'make_zero',
    '-reset_timestamps', '1',
    '-force_key_frames', 'expr:gte(t,n_forced*3)',
    '-f', 'segment',
    '-segment_time', '3',
    '-segment_time_delta', '0.3',
    '-segment_format', 'aac',
    '-segment_start_number', `${startNumber}`,
    path.join(outputDir, 'segment_%d.aac')
  ]);
  

  // Cho phép ffmpeg chạy độc lập khỏi tiến trình cha
  // ffmpegProcess.unref();

  ffmpegProcess.stderr.on('data', (data) => {
    console.error(`FFmpeg error: ${data}`);
  });

  ffmpegProcess.on('close', (code) => {
    console.log(`FFmpeg exited with code ${code}`);
  });
}

startFFmpeg();

function getRandomDelay(min = 100, max = 250) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
      if (segments.length < 6) {
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
        const segmentNumber = parseInt(segment.match(/\d+/)[0], 10);
        if (switchSegmentNumber && segmentNumber === switchSegmentNumber) {
          playlist += '#EXT-X-DISCONTINUITY\n';
        }
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

const io = new Server(server, { cors: { origin: '*' } });
io.on('connection', (socket) => {
  console.log('Đã kết nối Socket.IO');
  socket.on('updatelive', async (jsonData) => {
    const linkLiveValue = jsonData.linklive;
    if (!isNaN(linkLiveValue)) {
      if (linkLiveValue == 1)
        inputUrl = 'https://str.vov.gov.vn/vovlive/vov1vov5Vietnamese.sdp_aac/playlist.m3u8';
      else if (linkLiveValue == 2)
        inputUrl = 'https://live.mediatech.vn/live/2859591eef2e92249b682db021f4247c364/playlist.m3u8';
      else if (linkLiveValue == 3)
        inputUrl = 'http://icecast.vov.link:8000/08D1F999EED0';
      else if (linkLiveValue == 4)
        inputUrl = 'http://icecast.vov.link:8000/48E729B55BEC';

      console.log(`Đã chuyển sang luồng: ${inputUrl}`);
      switchSegmentNumber = globalSegmentNumber;
      await startFFmpeg();
    }
  });
  socket.on('disconnect', () => {
    console.log('Đã ngắt kết nối Socket.IO');
  });
});

server.listen(port, () => {
  console.log(`Live AAC stream available at http://localhost:${port}/playlist.m3u8`);
});
