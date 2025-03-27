import {
    mongo_get,
    mongo_get_multi,
    mongo_find_query,
    mongo_detect_single,
    mongo_insert_query,
    mongo_delete_query,
    mongo_update_single
} from '../../mongo_1/config/main_process.js';
import { asyncLocalStorage } from '../../requestContext.js';
import multer from 'multer';

export default async function files() {
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');
    const url_full = asyncLocalStorage.getStore().get('url_full');
    if (url_full.includes('/files_users')) {
        let mongo_status = false;
        const id_users = data_post_api.id_users;
        if (id_users) {
            let id_control = await mongo_find_query({ "media.audio.users.id_users": id_users }, "id_control");
            // console.log(id_control);
            mongo_status = id_control.mongo_status;
            id_control = id_control.mongo_results;
            if (mongo_status == "success") {
                const query = { "media.audio.files": { $exists: true } };
                const field = {
                    path: "media.audio.files",
                    filter_field: "id_control",
                    filter_values: id_control
                };
                const result = await mongo_get_multi(query, field);
                return result;
                // return info;
            } else {
                return "ko có file";
            }
        }
        else {
            return "ko có id_users";
        }
    } else if (url_full.includes('/upload_files')) {
        // Tách phần query sau dấu ?
        const queryString = url_full.split('?')[1];

        // Chuyển query string thành object
        const queryParams = queryString.split('&').reduce((acc, param) => {
            const [key, value] = param.split('=');
            acc[key] = value;
            return acc;
        }, {});
  // Log ra console tất cả field text (trong body)
  console.log('req.body:', req.body);

  // Log ra console thông tin file
  console.log('req.file:', req.file);
        const service = queryParams.service; // in ra 'save_default'
        const id_users = data_post_api.id_users;

    } else {
        return "ko tìm thấy";
    }
}