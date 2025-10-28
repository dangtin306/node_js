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

    const apikey = url_param.apikey;
    const category_pro = url_param.category_pro;
    const main_domain = url_param.main_domain;
    const national_market = url_param.national_market;

    if (data_post_api.value === 'test') {
        const info = await mongo_insert_query({
            "services.checkscam.datascam.facebook": {"ok": 'test'}
        }); return info;
    }

    return (data_post_api);

}
// ...existing code...