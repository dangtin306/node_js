import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Thiết lập đường dẫn file và thư mục
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, 'aac_output');
const liveInfoPath = path.join(__dirname, 'live_info.json');

// Đọc thông tin từ live_info.json
const liveInfo = JSON.parse(fs.readFileSync(liveInfoPath, 'utf-8'));

// Khởi tạo thư mục đầu ra và biến trạng thái
const liveDirs = {};
const inputUrls = {};
const ffmpegProcesses = {};
const globalSegmentNumbers = {};

liveInfo.forEach(info => {
  const liveDir = path.join(outputDir, info.live_control);
  liveDirs[info.live_control] = liveDir;
  inputUrls[info.live_control] = 'https://str.vov.gov.vn/vovlive/vov1vov5Vietnamese.sdp_aac/playlist.m3u8'; // Luồng mặc định
  ffmpegProcesses[info.live_control] = null;
  globalSegmentNumbers[info.live_control] = 0;

  if (!fs.existsSync(liveDir)) {
    fs.mkdirSync(liveDir, { recursive: true });
  } else {
    fs.readdirSync(liveDir).forEach(file => {
      fs.unlinkSync(path.join(liveDir, file));
    });
  }
});

// Hàm cập nhật số thứ tự đoạn toàn cục
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

// Hàm khởi động FFmpeg cho một luồng
async function startFFmpeg(liveDir, inputUrl, ffmpegProcess, globalSegmentNumber) {
  if (ffmpegProcess && !ffmpegProcess.killed) {
    console.log(`Killing previous ffmpegProcess (PID: ${ffmpegProcess.pid})`);
    ffmpegProcess.kill('SIGTERM');
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
    '-af', 'volume=1',
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

// Hàm chung xử lý cập nhật luồng
async function handleStreamUpdate(liveControl, jsonData) {
  const linkLiveValue = jsonData.linklive;
  if (isNaN(linkLiveValue)) return;

  let newInputUrl;
  if (linkLiveValue == 1)
    newInputUrl = 'https://str.vov.gov.vn/vovlive/vov1vov5Vietnamese.sdp_aac/playlist.m3u8';
  else if (linkLiveValue == 2)
    newInputUrl = 'https://live.mediatech.vn/live/285bfb777e354ec43038aa68950adbac3a4/playlist.m3u8';
  else if (linkLiveValue == 3)
    newInputUrl = 'http://icecast.vov.link:8000/08D1F999EED0';
  else if (linkLiveValue == 4)
    newInputUrl = 'https://voa-ingest.akamaized.net/hls/live/2035200/161_352R/playlist.m3u8';

  inputUrls[liveControl] = newInputUrl;
  console.log(`Đã chuyển sang luồng cho ${liveControl}: ${newInputUrl}`);
  ffmpegProcesses[liveControl] = await startFFmpeg(liveDirs[liveControl], newInputUrl, ffmpegProcesses[liveControl], globalSegmentNumbers[liveControl]);
}

// Khởi động FFmpeg lần đầu cho tất cả các luồng
liveInfo.forEach(info => {
  startFFmpeg(liveDirs[info.live_control], inputUrls[info.live_control], ffmpegProcesses[info.live_control], globalSegmentNumbers[info.live_control]).then(process => {
    ffmpegProcesses[info.live_control] = process;
  });
});

// Chạy server HTTP cho Socket.IO
const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log('Đã kết nối Socket.IO');

  liveInfo.forEach(info => {
    socket.on(info.socket_control, (jsonData) => handleStreamUpdate(info.live_control, jsonData));
  });

  socket.on('disconnect', () => {
    console.log('Đã ngắt kết nối Socket.IO');
  });
});

// Khởi động server Socket.IO
httpServer.listen(3028, () => {
  console.log('Socket.IO server running on port 3028');
});