import {
    mongo_get,
    mongo_find_query,
    mongo_detect_single,
    mongo_insert_query,
    mongo_delete_query,
    mongo_update_single,
    mongo_update_multi
} from '../mongo_1/config/main_process.js';
import { asyncLocalStorage } from '../requestContext.js';


export default async function edit_json_and_save() {
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');

    const info = await mongo_get("settings.schedule");
    return info;
}