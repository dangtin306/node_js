import fs from 'fs';
import { spawn, exec } from 'child_process';
import path from 'path';
import { streams_category } from './streams_category.js'; // Import hai hàm
// Hàm cập nhật số thứ tự đoạn toàn cục
export function updateGlobalSegmentNumber(dir, currentNumber) {
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
  return max;
}

// Hàm dừng tiến trình FFmpeg cũ
export async function stopFFmpegProcess(ffmpegProcess) {
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
    // Chờ cho đến khi tiến trình FFmpeg thực sự kết thúc
    await new Promise(resolve => ffmpegProcess.once('close', resolve));
  } else {
    console.log('Không có ffmpegProcess cũ để dừng hoặc ffmpegProcess không hợp lệ.');
  }
}

// Hàm khởi động FFmpeg cho một luồng
export async function startFFmpeg(liveDir, ffmpegProcess, globalSegmentNumber) {
  // Dừng tiến trình FFmpeg cũ nếu có
  await stopFFmpegProcess(ffmpegProcess);

  // Cập nhật số đoạn và khởi động FFmpeg mới
  let startNumber = updateGlobalSegmentNumber(liveDir, globalSegmentNumber);
  // console.log(`Khởi động FFmpeg với đầu vào: ${url_live_relay} (bắt đầu từ số ${startNumber})`);

  const newProcess = await streams_category(liveDir, startNumber);

  newProcess.stderr.on('data', (data) => console.error(`Lỗi FFmpeg: ${data}`));
  newProcess.on('close', (code) => console.log(`FFmpeg thoát với mã ${code}`));
  return newProcess;
}