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

export default async function posts_data() {
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');
    const url_full = asyncLocalStorage.getStore().get('url_full');
    const url_param = asyncLocalStorage.getStore().get('url_param');

    const category = data_post_api.category;
    const data_scam = data_post_api.data_scam;

    if (data_post_api.value === 'test') {
        const info = await mongo_insert_query({
            "services.checkscam.datascam.facebook": { "ok": 'test' }
        }); return info;
    } else if (data_post_api.category) {
        const info = await mongo_insert_query({
            [`services.checkscam.datascam.${category}`]: data_scam
        }); return info;
    } else {
        return 'không hợp lệ';
    }
}
// ...existing code...