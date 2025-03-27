// main_process.js
import get_text_image from './ai/images_text_multi.js';
import router_module from './router_module.js';
import { asyncLocalStorage } from './requestContext.js';
import getRawBody from 'raw-body';
// Hàm xử lý logic cho text image search
const textImageSearch = () => {
    // Giả sử đây là hàm thực hiện logic tìm kiếm và có thể ném lỗi nếu có vấn đề
    // Nếu thành công, trả về dữ liệu
    return { message: "Kết quả tìm kiếm hình ảnh dựa trên văn bản" };
};

export default async function main_process(req, res) {

    const send_api_success = (data) => {
        if (!res.headersSent) {
            res.status(200).json({
                api_status: "success", api_results: data
            });
        }
    };
    const send_api_error = (error) => {
        if (!res.headersSent) {
            const data = error.message;
            if (data) {
                res.status(200).json({ api_status: "error", api_error_log: data });
            } else {
                res.status(200).json({ api_status: "error", api_error_log: error });
            }
        }
    };
    try {

        asyncLocalStorage.run(new Map([['url_full', req.url]]), async () => {
            // Sử dụng host từ header để làm base URL (đảm bảo req.headers.host tồn tại)
            const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
            // Chuyển đổi các query parameter thành object
            const url_param = Object.fromEntries(parsedUrl.searchParams.entries());
            console.log(req.url);
            asyncLocalStorage.getStore().set('url_full', req.url);
            // Nếu muốn lưu vào asyncLocalStorage:
            asyncLocalStorage.getStore().set('url_param', url_param);

            asyncLocalStorage.getStore().set('req_body', req.body);
            if (req.method === 'POST') {
                try {
                    let body;
                    if (req.readable) {
                        // Nếu stream còn khả năng đọc, sử dụng raw-body
                        body = await getRawBody(req, {
                            length: req.headers['content-length'],
                            limit: '1mb', // Giới hạn kích thước nếu cần
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
        send_api_error(error); // Gửi kết quả qua send_api_success
    }
}
export async function main_process_url(req, res, send_api_success, send_api_error) {
    try {
        if (req.url.includes('/main_1') || req.url.includes('/main_2')) {
            router_module(req, res, send_api_success, send_api_error);
        } else {
            try {
                get_text_image(req, res, send_api_error);
            } catch (error) {
                send_api_error(error); // Gửi kết quả qua send_api_success
            }
        }
    } catch (error) {
        console.log(1234);
        send_api_error(error); // Gửi kết quả qua send_api_success
    }
}
