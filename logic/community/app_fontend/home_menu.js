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

export default async function home_menu() {
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');
    const url_full = asyncLocalStorage.getStore().get('url_full');
    const url_param = asyncLocalStorage.getStore().get('url_param');

    const apikey = url_param.apikey;
    const category_pro = url_param.category_pro;
    const main_domain = url_param.main_domain;
    const national_market = url_param.national_market;
    if (main_domain && main_domain.includes('hust')) {
        // 1) Chuẩn bị query và field
        const query = {
            "app_structure.app_fontend.home_menu.categories.category_pro": category_pro
        };
        const field = {
            path: "app_structure.app_fontend.home_menu.categories"
        };
        // 2) Gọi mongo_get_multi
        let categories = await mongo_get_multi(query, field);

        // 3) Nếu có lỗi (mongo_status !== "success"), trả về luôn object lỗi
        if (categories.mongo_status !== "success") {
            return categories;  // logic cũ không đổi
        }

        // 4) Lấy mảng thực từ mongo_results
        categories = categories.mongo_results;

        // 5) Lọc (filter) theo cả national_market và domain
        //    - item.national_market phải chứa giá trị national_market
        //    - item.domain phải là mảng và chứa main_domain
        const filter_category = categories.filter(item =>
            Array.isArray(item.national_market) &&
            item.national_market.includes(national_market) &&
            Array.isArray(item.domain) &&
            item.domain.includes(main_domain)
        );
        let i = 0;
        const logic_done = [];
        
        while (i < filter_category.length) {
          const category = filter_category[i];
          const category_id = category.id;
          const query = {
            "app_structure.app_fontend.home_menu.services.category_id": category_id
          };
          const field = { path: "app_structure.app_fontend.home_menu.services" };
          let services = await mongo_get_multi(query, field);
          if (services.mongo_status !== "success") {
            return services;
          }
          services = services.mongo_results;
          const filter_services = services.filter(item =>
            Array.isArray(item.national_market) &&
            item.national_market.includes(national_market)
          );
          logic_done.push({
            ...category,
            data: filter_services
          });
          i++;
        }
        
        const output = { home_menu: logic_done };
        return output;
    }
    else {
        return "ok";
    }
}