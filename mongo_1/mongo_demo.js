import {
    mongo_get,
    mongo_find_query,
    mongo_detect_single,
    mongo_insert_query,
    mongo_delete_query,
    mongo_update_single,
    mongo_update_multi
} from './config/main_process.js';
import { asyncLocalStorage } from '../requestContext.js';
export default async function mongo_demo() {

    const url_full = asyncLocalStorage.getStore().get('url_full');
    const url_param = asyncLocalStorage.getStore().get('url_param');
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');
    // console.log(data_post_api.query);
    console.log('url_full' + url_full + 123);
    if (url_full.includes('/mongo_get_demo_1')) {
        const info = await mongo_get("memory_main");
        return info;
    } else if (url_full.includes('/mongo_get_demo_2')) {
        const info = await mongo_get("settings.admin.data_home");
        return info;
    } else if (url_full.includes('/find_block_data_1_demo')) {
        const info = await mongo_find_query({ "settings.admin.data_home.links.to": "/reactapp/hustadmin/member" }, "text");
        return info;
    } else if (url_full.includes('/find_block_data_2_demo')) {
        const info = await mongo_find_query({ "settings.admin.data_homejson.links.to": "/reactapp/hustadmin/member" });
        return info;
    } else if (url_full.includes('/find_block_data_3_demo')) {
        const info = await mongo_find_query({ "settings.admin.data_homejson.links.to": "/reactapp/hustadmin/member" });
        return info;
    } else if (url_full.includes('/mongo_detect_single_demo')) {
        const info = await mongo_detect_single({ "users.block_list.email_users6": "user1@example.com" });
        return info;
    } else if (url_full.includes('/mongo_insert_query_demo')) {
        const info = await mongo_insert_query({ "settings.admin.data_home.to": "mongo_insert_query" });
        return info;
    } else if (url_full.includes('/mongo_delete_query_demo')) {
        const info = await mongo_delete_query({ "settings.admin.data_home.to": "mongo_insert_query" });
        return info;
    } else if (url_full.includes('/mongo_update_single_demo_1')) {
        const query = { "settings.admin.data_home.links.to": "/reactapp/hustadmin/orders" };
        const set = {
            $set: { "settings.admin.data_home.links.$.text": "Quản lý đơn hàngg" }
        };
        const info = await mongo_update_single(query, set);
        return info;
    } else if (url_full.includes('/mongo_update_single_demo_2')) {
        const query = { "media.audio.files.id": 3 };
        const set = { "media.audio.files.$.title": "Quản lý đơn hàngg" };
        const info = await mongo_update_single(query, set);
        return info;
    } else if (url_full.includes('/mongo_update_multi_demo')) {
        const query = { "users.bio_links.id_users": 34631 };
        const set = {
            "users.bio_links.$.lienket": {
                description: "sdsdsd",
                link: "sdsdsd"
            },
            "users.bio_links.$.social": {
                facebook: "s6576765",
                insta: "dssdds",
                tiktok: "12345643"
            },
            "users.bio_links.$.username": "admin"
        };
        const info = await mongo_update_multi(query, set);
        return info;
    }
}
