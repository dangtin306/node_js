import {
    mongo_get,
    mongo_get_multi,
    mongo_find_query,
    mongo_detect_single,
    mongo_json_count,
    mongo_insert_query,
    mongo_delete_query,
    mongo_update_single,
    mongo_update_multi
} from '../../../mongo_1/config/main_process.js';
import { asyncLocalStorage } from '../../../requestContext.js';

export default async function service() {
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');
    const url_full = asyncLocalStorage.getStore().get('url_full');
    const url_param = asyncLocalStorage.getStore().get('url_param');
    if (url_full.includes('/get_link_live')) {
        const device_id = url_param.device_id;
        let info = await mongo_find_query({ "external_connect.devices.lists.device_id": device_id }, "id");
        const id_device = info.mongo_results;
        
        let live_uri = await mongo_find_query({ "media.audio.streams.id_devices": id_device }, "live_uri");
        live_uri = live_uri.mongo_results;
        live_uri = `http://vip.tecom.pro:3027/live/${live_uri}/playlist.m3u8`;
        return live_uri;
    }
    else {
        return "ko tìm thấy";
    }
}