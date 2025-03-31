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

// Khởi tạo thư mục đầu ra
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
} else {
  fs.readdirSync(outputDir).forEach(file => {
    fs.unlinkSync(path.join(outputDir, file));
  });
}

// Biến trạng thái
let inputUrl = 'https://str.vov.gov.vn/vovlive/vov1vov5Vietnamese.sdp_aac/playlist.m3u8';
let ffmpegProcess = null;
let globalSegmentNumber = 0;

// Cập nhật số thứ tự đoạn toàn cục
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

// Khởi động FFmpeg
async function startFFmpeg() {
  if (ffmpegProcess) {
    console.log(`Killing previous ffmpegProcess (PID: ${ffmpegProcess.pid})`);
    exec(`taskkill /F /PID ${ffmpegProcess.pid} /T`, (err, stdout, stderr) => {
      if (err) console.error(`Lỗi khi kill: ${err}`);
      else console.log(`FFmpeg đã được kill: ${stdout}`);
    });
    await new Promise(resolve => ffmpegProcess.once('close', resolve));
  }
  updateGlobalSegmentNumber();
  let startNumber = globalSegmentNumber;
  console.log(`Khởi động FFmpeg với đầu vào: ${inputUrl} (bắt đầu từ số ${startNumber})`);

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

  ffmpegProcess.stderr.on('data', (data) => console.error(`FFmpeg error: ${data}`));
  ffmpegProcess.on('close', (code) => console.log(`FFmpeg exited with code ${code}`));
}

// Khởi động FFmpeg lần đầu
startFFmpeg();

// Chạy server HTTP cho Socket.IO
const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: '*' } });

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
      await startFFmpeg();
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