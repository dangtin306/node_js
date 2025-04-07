import fs from 'fs';
import path from 'path';

export function cleanupOldFiles(outputDir) {
  fs.readdir(outputDir, (err, files) => {
    if (err) {
      console.error(`Error reading directory ${outputDir}:`, err);
      return;
    }
    let segments = files.filter(file => file.endsWith('.aac')).sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0], 10);
      const numB = parseInt(b.match(/\d+/)[0], 10);
      return numA - numB;
    });
    let validSegments = [];
    segments.forEach(segment => {
      const filePath = path.join(outputDir, segment);
      try {
        const stats = fs.statSync(filePath);
        if (stats.size > 4096) {
          validSegments.push(segment);
        }
      } catch (err) {
        console.error(`Error accessing file ${filePath}:`, err);
      }
    });

    if (validSegments.length > 20) {
      const segmentsToDelete = validSegments.slice(0, validSegments.length - 20);
      segmentsToDelete.forEach(segment => {
        const filePath = path.join(outputDir, segment);
        try {
          fs.unlinkSync(filePath);
          // console.log(`Deleted old file ${filePath}`);
        } catch (err) {
          console.error(`Error deleting file ${filePath}: ${err.message}`);
        }
      });
      // Kiểm tra lại thư mục sau khi xóa
      fs.readdir(outputDir, (err, updatedFiles) => {
        if (err) {
          console.error(`Error reading directory after cleanup ${outputDir}:`, err);
          return;
        }
        let remainingSegments = updatedFiles.filter(file => file.endsWith('.aac'));
        // console.log(`Remaining files after cleanup: ${remainingSegments.length}, files: ${remainingSegments.join(', ')}`);
      });
    }
  });
}

export function generatePlaylist(outputDir, callback) {
  fs.readdir(outputDir, (err, files) => {
    if (err) {
      callback(err);
      return;
    }
    let segments = files.filter(file => file.endsWith('.aac')).sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0], 10);
      const numB = parseInt(b.match(/\d+/)[0], 10);
      return numA - numB;
    });
    let validSegments = [];
    segments.forEach(segment => {
      const filePath = path.join(outputDir, segment);
      try {
        const stats = fs.statSync(filePath);
        if (stats.size > 4096) {
          validSegments.push(segment);
        }
      } catch (err) {
        console.error(`Error accessing file ${filePath}:`, err);
      }
    });

    if (validSegments.length < 3) {
      callback(new Error('Not enough segments available'));
      return;
    }
    const segmentsForPlaylist = validSegments.slice(-5);
    const targetDuration = 3;
    const match = segmentsForPlaylist[0].match(/(\d+)/);
    const sequence = match ? parseInt(match[1], 10) : 0;

    let playlist = '#EXTM3U\n';
    playlist += '#EXT-X-VERSION:3\n';
    playlist += `#EXT-X-TARGETDURATION:${targetDuration}\n`;
    playlist += `#EXT-X-MEDIA-SEQUENCE:${sequence}\n`;
    segmentsForPlaylist.forEach(segment => {
      playlist += `#EXTINF:3.000,\n${segment}\n`;
    });
    callback(null, playlist);
  });
}
