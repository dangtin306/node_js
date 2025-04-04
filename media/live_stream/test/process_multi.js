import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Thiết lập đường dẫn file và thư mục
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, 'aac_output');
const live1Dir = path.join(outputDir, 'live_1');
const live2Dir = path.join(outputDir, 'live_2');

// Khởi tạo thư mục đầu ra
[live1Dir, live2Dir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  } else {
    fs.readdirSync(dir).forEach(file => {
      fs.unlinkSync(path.join(dir, file));
    });
  }
});

// Biến trạng thái
let inputUrl1 = 'https://str.vov.gov.vn/vovlive/vov1vov5Vietnamese.sdp_aac/playlist.m3u8'; // Luồng cho live_1
let inputUrl2 = 'https://live.mediatech.vn/live/285bfb777e354ec43038aa68950adbac3a4/playlist.m3u8'; // Luồng cho live_2
let ffmpegProcess1 = null;
let ffmpegProcess2 = null;
let globalSegmentNumber1 = 0;
let globalSegmentNumber2 = 0;

// Cập nhật số thứ tự đoạn toàn cục cho từng luồng
function updateGlobalSegmentNumber(dir, currentNumber) {
  const files = fs.readdirSync(dir).filter(file => file.startsWith('segment_') && file.endsWith('.aac'));
  let max = currentNumber;
  for (let file of files) {
    let match = file.match(/segment_(\d+)\.aac/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > max) {
        max = num;
      }
    }
  }
  return max + 1;
}

// Khởi động FFmpeg cho một luồng
async function startFFmpeg(liveDir, inputUrl, ffmpegProcess, globalSegmentNumber) {
  if (ffmpegProcess) {
    console.log(`Killing previous ffmpegProcess (PID: ${ffmpegProcess.pid})`);
    exec(`taskkill /F /PID ${ffmpegProcess.pid} /T`, (err, stdout, stderr) => {
      if (err) console.error(`Lỗi khi kill: ${err}`);
      else console.log(`FFmpeg đã được kill: ${stdout}`);
    });
    await new Promise(resolve => ffmpegProcess.once('close', resolve));
  }
  let startNumber = updateGlobalSegmentNumber(liveDir, globalSegmentNumber);
  console.log(`Khởi động FFmpeg với đầu vào: ${inputUrl} (bắt đầu từ số ${startNumber})`);

  const newProcess = spawn('ffmpeg', [
    '-re',
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '3',
    '-i', inputUrl,
    '-vn',
    '-c:a', 'aac',
    '-af', 'volume=0.4',
    '-b:a', '64k',
    '-fflags', '+genpts',
    '-avoid_negative_ts', 'make_zero',
    '-reset_timestamps', '1',
    '-force_key_frames', 'expr:gte(t,n_forced*3)',
    '-f', 'segment',
    '-segment_time', '3',
    '-segment_time_delta', '0.1',
    '-segment_format', 'aac',
    '-flush_packets', '1',
    '-segment_start_number', `${startNumber}`,
    path.join(liveDir, 'segment_%d.aac')
  ]);

  newProcess.stderr.on('data', (data) => console.error(`FFmpeg error: ${data}`));
  newProcess.on('close', (code) => console.log(`FFmpeg exited with code ${code}`));
  return newProcess;
}

// Khởi động FFmpeg lần đầu cho cả hai luồng
startFFmpeg(live1Dir, inputUrl1, ffmpegProcess1, globalSegmentNumber1).then(process => {
  ffmpegProcess1 = process;
});
startFFmpeg(live2Dir, inputUrl2, ffmpegProcess2, globalSegmentNumber2).then(process => {
  ffmpegProcess2 = process;
});

// Chạy server HTTP cho Socket.IO
const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log('Đã kết nối Socket.IO');
  socket.on('updatelive', async (jsonData) => {
    const linkLiveValue = jsonData.linklive;
    if (!isNaN(linkLiveValue)) {
      let newInputUrl;
      if (linkLiveValue == 1)
        newInputUrl = 'https://str.vov.gov.vn/vovlive/vov1vov5Vietnamese.sdp_aac/playlist.m3u8';
      else if (linkLiveValue == 2)
        newInputUrl = 'https://live.mediatech.vn/live/285bfb777e354ec43038aa68950adbac3a4/playlist.m3u8';
      else if (linkLiveValue == 3)
        newInputUrl = 'http://icecast.vov.link:8000/08D1F999EED0';
      else if (linkLiveValue == 4)
        newInputUrl = 'https://voa-ingest.akamaized.net/hls/live/2035200/161_352R/playlist.m3u8';

      // Cập nhật luồng cho live_1 (có thể mở rộng cho live_2)
      inputUrl1 = newInputUrl;
      console.log(`Đã chuyển sang luồng cho live_1: ${inputUrl1}`);
      ffmpegProcess1 = await startFFmpeg(live1Dir, inputUrl1, ffmpegProcess1, globalSegmentNumber1);
    }
  });
  socket.on('disconnect', () => {
    console.log('Đã ngắt kết nối Socket.IO');
  });
});

// Khởi động server Socket.IO
httpServer.listen(3028, () => {
  console.log('Socket.IO server running on port 3028');
});