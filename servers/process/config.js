// main_process.js
import get_text_image from '../../ai/images_text_multi.js';
import router_module from './router_module.js';

export async function send_api_success(res, data) {
    if (!res.headersSent) {
        res.status(200).json({
            api_status: "success",
            api_results: data
        });
    }
}

export async function send_api_error(res, error) {
    if (!res.headersSent) {
        const data = error.message;
        if (data) {
            res.status(200).json({ api_status: "error", api_error_log: data });
        } else {
            res.status(200).json({ api_status: "error", api_error_log: error });
        }
    }
}
export async function main_process_url(req, res, send_api_success, send_api_error) {
    try {
        if (req.url.includes('/text_image_search') || req.url.includes('/text_speech') || req.url.includes('/speech_text')
            || req.url.includes('/exalink')) {
            try {
                get_text_image(req, res, send_api_error);
            } catch (error) {
                send_api_error(res, error); // Gửi kết quả qua send_api_success
            }
        } else {
            try {
                router_module(req, res, send_api_success, send_api_error);
            } catch (error) {
                send_api_error(res, error); // Gửi kết quả qua send_api_success
            }
        }
    } catch (error) {
        console.log(1234);
        send_api_error(res, error); // Gửi kết quả qua send_api_success
    }
}
