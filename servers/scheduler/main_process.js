import { send_api_success, send_api_error, main_process_url } from '../process/config.js';
import { asyncLocalStorage } from '../../requestContext.js';
import getRawBody from 'raw-body';

console.log("connect mqtt_server");
export default async function main_process(req, res) {

    try {

        asyncLocalStorage.run(new Map(), async () => {
            // Sử dụng host từ header để làm base URL (đảm bảo req.headers.host tồn tại)
            const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
            // Chuyển đổi các query parameter thành object
            const url_param = Object.fromEntries(parsedUrl.searchParams.entries());
            console.log(req.url);
            asyncLocalStorage.getStore().set('url_full', req.url);
            // Nếu muốn lưu vào asyncLocalStorage:
            asyncLocalStorage.getStore().set('url_param', url_param);
            if (req.method === 'POST') {
                try {
                    let body;
                    if (req.readable) {
                        // Nếu stream còn khả năng đọc, sử dụng raw-body
                        body = await getRawBody(req, {
                            length: req.headers['content-length'],
                            limit: '100mb', // Giới hạn kích thước nếu cần
                            encoding: true
                        });
                    } else if (req.body) {
                        // Nếu request đã được xử lý bởi middleware (ví dụ express.json())
                        body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
                    } else {
                        throw new Error('Không có dữ liệu POST có sẵn');
                    }

                    let data_post_api;
                    try {
                        data_post_api = JSON.parse(body);
                    } catch (error) {
                        data_post_api = body;
                    }
                    asyncLocalStorage.getStore().set('data_post_api', data_post_api);
                    main_process_url(req, res, send_api_success, send_api_error);
                } catch (err) {
                    console.error('Error reading POST body:', err);
                }
            }
            else {
                main_process_url(req, res, send_api_success, send_api_error);
            }
        });
    } catch (error) {
        send_api_error(res, error); // Gửi kết quả qua send_api_success
    }
}
