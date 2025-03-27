import {
    mongo_get,
    mongo_find_query,
    mongo_detect_single,
    mongo_insert_query,
    mongo_delete_query,
    mongo_update_single
} from '../../mongo_1/config/main_process.js';
import { asyncLocalStorage } from '../../requestContext.js';

export default async function files() {
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');
    const url_full = asyncLocalStorage.getStore().get('url_full');
    let mongo_status = false;
    if (url_full.includes('/files_users')) {
        const id_users = data_post_api.id_users;
        if (id_users) {
            let id_control = await mongo_find_query({ "media.audio.users.id_users": id_users }, "id_control");
            // console.log(id_control);
            mongo_status = id_control.mongo_status;
            id_control = id_control.mongo_results;
            if (mongo_status == "success") {
                return id_control;
                // const info = await mongo_get("media.audio.files");
                // return info;
            } else {
                return "ko có file";
            }
        }
        else {
            return "ko có id_users";
        }
    } else {
        return "ko tìm thấy";
    }
}