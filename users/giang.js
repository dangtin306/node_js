import {
    mongo_get,
    mongo_find_query,
    mongo_detect_single,
    mongo_insert_query,
    mongo_delete_query,
    mongo_update_single
} from '../mongo_1/config/main_process.js';
import { asyncLocalStorage } from '../requestContext.js';


export default async function giang() {
    const url_full = asyncLocalStorage.getStore().get('url_full');
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');

    // const device_id = data_post_api;
    if (url_full.includes('/giang_1')) {
        const xyz = 1234;
        const query = { "app_structure.app_fontend.hme_page": { $exists: true } };
        const set = {
            $set: { "app_structure.app_fontend.hme_page": xyz }
        }
        const info = await mongo_update_single(query, set);
        return info;

    } else if (url_full.includes('/giang_2')) {
        if (data_post_api) {
            const query = { "app_structure.app_fontend.sidebar_menu.tecom": { $exists: true } };
            const set = {
                $set: { "app_structure.app_fontend.sidebar_menu.tecom": data_post_api }
            };
            const info = await mongo_update_single(query, set);
            return info;
        }
        else {
            return 'ko có dữ liệu';
        }
    } else if (url_full.includes('/giang_3')) {
        const info = await mongo_get("app_structure.app_fontend.sidebar_menu.tecom");
        return info;
    } else if (url_full.includes('/giang_4')) {
        const query = { "settings.admin.data_home.links.to": "/reactapp/hustadmin/orders" };
        const set = {
            $set: { "settings.admin.data_home.links.$.text": "Quản lý đơn hàngg" }
        };
        const info = await mongo_update_single(query, set);
        return info;
    } else {

        return 'ko gi ca';
    }
    // const query = { "users.pass.id": 3545343 };
    // const set = {
    //     $set: { "users.pass.$.value": "1234567" }
    // };
    // const info = await mongo_update_single(query, set);
    // return info;
}