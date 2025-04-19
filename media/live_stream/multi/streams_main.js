import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import get_json_live from './get_json_live.js';
import { asyncLocalStorage } from '../../../requestContext.js';
import { startFFmpeg } from './streams_process.js'; // Import hai hàm
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
  console.error('Not found hoặc stream mặc định (id: 1) không hoạt động');
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


// Hàm chung xử lý cập nhật luồng
export async function handleStreamUpdate(liveControl, jsonData) {
  const linkLiveValue = jsonData.linklive;
  if (isNaN(linkLiveValue)) {
    console.error(`Giá trị linklive không hợp lệ: ${linkLiveValue}`);
    return;
  }

  const id = parseInt(linkLiveValue, 10); // Chuyển linkLiveValue thành số nguyên
  const stream = thirdPartyStreams.find(s => s.id === id && s.status === true);
  if (!stream) {
    console.error(`Not found stream hoạt động cho id ${id}`);
    return; // Không thay đổi luồng nếu Not found
  }

  const newInputUrl = stream.live_url;
  inputUrls[liveControl] = newInputUrl;
  asyncLocalStorage.getStore().set('url_live_relay', newInputUrl);

  console.log(`Đã chuyển sang luồng cho ${liveControl}: ${newInputUrl}`);
  ffmpegProcesses[liveControl] = await startFFmpeg(liveDirs[liveControl], ffmpegProcesses[liveControl], globalSegmentNumbers[liveControl]);
}

// Khởi chạy asyncLocalStorage với Map mới và thiết lập jsonData
asyncLocalStorage.run(new Map(), async () => {
  asyncLocalStorage.getStore().set('category', 'streams_relay');

  // Khởi động FFmpeg lần đầu cho tất cả các luồng với delay 200ms giữa các luồng
  liveInfo.forEach((info, index) => {
    asyncLocalStorage.getStore().set('url_live_relay', inputUrls[info.live_control]);

    setTimeout(() => {
      startFFmpeg(liveDirs[info.live_control], ffmpegProcesses[info.live_control], globalSegmentNumbers[info.live_control]).then(process => {
        ffmpegProcesses[info.live_control] = process;
      });
    }, index * 50); // Delay cho mỗi luồng
  });
});
// Chạy server HTTP cho Socket.IO
const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: '*' } });

// Định nghĩa hàm xử lý chung cho sự kiện
function process_socket(liveControl, jsonData, callback) {
  // Gọi hàm xử lý sự kiện
  handleStreamUpdate(liveControl, jsonData);
  // Gửi phản hồi về client, dùng jsonData.category nếu có, ngược lại trả lại toàn bộ jsonData
  callback({ socket_status: "success" });
}

io.on('connection', (socket) => {
  console.log('Đã kết nối Socket.IO');
  liveInfo.forEach(info => {
    socket.on(info.socket_control, (jsonData, callback) => {
      asyncLocalStorage.run(new Map(), async () => {
        if (jsonData.category) {
          asyncLocalStorage.getStore().set('category', jsonData.category);
          if (jsonData.id_files) {
            asyncLocalStorage.getStore().set('id_files', jsonData.id_files);
            process_socket(info.live_control, jsonData, callback);
          } else {
            process_socket(info.live_control, jsonData, callback);
          }
        }
        else {
          callback({ socket_status: "cancel", socket_results: "missing category field" });
        }
      });
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
