import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

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

// Khởi động FFmpeg
startFFmpeg();

console.log('ffmpegHandler.js đang chạy và xử lý luồng...');