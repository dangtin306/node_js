import {
    mongo_get,
    mongo_get_multi,
    mongo_find_query,
    mongo_detect_single,
    mongo_insert_query,
    mongo_delete_query,
    mongo_json_count,
    mongo_update_single
} from '../../mongo_1/config/main_process.js';
import { asyncLocalStorage } from '../../requestContext.js';
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function files() {
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');
    const url_full = asyncLocalStorage.getStore().get('url_full');
    const url_param = asyncLocalStorage.getStore().get('url_param');
    if (url_full.includes('/files_users')) {
        let mongo_status = false;
        const id_users = data_post_api.id_users;
        if (id_users) {
            let id_media = await mongo_find_query({ "users.audio.id_users": id_users }, "id_media");
            // console.log(id_media);
            mongo_status = id_media.mongo_status;
            id_media = id_media.mongo_results;
            if (mongo_status == "success") {
                const query = { "media.audio.files": { $exists: true } };
                const field = {
                    path: "media.audio.files",
                    filter_field: "id",
                    filter_values: id_media
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
    } else if (url_full.includes('/upload_files_save')) {
        const sourceFile = path.join(__dirname, "uploads", "upload.mp3");
        const hard_drive = "D:";
        const path_folder = "hustmedia/truyen-thanh/audio";
        let maxId = await mongo_get("media.audio.files");
        maxId = maxId.mongo_results;
        maxId = maxId.reduce((max, data) => data.id > max ? data.id : max, 0);
        const id_file = maxId + 1 ;
        const title = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        const path_file = title + ".mp3";

        const destDir = path.join(hard_drive, path_folder);
        const destFile = path.join(destDir, path_file);

        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        fs.copyFile(sourceFile, destFile, (err) => {
            if (err) {
                console.error("Error copying file:", err);
            } else {
                console.log(`File successfully copied to ${destFile}`);
            }
        });

        const newDevice = {
            "id": id_file,
            "hard_drive": hard_drive, // Thay đổi giá trị theo ý bạn
            "path_folder": path_folder,
            "path_file": path_file,
            "created_date": new Date(),
            "title": title,
            "ver": 1
        };
        query = { "media.audio.files": newDevice };
        const info = await mongo_insert_query(query);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        fs.copyFile(sourceFile, destFile, (err) => {
            if (err) {
                console.error("Error copying file:", err);
            } else {
                console.log(`File successfully copied to ${destFile}`);
            }
        });
        return info;
    } else {
        return "ko tìm thấy";
    }
}