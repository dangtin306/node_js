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

export default async function sidebar_menu() {
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');
    const url_full = asyncLocalStorage.getStore().get('url_full');
    const url_param = asyncLocalStorage.getStore().get('url_param');

    const apikey = url_param.apikey;
    const main_domain = url_param.main_domain;
    const national_market = url_param.national_market;
    const auth_logic = (apikey && apikey.length >= 5) ? 1 : 0;

    if (main_domain) {
        // 1) Chuẩn bị query và field
        const query = {
            "app_structure.app_fontend.sidebar_menu.menu_buttons.auth_logic": { $exists: true }
        };
        const field = {
            path: "app_structure.app_fontend.sidebar_menu.menu_buttons",
            domain: [main_domain],
            auth_logic: [auth_logic],
            status: "show"
        };
        // 2) Gọi mongo_get_multi
        let menu_buttons = await mongo_get_multi(query, field);
        // 3) Nếu có lỗi (mongo_status !== "success"), trả về luôn object lỗi
        if (menu_buttons.mongo_status !== "success") {
            return menu_buttons;  // logic cũ không đổi
        }
        // 4) Lấy mảng thực từ mongo_results
        menu_buttons = menu_buttons.mongo_results;
        // 5) Lọc (filter) theo cả national_market

        let filter_category = menu_buttons.filter(item =>
            Array.isArray(item.national_market) &&
            item.national_market.includes(national_market)
        );
        // console.log(filter_category);
        // Sắp xếp sao cho phần tử có stt nhỏ nhất nằm đầu tiên
        filter_category.sort((a, b) => a.stt - b.stt);

        let i = 0;
        const logic_done = [];

        while (i < filter_category.length) {
            const category = filter_category[i];
            const option = category.option;
            if (option) {
                const query = {
                    "app_structure.app_fontend.sidebar_menu.services": { $exists: true }
                };
                const field = {
                    path: "app_structure.app_fontend.sidebar_menu.services",
                    status: "show",
                    category: [option]
                };
                let services = await mongo_get_multi(query, field);
                if (services.mongo_status !== "success") {
                    return services;
                }
                services = services.mongo_results;
                const filter_services = services.filter(item =>
                    Array.isArray(item.national_market) &&
                    item.national_market.includes(national_market)
                );
                // Sắp xếp sao cho phần tử có stt nhỏ nhất nằm đầu tiên
                filter_services.sort((a, b) => a.stt - b.stt);
                logic_done.push({
                    ...category,
                    data: filter_services
                });
            } else {
                logic_done.push({
                    ...category,
                    data: []
                });
            }
            i++;
        }

        const output = { sidebar_menu: logic_done };
        return output;
    }
    else {
        return "ok";
    }
}