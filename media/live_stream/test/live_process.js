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
    '-reconnect', '1',                // Đảm bảo kết nối lại nếu luồng bị gián đoạn
    '-reconnect_streamed', '1',       // Hỗ trợ kết nối lại cho luồng trực tuyến
    '-reconnect_delay_max', '3',      // Giới hạn thời gian chờ kết nối lại là 3 giây
    // '-stream_loop', '-1',             // Thêm theo yêu cầu của bạn (lặp lại luồng vô hạn)
    '-i', inputUrl,                   // Đường dẫn hoặc URL đầu vào
    '-vn',                            // Tắt video, chỉ xử lý âm thanh
    '-c:a', 'aac',                    // Mã hóa âm thanh sang định dạng AAC
    '-af', 'volume=0.4',             // Giảm âm lượng xuống 12%
    '-b:a', '64k',                    // Bitrate âm thanh là 64kbps
    '-fflags', '+genpts',             // Tạo PTS (presentation timestamps) nếu cần
    '-avoid_negative_ts', 'make_zero',// Tránh timestamps âm
    '-reset_timestamps', '1',         // Đặt lại timestamps cho mỗi đoạn
    '-force_key_frames', 'expr:gte(t,n_forced*3)', // Đặt keyframe mỗi 3 giây
    '-f', 'segment',                  // Định dạng đầu ra là phân đoạn
    '-segment_time', '3',             // Mỗi đoạn dài 3 giây (giữ nguyên như yêu cầu)
    '-segment_time_delta', '0.1',     // Độ lệch thời gian phân đoạn
    '-segment_format', 'aac',         // Định dạng tệp đầu ra là AAC
    '-flush_packets', '1',            // Xả gói dữ liệu ngay lập tức
    '-segment_start_number', `${startNumber}`, // Số bắt đầu của đoạn
    path.join(outputDir, 'segment_%d.aac')     // Đường dẫn và tên tệp đầu ra
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
        inputUrl = 'https://live.mediatech.vn/live/285bfb777e354ec43038aa68950adbac3a4/playlist.m3u8';
      else if (linkLiveValue == 3)
        inputUrl = 'http://icecast.vov.link:8000/08D1F999EED0';
      else if (linkLiveValue == 4)
        inputUrl = 'https://voa-ingest.akamaized.net/hls/live/2035200/161_352R/playlist.m3u8';
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