import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { asyncLocalStorage } from '../../../requestContext.js';
// Hàm khởi động FFmpeg với volume cụ thể

export async function streams_category(liveDir, startNumber) {
  const category = asyncLocalStorage.getStore().get('category');
  if (category == "streams_relay") {
    const url_live_relay = asyncLocalStorage.getStore().get('url_live_relay');

    return spawn('ffmpeg', [
      '-re',
      '-reconnect', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '3',
      '-i', url_live_relay,
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
  }
  else if (category == "files") {
    // Mảng file audio cục bộ cần phát (đảm bảo các file tồn tại)
    const audioFiles = [
      '/Users/dangtin306/Downloads/main_server/node_js/media/live_stream/single/audio_1.mp3',
      '/Users/dangtin306/Downloads/main_server/node_js/media/live_stream/single/audio_2.mp3'
    ];

    // Tạo file danh sách cho ffmpeg (sử dụng concat demuxer)
    // Lưu ý: Định dạng file phải đúng theo yêu cầu của concat demuxer
    const fileListContent = audioFiles
      .map(file => `file '${file}'`)
      .join('\n');

    const fileListPath = 'filelist.txt';
    fs.writeFileSync(fileListPath, fileListContent);
    console.log("File list được tạo thành công ở:", fileListPath);
    
    // Sửa lỗi bằng cách chỉ định định dạng đầu vào là "concat" và thêm "-safe 0"
    return spawn('ffmpeg', [
      '-re',
      '-stream_loop', '-1',
      '-f', 'concat',    // Chỉ định đầu vào là concat demuxer
      '-safe', '0',      // Cho phép sử dụng đường dẫn tuyệt đối
      '-i', fileListPath,
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
  }
}
