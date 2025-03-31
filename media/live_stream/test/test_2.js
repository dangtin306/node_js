import { spawn } from 'child_process';

const inputUrl = 'https://live.mediatech.vn/live/285bfb777e354ec43038aa68950adbac3a4/chunklist.m3u8';
// Đường dẫn RTMP đến Node-Media-Server, sử dụng app 'live1' và một streamKey tùy ý (ví dụ: 'stream1')
const outputUrl = 'rtmp://vip.tecom.pro:1935/live1/stream1';

const ffmpegArgs = [
    '-re',               // Đọc input theo tốc độ tự nhiên
    '-i', inputUrl,      // Nguồn HLS
    '-c:v', 'copy',      // Copy video (nếu có) - có thể thay đổi nếu cần
    '-c:a', 'aac',       // Mã hóa âm thanh sang AAC
    '-b:a', '70k',       // Bitrate cho âm thanh
    '-vn',               // Bỏ video, chỉ giữ lại audio
    '-af', 'volume=1.0', // Tăng âm lượng lên gấp đôi
    '-f', 'flv',         // Định dạng đầu ra phù hợp với RTMP
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
