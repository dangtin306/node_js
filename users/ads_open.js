import {
    mongo_get,
    mongo_find_query,
    mongo_detect_single,
    mongo_insert_query,
    mongo_delete_query,
    mongo_update_single
} from '../mongo_1/config/main_process.js';
import { asyncLocalStorage } from '../requestContext.js';

export default async function ads_open() {
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');
    if (data_post_api && data_post_api.device_id) {
        const device_id = data_post_api.device_id;
        const query = { "app_structure.ads_open.device_id": device_id }
        const info = await mongo_detect_single(query);
        // Kiểm tra tồn tại và in ra kết quả
        if (info && info.mongo_results) {
            console.log(info.mongo_results); // Sẽ in ra "detect_no"
            if (info.mongo_results == 'detect_yes') {
                const ads_open = await mongo_find_query(query);
                console.log(ads_open.mongo_results.createdate); // Sẽ in ra "detect_no"
                const info_ads_open = ads_open.mongo_results;
                const createdate = info_ads_open.createdate;
                const adsDateUTC = createdate['$date'];
                const open_views = info_ads_open.open_views;

                // Thiết lập options để chuyển đổi sang định dạng ngày (year, month, day) theo múi giờ Việt Nam
                const options = { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' };

                // Chuyển đổi ngày của ads_open sang chuỗi ngày theo giờ Việt Nam
                const adsDateVN = new Date(adsDateUTC).toLocaleDateString('en-US', options);
                // Lấy ngày hiện tại theo giờ Việt Nam
                const todayVN = new Date().toLocaleDateString('en-US', options);

                // So sánh: nếu cùng ngày thì là true, ngược lại là false
                const isToday = (adsDateVN === todayVN);

                console.log(isToday); // In ra true nếu cùng ngày, false nếu không
                if (isToday) {
                    const set_ads_open = {
                        $inc: { "app_structure.ads_open.$.open_views": 1 }
                    };
                    const info_update = await mongo_update_single(query, set_ads_open);
                    if (open_views < 2) {
                        return ("1");
                    } else {
                        return ("0");
                    }
                } else {
                    const set_ads_open = {
                        $set: {
                            "app_structure.ads_open.$.createdate": { "$date": new Date().toISOString() },
                            "app_structure.ads_open.$.open_views": 0
                        }
                    };
                    const info_update = await mongo_update_single(query, set_ads_open);
                    return (info_update);
                }
                return (isToday);
            }
            else if (info.mongo_results == 'detect_no') {
                const insertData = {
                    "app_structure.ads_open": {
                        "device_id": device_id,
                        "open_views": 0,
                        "createdate": { "$date": new Date().toISOString() }
                    }
                };
                const insert_query = await mongo_insert_query(insertData);
                return (insert_query);
            }
        }
        else {
            return ('không tìm thấy');
        }
    } else {
        return ('ko có device_id');
    }
}