import {
    mongo_get,
    mongo_get_multi,
    mongo_find_query,
    mongo_detect_single,
    mongo_json_count,
    mongo_insert_query,
    mongo_delete_query,
    mongo_update_single
} from '../mongo_1/config/main_process.js';
import { asyncLocalStorage } from '../requestContext.js';

export default async function device() {
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');
    const url_full = asyncLocalStorage.getStore().get('url_full');
    const url_param = asyncLocalStorage.getStore().get('url_param');
    if (url_full.includes('/device_id')) {
        // console.log(url_param);
        const device_id = url_param.device_id;
        const device_type = url_param.device_type;

        if (device_id) {
            // console.log(url_param);
            let detect_device = await mongo_detect_single({
                "external_connect.micro_chip.device_id": device_id,
                "external_connect.micro_chip.device_type": device_type
            });
            detect_device = detect_device.mongo_results;
            if (detect_device == "detect_yes") {
                return " có device_id";
            } else {
                let query = { "external_connect.micro_chip.device_type": device_type };
                let maxId = await mongo_json_count(query);
                maxId = maxId.mongo_results;
                const newDevice = {
                    "id": maxId + 1,
                    "device_id": device_id, // Thay đổi giá trị theo ý bạn
                    "device_type": device_type,
                    "device_title": device_id,
                    "created_date": new Date(),
                    "ver": 1
                };
                query = { "external_connect.micro_chip": newDevice };
                const info = await mongo_insert_query(query);
                return "ko có device_id đã thêm vô cơ sở dữ liệu" + info;
            }
        }
        else {
            return "ko có device_id";

        }
    } else if (url_full.includes('/device_id')) {
        // console.log(url_param);
        const device_id = url_param.device_id;
        const device_type = url_param.device_type;

        if (device_id) {
            // console.log(url_param);
            let detect_device = await mongo_detect_single({
                "external_connect.micro_chip.device_id": device_id,
                "external_connect.micro_chip.device_type": device_type
            });
            detect_device = detect_device.mongo_results;
            if (detect_device == "detect_yes") {
                return " có device_id";
            } else {
                let query = { "external_connect.micro_chip.device_type": device_type };
                let maxId = await mongo_json_count(query);
                maxId = maxId.mongo_results;
                const newDevice = {
                    "id": maxId + 1,
                    "device_id": device_id, // Thay đổi giá trị theo ý bạn
                    "device_type": device_type,
                    "device_title": device_id,
                    "created_date": new Date(),
                    "ver": 1
                };
                query = { "external_connect.micro_chip": newDevice };
                const info = await mongo_insert_query(query);
                return "ko có device_id đã thêm vô cơ sở dữ liệu" + info;
            }
        }
        else {
            return "ko có device_id";

        }
    } else if (url_full.includes('/devices_users')) {
        let mongo_status = false;
        const id_users = data_post_api.id_users;
        if (id_users) {
            let id_control = await mongo_find_query({ "media.audio.users.id_users": id_users }, "id_control");
            // console.log(id_control);
            mongo_status = id_control.mongo_status;
            id_control = id_control.mongo_results;
            if (mongo_status == "success") {
                const query = { "media.audio.files": { $exists: true } };
                const field = {
                    path: "media.audio.files",
                    filter_field: "id_control",
                    filter_values: id_control
                };
                const result = await mongo_get_multi(query, field);
                return result;
                // return info;
            } else {
                return "ko có file";
            }
        }
        else {
            return "ko có id_users";
        }
    }
    else {
        return "ko tìm thấy";
    }
}