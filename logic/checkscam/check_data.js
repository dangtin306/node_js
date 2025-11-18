// ...existing code...
import {
    mongo_get,
    mongo_find_query,
    mongo_detect_single,
    mongo_insert_query,
    mongo_delete_query,
    mongo_update_single,
    mongo_update_multi
} from '../../mongo_1/config/main_process.js';
import { asyncLocalStorage } from '../../requestContext.js';

export default async function check_data() {
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');
    const url_full = asyncLocalStorage.getStore().get('url_full');
    const url_param = asyncLocalStorage.getStore().get('url_param');

    const apikey = url_param.apikey;
    const category_pro = url_param.category_pro;
    const mode = data_post_api.mode;
    const query = data_post_api.query;

    if (mode === 'detect') {
        const value = data_post_api.value;
        const category = data_post_api.category;
        const query_sql = {
            [`${query}.${category}`]: value
        };
        const info = await mongo_detect_single(query_sql); return info;
    } else {
        return (data_post_api);
    }
}

// ...existing code...