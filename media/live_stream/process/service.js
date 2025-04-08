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
import { io } from "socket.io-client";

export default async function service() {
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');
    const url_full = asyncLocalStorage.getStore().get('url_full');
    const url_param = asyncLocalStorage.getStore().get('url_param');

    if (url_full.includes('/get_link_live')) {
        // Ví dụ xử lý liên quan đến device_id và live_uri
        const device_id = url_param.device_id;
        let info = await mongo_find_query({ "external_connect.devices.lists.device_id": device_id }, "id");
        const id_device = info.mongo_results;

        let live_uri = await mongo_find_query({ "media.audio.lives_url.id_devices": id_device }, "live_uri");
        live_uri = live_uri.mongo_results;
        live_uri = `http://vip.tecom.pro:3027/live/${live_uri}/playlist.m3u8`;
        return live_uri;
    } else if (url_full.includes('/socket_live')) {
        const id_streams_relay = data_post_api.id_streams_relay;
        const socket_control = data_post_api.socket_control;
        // Kết nối đến server socket (ví dụ: localhost:3028)
        const socket = io("http://localhost:3028");

        socket.on("connect", () => {
            console.log("Đã kết nối Socket.IO");

            // Gửi sự kiện với tên socket_control và dữ liệu chứa id_streams_relay
            socket.emit(socket_control, { linklive: id_streams_relay }, (response) => {
                // Callback để xác nhận server đã nhận sự kiện
                if (response) {
                    console.log(`Server xác nhận nhận sự kiện ${socket_control}:`, response);
                } else {
                    console.log(`Đã gửi sự kiện ${socket_control} với dữ liệu: { linklive: ${id_streams_relay} }`);
                }
            });

            // Sau khi gửi sự kiện, đợi 3 giây rồi ngắt kết nối và kết thúc tiến trình
            setTimeout(() => {
                socket.disconnect();
                console.log("Đã ngắt kết nối và kết thúc tiến trình");
            }, 3000);
        });

        socket.on("connect_error", (error) => {
            console.error("Lỗi kết nối Socket.IO:", error);
            process.exit(1);
        });

        socket.on("disconnect", () => {
            return("Đã ngắt kết nối từ server");
        });
    } else {
        return "ko tìm thấy";
    }
}