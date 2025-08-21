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

    const apikey = data_post_api.apikey;
    const main_domain = data_post_api.main_domain;
    const national_market = data_post_api.national_market;
    const auth_logic = (apikey && apikey.length >= 5) ? 1 : 0;

    if (main_domain) {
        // 1) Chuẩn bị query và field
        const query = {
            "app_structure.app_fontend.sidebar_menu.menu_buttons": { $exists: true }
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

        let filter_major_genres = menu_buttons.filter(item =>
            Array.isArray(item.national_market) &&
            item.national_market.includes(national_market)
        );
        // console.log(filter_major_genres);
        // Sắp xếp sao cho phần tử có stt nhỏ nhất nằm đầu tiên
        filter_major_genres.sort((a, b) => a.stt - b.stt);
        let i = 0;
        const major_genres_done = [];
        while (i < filter_major_genres.length) {
            const major_genres = filter_major_genres[i];
            const option = major_genres.option;

            if (option) {
                const query = {
                    [`app_structure.app_fontend.home_menu.${option}`]: { $exists: true }
                };
                const field = {
                    path: `app_structure.app_fontend.home_menu.${option}`,
                    domain: [main_domain],
                    auth_logic: [auth_logic],
                    status: "show"
                };
                let services = await mongo_get_multi(query, field);

                console.log(services);
                if (services.mongo_status !== "success") {
                    return services;
                }
                services = services.mongo_results;

                // lọc & sắp xếp
                const filter_major_genres = services
                    .filter(item =>
                        Array.isArray(item.national_market) &&
                        item.national_market.includes(national_market)
                    )
                    .sort((a, b) => a.stt - b.stt);

                // đổi tên major_name → label, category_img → icon_src
                for (const svc of filter_major_genres) {
                    const { major_name, category_img, ...rest } = svc;
                    major_genres_done.push({
                        ...rest,
                        label: major_name,
                        icon_src: category_img
                    });
                }
            }
            else {
                major_genres.data = [];
                major_genres_done.push(major_genres);
            }

            i++;
        }

        // console.log(major_genres_done);

        i = 0;
        const logic_done = [];

        while (i < major_genres_done.length) {
            const category = major_genres_done[i];
            const option = category.option;
            const category_services = category.category_services;

            if (option) {
                // 1) Lấy sub-categories
                const query1 = {
                    ["app_structure.app_fontend.home_menu.categories"]: { $exists: true }
                };
                const field1 = {
                    path: `app_structure.app_fontend.home_menu.categories`,
                    category_pro: option,
                    domain: [main_domain],
                    status: "show",
                    status_sidebar: "show"
                };
                let res1 = await mongo_get_multi(query1, field1);
                if (res1.mongo_status !== "success") {
                    return res1;
                }
                const services1 = res1.mongo_results;

                // Lọc, sắp xếp, đổi tên trường sub-categories
                const subcats = services1
                    .filter(item =>
                        Array.isArray(item.national_market) &&
                        item.national_market.includes(national_market)
                    )
                    .sort((a, b) => a.stt - b.stt)
                    .map(({ category_name, category_img, ...rest }) => ({
                        ...rest,
                        label: category_name,
                        icon_src: category_img
                    }));

                // 2) Với mỗi subcat, gọi tiếp để lấy services con, gán vào subcat.data
                for (let j = 0; j < subcats.length; j++) {
                    const sub = subcats[j];
                    const opt2 = sub.option;
                    if (opt2) {
                        const query2 = {
                            "app_structure.app_fontend.home_menu.services": { $exists: true }
                        };
                        const field2 = {
                            path: "app_structure.app_fontend.home_menu.services",
                            status: "show",
                            category: [opt2]
                        };
                        let res2 = await mongo_get_multi(query2, field2);
                        if (res2.mongo_status !== "success") {
                            return res2;
                        }
                        const services2 = res2.mongo_results
                            .filter(item =>
                                Array.isArray(item.national_market) &&
                                item.national_market.includes(national_market)
                            )
                            .sort((a, b) => a.stt - b.stt)
                            // Đổi tên service_name → label, service_img → icon_src
                            .map(({ service_name, service_img, ...rest }) => ({
                                ...rest,
                                label: service_name,
                                icon_src: service_img
                            }));

                        sub.data = services2;
                    } else {
                        sub.data = [];
                    }
                }


                // 3) Push single object cha, với data = mảng subcats đã “độn” data con vào
                logic_done.push({
                    ...category,
                    data: subcats
                });
            } else if (category_services) {
                // Lấy tất cả services cho 1 category (category_services là string)
                const query = {
                    "app_structure.app_fontend.home_menu.services": { $exists: true }
                };
                const field = {
                    path: "app_structure.app_fontend.home_menu.services",
                    status: "show",
                    category: [category_services]  // <-- dùng string trực tiếp
                };
                let res = await mongo_get_multi(query, field);
                if (res.mongo_status !== "success") {
                    return res;
                }
                const services = res.mongo_results
                    .filter(item =>
                        Array.isArray(item.national_market) &&
                        item.national_market.includes(national_market)
                    )
                    .sort((a, b) => (a.stt || 0) - (b.stt || 0))
                    .map(({ service_name, service_img, ...rest }) => ({
                        ...rest,
                        label: service_name,
                        icon_src: service_img
                    }));

                // Gán trực tiếp mảng services vào data của category
                logic_done.push({
                    ...category,
                    data: services
                });
            } else {
                // không có option → giữ nguyên, data = []
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