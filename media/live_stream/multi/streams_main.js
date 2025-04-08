import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import get_json_live from './get_json_live.js';
import { spawn, exec } from 'child_process';

// Thiết lập đường dẫn file và thư mục
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, 'aac_output');
let liveInfo = await get_json_live();
liveInfo = liveInfo.api_results.mongo_results;

// Đọc và parse file third_party_streams.json
let thirdPartyStreams;
try {
  thirdPartyStreams = JSON.parse(fs.readFileSync(path.join(__dirname, 'streams_relay.json'), 'utf8'));
} catch (error) {
  console.error('Lỗi khi đọc file third_party_streams.json:', error);
  process.exit(1); // Thoát nếu không đọc được file
}

// Tìm stream mặc định (id: 1)
const defaultStream = thirdPartyStreams.find(s => s.id === 1 && s.status === true);
if (!defaultStream) {
  console.error('Không tìm thấy hoặc stream mặc định (id: 1) không hoạt động');
  process.exit(1); // Thoát nếu stream mặc định không khả dụng
}

// Khởi tạo thư mục đầu ra và biến trạng thái
const liveDirs = {};
const inputUrls = {};
const ffmpegProcesses = {};
const globalSegmentNumbers = {};

liveInfo.forEach(info => {
  const liveDir = path.join(outputDir, info.live_control);
  liveDirs[info.live_control] = liveDir;
  inputUrls[info.live_control] = defaultStream.live_url; // Sử dụng URL từ stream mặc định
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
  // if (ffmpegProcess && !ffmpegProcess.killed) {
  //   console.log(`Đang dừng ffmpegProcess trước đó (PID: ${ffmpegProcess.pid})`);
  //   ffmpegProcess.kill('SIGTERM');
  //   await new Promise(resolve => ffmpegProcess.once('close', resolve));
  // }
  if (ffmpegProcess && typeof ffmpegProcess.pid === 'number' && !ffmpegProcess.killed) {
    console.log(`Đang dừng ffmpegProcess trước đó (PID: ${ffmpegProcess.pid})`);
    if (process.platform === 'win32') {
      // Trên Windows, sử dụng taskkill
      exec(`taskkill /F /PID ${ffmpegProcess.pid} /T`, (err, stdout, stderr) => {
        if (err) {
          console.error(`Lỗi khi kill trên Windows: ${err}`);
        } else {
          console.log(`FFmpeg đã được kill trên Windows: ${stdout}`);
        }
      });
    } else {
      // Trên macOS và Linux, sử dụng kill
      exec(`kill -TERM ${ffmpegProcess.pid}`, (err, stdout, stderr) => {
        if (err) {
          console.error(`Lỗi khi kill trên macOS/Linux: ${err}`);
        } else {
          console.log(`FFmpeg đã được kill trên macOS/Linux: ${stdout}`);
        }
      });
    }
  } else {
    console.log('Không có ffmpegProcess cũ để dừng hoặc ffmpegProcess không hợp lệ.');
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

  newProcess.stderr.on('data', (data) => console.error(`Lỗi FFmpeg: ${data}`));
  newProcess.on('close', (code) => console.log(`FFmpeg thoát với mã ${code}`));
  return newProcess;
}

// Hàm chung xử lý cập nhật luồng
async function handleStreamUpdate(liveControl, jsonData) {
  const linkLiveValue = jsonData.linklive;
  if (isNaN(linkLiveValue)) {
    console.error(`Giá trị linklive không hợp lệ: ${linkLiveValue}`);
    return;
  }

  const id = parseInt(linkLiveValue, 10); // Chuyển linkLiveValue thành số nguyên
  const stream = thirdPartyStreams.find(s => s.id === id && s.status === true);
  if (!stream) {
    console.error(`Không tìm thấy stream hoạt động cho id ${id}`);
    return; // Không thay đổi luồng nếu không tìm thấy
  }

  const newInputUrl = stream.live_url;
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
    socket.on(info.socket_control, (jsonData, callback) => {
      // Gọi hàm xử lý sự kiện
      handleStreamUpdate(info.live_control, jsonData);
      // Gửi phản hồi về client
      callback({ socket_status: 'success' });
    });
  });

  socket.on('disconnect', () => {
    console.log('Đã ngắt kết nối Socket.IO');
  });
});
// Khởi động server Socket.IO
httpServer.listen(3028, () => {
  console.log('Socket.IO server đang chạy trên cổng 3028');
});