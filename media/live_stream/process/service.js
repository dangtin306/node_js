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

async function handleSocketLive(id_streams_relay, socket_control) {
    return new Promise((resolve, reject) => {
        const socket = io("http://localhost:3028");
        const timeout = 5000; // Timeout sau 5 giây

        // Thiết lập timeout để tự động reject nếu không nhận phản hồi
        const timer = setTimeout(() => {
            console.error("Timeout: Không nhận được phản hồi từ server");
            socket.disconnect();
            reject(new Error("Timeout: Không nhận được phản hồi từ server"));
        }, timeout);

        // Khi kết nối thành công
        socket.on("connect", () => {
            console.log("Đã kết nối Socket.IO");

            // Gửi sự kiện tới server
            socket.emit(socket_control, { linklive: id_streams_relay }, (response) => {
                clearTimeout(timer); // Hủy timeout khi nhận được phản hồi
                if (response) {
                    console.log(`Server xác nhận nhận sự kiện ${socket_control}:`, response);
                    resolve(response);
                } else {
                    console.log(`Đã gửi sự kiện ${socket_control} với dữ liệu: { linklive: ${id_streams_relay} }`);
                    resolve("Đã gửi sự kiện nhưng không nhận được phản hồi từ server");
                }
            });

            // Ngắt kết nối sau 3 giây
            setTimeout(() => {
                socket.disconnect();
                console.log("Đã ngắt kết nối");
            }, 3000);
        });

        // Xử lý lỗi kết nối
        socket.on("connect_error", (error) => {
            clearTimeout(timer);
            console.error("Lỗi kết nối Socket.IO:", error);
            reject(error);
        });

        // Xác nhận ngắt kết nối từ server
        socket.on("disconnect", () => {
            console.log("Đã ngắt kết nối từ server");
        });
    });
}
export default async function service() {
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');
    const url_full = asyncLocalStorage.getStore().get('url_full');
    const url_param = asyncLocalStorage.getStore().get('url_param');

    if (url_full.includes('/get_link_live')) {
        // Ví dụ xử lý liên quan đến device_id và live_uri
        const device_id = url_param.device_id;
        let info = await mongo_find_query({ "external_connect.devices.lists.device_id": device_id }, "id");
        const id_devices = info.mongo_results;

        let live_uri = await mongo_find_query({ "media.audio.lives_url.id_devices": id_devices }, "live_uri");
        live_uri = live_uri.mongo_results;
        live_uri = `http://vip.tecom.pro:3027/live/${live_uri}/playlist.m3u8`;
        return live_uri;
    } else if (url_full.includes('/socket_live')) {
        const id_streams_relay = data_post_api.id_streams_relay;
        const socket_control = data_post_api.socket_control;
        // Kết nối đến server socket (ví dụ: localhost:3028)
        try {
            const result = await handleSocketLive(id_streams_relay, socket_control);
            console.log("Kết quả từ hàm handleSocketLive:", result);
            return result;
        } catch (error) {
            console.error("Lỗi khi xử lý Socket.IO:", error);
            return "Lỗi khi xử lý Socket.IO";
        }
    } else {
        return "ko tìm thấy";
    }
}

