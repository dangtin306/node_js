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

    if (url_full.includes('/giang_1')) {
        const query = { "app_structure.ads_open.device_id": "safssdfdfs" };
        const set = {
            $set: { "app_structure.ads_open.$.open_views": 5 }
        };
        const info = await mongo_update_single(query, set);


        return info;

    } else if (url_full.includes('/giang_2')) {
        return 'giang_2';
    } else if (url_full.includes('/giang_3')) {
        const info = await mongo_get("app_structure.app_fonted.sidebar_menu.tecom");
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