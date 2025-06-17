import fs from 'fs';
import {
  mongo_get,
  mongo_find_query,
  mongo_detect_single,
  mongo_insert_query,
  mongo_delete_query,
  mongo_update_single,
  mongo_update_multi,
  mongo_insert_id
} from '../../../mongo_1/config/main_process.js';
import { TranslationServiceClient } from '@google-cloud/translate';
import { asyncLocalStorage } from '../../../requestContext.js';

/**
 * Dịch nội dung HTML từ Tiếng Việt sang tiếng Anh
 * Sử dụng Google Cloud Translate API v3 với Service Account
 * Tự động đọc projectId từ key file nếu không có env var
 */
export default async function translate() {
  try {
    // Lấy thông tin từ asyncLocalStorage
    const store = asyncLocalStorage.getStore();
    const { content: html, national_market } = store.get('data_post_api');

    // Lấy đường dẫn hoặc credentials JSON từ Mongo
    let keyJson = await mongo_get("settings.admin.keys_word.google_cloud");
    keyJson = keyJson.mongo_results;
    if (!keyJson) {
      console.warn("GOOGLE_APPLICATION_CREDENTIALS not set", keyJson);
    }

    // Đọc projectId nếu có
    let projectId;
    try {
      projectId = keyJson.project_id;
    } catch {
      // projectId sẽ undefined, client dùng mặc định
    }

    // Khởi tạo Google Translate client
    const clientConfig = { projectId };
    if (typeof keyJson === 'string') {
      clientConfig.keyFilename = keyJson;
    } else if (typeof keyJson === 'object') {
      clientConfig.credentials = keyJson;
    }
    const client = new TranslationServiceClient(clientConfig);

    // Parent path cố định
    const parent = `projects/${projectId}/locations/global`;

    // Chuẩn bị request
    const request = {
      parent,
      contents: [html],
      mimeType: "text/html",
      sourceLanguageCode: "vi",
      targetLanguageCode: national_market
    };

    // Gọi API dịch
    const [response] = await client.translateText(request);
    return response.translations[0].translatedText;

  } catch (error) {
    // Trả về lỗi khi có exception
    return error;
  }
}
