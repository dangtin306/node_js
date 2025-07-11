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
} from '../mongo_1/config/main_process.js';
import { asyncLocalStorage } from '../requestContext.js';
import mqtt_server from '../servers/mqtt/home.js';

export default async function devices() {
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');
    const url_full = asyncLocalStorage.getStore().get('url_full');
    const url_param = asyncLocalStorage.getStore().get('url_param');
    if (url_full.includes('/device_id_insert')) {
        // console.log(url_param);
        const device_id = url_param.device_id;
        const device_type = url_param.device_type;
        const device_model = url_param.device_model;

        if (device_id && device_type && device_model) {
            // console.log("dsfdfs" + device_model);
            let detect_device = await mongo_detect_single({
                "external_connect.devices.lists.device_id": device_id,
                "external_connect.devices.lists.device_model": device_model
            });
            detect_device = detect_device.mongo_results;

            if (detect_device == "detect_yes") {
                return " có device_id";
            } else {
                let maxId = await mongo_get("external_connect.devices.lists");
                maxId = maxId.mongo_results;
                maxId = maxId.reduce((max, data) => data.id > max ? data.id : max, 0);
                const newDevice = {
                    "id": maxId + 1,
                    "device_id": device_id, // Thay đổi giá trị theo ý bạn
                    "device_type": device_type,
                    "device_model": device_model,
                    "device_title": device_id,
                    "created_date": new Date(),
                    "status_device": true,
                    "status_connect": true,
                    "volume": 15,
                    "ver": 1
                };
                let query = { "external_connect.devices.lists": newDevice };
                console.log(query);
                const info = await mongo_insert_query(query);
                return "ko có device_id đã thêm vô cơ sở dữ liệu" + info;
            }
        }
        else {
            return "ko có device_id";
        }
    } else if (url_full.includes('/device_users_get')) {
        let mongo_status = false;
        const id_users = data_post_api.id_users;
        if (id_users) {
            let id_devices = await mongo_find_query({ "users.devices.id_users": id_users }, "id_devices");
            // console.log(id_devices);
            mongo_status = id_devices.mongo_status;
            id_devices = id_devices.mongo_results;
            console.log(id_devices);

            if (mongo_status == "success") {
                const query = { "external_connect.devices.lists": { $exists: true } };
                const field = {
                    path: "external_connect.devices.lists",
                    id: id_devices
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
    } else if (url_full.includes('/device_full')) {
        // Hàm biến đổi dữ liệu
        function transformDevices(devices) {
            return devices.map(device => ({
                id: device.id,
                live_control: `live_${device.id}`,
                socket_control: `socket_live_${device.id}`,
                id_devices: device.id,
                device_id: device.device_id
            }));
        }

        // Sử dụng hàm với kết quả từ mongo_get
        const result = await mongo_get("external_connect.devices.lists");
        if (result.mongo_status === "success") {
            const transformedResults = transformDevices(result.mongo_results);
            const updateFields = {};
            updateFields["media.audio.lives_url"] = transformedResults;
            console.log(updateFields);
            // MongoDB query to update multiple fields
            const updateResult = await mongo_update_multi(
                { "media.audio.lives_url": { $type: "array" } },
                { $set: updateFields }
            );
            return (updateResult);
        } else {
            return ("Lỗi:", result.mongo_results);
        }
    } else if (url_full.includes('/device_edit')) {
        return data_post_api;
    } else if (url_full.includes('/volume_control')) {

        let command_action = data_post_api.command_action;
        let id_devices = data_post_api.id_devices;
        let device_id = await mongo_find_query({ "external_connect.devices.lists.id": id_devices }, "device_id");
        device_id = device_id.mongo_results;

        let scaled_value = Math.round((command_action / 100) * 21);
        // Khởi tạo đối tượng với các thuộc tính tương ứng
        let data = {
            command_code: 4,
            command_action: scaled_value,
            device_id: device_id
        };

        // Chuyển đối tượng thành chuỗi JSON và in ra console
        data = JSON.stringify(data);
        const query = {  "external_connect.devices.lists.id": id_devices };
        const set = {
            $set: { "external_connect.devices.lists.$.volume": command_action }
        };
        const info = await mongo_update_single(query, set);
        mqtt_server(device_id, data);
        return info;
    } 
    else if (url_full.includes('/device_restart')) {
        let id_devices = data_post_api.id_devices;
        let device_id = await mongo_find_query({ "external_connect.devices.lists.id": id_devices }, "device_id");
        device_id = device_id.mongo_results;
        // Khởi tạo đối tượng với các thuộc tính tương ứng
        let data = {
            command_code: 1,
            device_id: device_id
        };

        // Chuyển đối tượng thành chuỗi JSON và in ra console
        data = JSON.stringify(data);
        mqtt_server(device_id, data);
        return "ok";
    }
    else if (url_full.includes('/radio_restart')) {
        let id_devices = data_post_api.id_devices;
        let device_id = await mongo_find_query({ "external_connect.devices.lists.id": id_devices }, "device_id");
        device_id = device_id.mongo_results;
        // Khởi tạo đối tượng với các thuộc tính tương ứng
        let data = {
            command_code: 3,
            device_id: device_id
        };

        // Chuyển đối tượng thành chuỗi JSON và in ra console
        data = JSON.stringify(data);
        mqtt_server(device_id, data);
        return data_post_api;
    }
    else {
        return "ok";
    }
}