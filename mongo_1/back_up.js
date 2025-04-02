import {
    mongo_get,
    mongo_find_query,
    mongo_detect_single,
    mongo_insert_query,
    mongo_delete_query,
    mongo_update_single
} from './config/main_process.js';
import { asyncLocalStorage } from '../requestContext.js';


export default async function back_up() {
    const url_full = asyncLocalStorage.getStore().get('url_full');
    const url_param = asyncLocalStorage.getStore().get('url_param');
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');
    if (url_full.includes('/full')) {
        const info = await mongo_get({});

        return info;
    }
}
