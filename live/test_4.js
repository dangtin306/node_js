import fs from 'fs';
import { spawn } from 'child_process';

// Mảng file audio cục bộ cần phát (đảm bảo các file tồn tại)
const audioFiles = [
  '/Users/dangtin306/Downloads/main_server/node_js/live/audio_3.mp3',
  '/Users/dangtin306/Downloads/main_server/node_js/live/audio_4.mp3'
];

// Tạo file danh sách cho ffmpeg (sử dụng concat demuxer)
const fileListContent = audioFiles
  .map(file => `file '${file}'`)
  .join('\n');

const fileListPath = 'filelist.txt';
fs.writeFileSync(fileListPath, fileListContent);

// Đường dẫn RTMP đến Node-Media-Server, sử dụng app 'live1' và streamKey (ví dụ: 'stream1')
const outputUrl = 'rtmp://vip.tecom.pro:1935/live1/stream1';

// Các tham số ffmpeg:
// - '-re' đọc input theo tốc độ tự nhiên
// - '-stream_loop -1' lặp lại playlist vô hạn
// - '-f concat' sử dụng định dạng concat
// - '-safe 0' cho phép đường dẫn tuyệt đối
// - '-i filelist.txt' là file playlist đã tạo
// - '-vn' bỏ qua stream video (ví dụ album cover nhúng trong file MP3)
// - '-c:a aac' mã hóa âm thanh sang AAC
// - '-b:a 77k' thiết lập bitrate cho âm thanh
// - '-af volume=1.0' điều chỉnh âm lượng
// - '-f flv' định dạng đầu ra phù hợp với RTMP
const ffmpegArgs = [
  '-re',
  '-stream_loop', '-1',
  '-f', 'concat',
  '-safe', '0',
  '-i', fileListPath,
  '-vn', // Bỏ video (nếu có)
  '-c:a', 'aac',
  '-b:a', '77k',
  '-af', 'volume=1.0',
  '-f', 'flv',
  outputUrl
];

const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

ffmpegProcess.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

ffmpegProcess.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

ffmpegProcess.on('close', (code) => {
  console.log(`FFmpeg process exited with code ${code}`);
});
