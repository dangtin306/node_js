import {
    mongo_get,
    mongo_find_query,
    mongo_detect_single,
    mongo_insert_query,
    mongo_delete_query,
    mongo_update_single
} from './config/main_process.js';
import { asyncLocalStorage } from '../requestContext.js';
export default async function mongo_demo_api() {

    const url_full = asyncLocalStorage.getStore().get('url_full');
    const url_param = asyncLocalStorage.getStore().get('url_param');
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');
    // console.log(data_post_api.query);
    console.log('url_full' + url_full);
    if (url_full.includes('/memory_main_demo')) {
        const info = await mongo_get("memory_main");
        return info;
    } else if (url_full.includes('/settings_admin_data_home')) {
        const info = await mongo_get("settings.admin.data_home");
        return info;
    } else if (url_full.includes('/find_block_data_1_demo')) {
        const info = await mongo_find_query({ "settings.admin.data_home.links.to": "/reactapp/hustadmin/member" }, "text");
        return info;
    } else if (url_full.includes('/find_block_data_2_demo')) {
        const info = await mongo_find_query({ "settings.admin.data_home.links.to": "/reactapp/hustadmin/member" });
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
    } else if (url_full.includes('/mongo_update_single_demo_giang')) {
        const xyz = 1234;
        const query = { "app_structure.app_fontend.hme_page": { $exists: true } };
        // có thể dùng  const query = {};
        const set = {
            $set: { "app_structure.app_fontend.hme_page": xyz }
        }
        const info = await mongo_update_single(query, set);
        return info;
    } else if (url_full.includes('/mongo_update_single_demo_1')) {
        const query = { "settings.admin.data_home.links.to": "/reactapp/hustadmin/orders" };
        const set = {
            $set: { "settings.admin.data_home.links.$.text": "Quản lý đơn hàngg" }
        };
        const info = await mongo_update_single(query, set);
        return info;
    } else if (url_full.includes('/mongo_insert_query_api')) {
        const query = data_post_api.query;
        const info = await mongo_insert_query(query);
        return info;
    } else if (url_full.includes('/mongo_detect_single_api')) {
        const query = data_post_api.query;
        const info = await mongo_detect_single(query);
        return info;
    } else if (url_full.includes('/mongo_delete_query_api')) {
        const query = data_post_api.query;
        const info = await mongo_delete_query(query);
        return info;
    } else if (url_full.includes('/mongo_get_query_api')) {
        const query = data_post_api.query;
        const info = await mongo_get(query);
        return info;
    } else if (url_full.includes('/mongo_find_query')) {
        const query = data_post_api.query;
        const field = data_post_api.field;
        const info = await mongo_find_query(query, field);
        return info;
    } else if (url_full.includes('/mongo_update_single_api')) {
        const query = data_post_api.query;
        const set = data_post_api.set;
        const info = await mongo_update_single(query, set);
        return info;
    }
}
