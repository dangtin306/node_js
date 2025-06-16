import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TranslationServiceClient } from '@google-cloud/translate';
import { asyncLocalStorage } from '../../../requestContext.js';

// Thiết lập __dirname cho ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Dịch nội dung HTML từ Tiếng Việt sang tiếng Anh
 * Sử dụng Google Cloud Translate API v3 với Service Account
 * Tự động đọc projectId từ key file nếu không có env var
 */
export default async function translate() {
  // Lấy thông tin request context
  const store = asyncLocalStorage.getStore();
  const { content: html, location } = store.get('data_post_api');

  // Xác định đường dẫn key file
  const defaultKeyPath = path.resolve(__dirname, '../../../servers/backend/hust_media_cloud.json');
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || defaultKeyPath;
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn(`GOOGLE_APPLICATION_CREDENTIALS not set, using fallback key file: ${defaultKeyPath}`);
  }

  // Đọc projectId từ key file nếu env var không có
  let projectId = process.env.GCP_PROJECT_ID;
  if (!projectId) {
    try {
      const keyJson = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
      projectId = keyJson.project_id;
    } catch (err) {
      console.error('Failed to read project_id from key file:', err);
      // Tiếp tục với undefined projectId, client sẽ sử dụng mặc định
    }
  }

  // Khởi tạo Google Translate client với explicit keyFilename và projectId
  const client = new TranslationServiceClient({
    keyFilename: keyFile,
    projectId
  });

  // Thiết lập parent path
  const targetLocation = location || 'global';
  const parent = `projects/${projectId}/locations/${targetLocation}`;

  // Request dịch HTML
  const request = {
    parent,
    contents: [html],
    mimeType: 'text/html',
    sourceLanguageCode: 'vi',
    targetLanguageCode: 'en'
  };

  try {
    const [response] = await client.translateText(request);
    return response.translations[0].translatedText;
  } catch (error) {
    if (error.code === 7) {
      console.error(
        `Translation failed: PERMISSION_DENIED. ` +
        `Vui lòng kiểm tra:
` +
        `- IAM: Service Account có role Cloud Translation API User
` +
        `- API đã bật trong Google Cloud Console
` +
        `- Billing cho project đã được kích hoạt`
      );
    } else {
      console.error('Translation error:', error.message || error);
    }
    return html;
  }
}
