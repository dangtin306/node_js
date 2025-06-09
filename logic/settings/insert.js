import {
    mongo_get,
    mongo_get_multi,
    mongo_find_query,
    mongo_detect_single,
    mongo_json_count,
    mongo_insert_query,
    mongo_delete_query,
    mongo_update_single,
    mongo_update_multi,
    mongo_insert_id
} from '../../mongo_1/config/main_process.js';
import { asyncLocalStorage } from '../../requestContext.js';

export default async function settings_insert() {
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');
    const url_full = asyncLocalStorage.getStore().get('url_full');
    const url_param = asyncLocalStorage.getStore().get('url_param');

    const apikey = url_param.apikey;
    // const query = url_param.query;
    // const set = url_param.set;
    if (data_post_api) {
        const query = data_post_api.query;
        const set = data_post_api.set;

        const insertData = {
            "app_structure.ads_open": set
        };
        const insert_query = await mongo_insert_query(insertData);
        return (insert_query);
    }
    else {
        return "ko có data_post_api";
    }
}