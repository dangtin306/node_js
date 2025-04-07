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
        
        info = await mongo_find_query({ "media.audio.streams.id_devices": id_device }, "live_uri");
        return info;
        // Hàm biến đổi dữ liệu
        // function transformDevices(devices) {
        //     return devices.map(device => ({
        //         id: device.id,
        //         live_control: `live_${device.id}`,
        //         socket_control: `socket_live_${device.id}`,
        //         id_devices: device.id,
        //         device_id: device.device_id
        //     }));
        // }

        // // Sử dụng hàm với kết quả từ mongo_get
        // const result = await mongo_get("external_connect.devices.lists");
        // if (result.mongo_status === "success") {
        //     const transformedResults = transformDevices(result.mongo_results);
        //     const updateFields = {};
        //     updateFields["media.audio.streams"] = transformedResults;
        //     console.log(updateFields);
        //     // MongoDB query to update multiple fields
        //     const updateResult = await mongo_update_multi(
        //         { "media.audio.streams": { $type: "array" } },
        //         { $set: updateFields }
        //     );
        //     return (updateResult);
        // } else {
        //     return ("Lỗi:", result.mongo_results);
        // }
    }
    else {
        return "ko tìm thấy";
    }
}