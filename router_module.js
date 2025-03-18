import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FindMyWay from 'find-my-way';

// Thiết lập __dirname cho môi trường ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đọc file node_routes.json chứa cấu hình route
const routes = JSON.parse(fs.readFileSync(path.join(__dirname, 'node_routes.json'), 'utf8'));

/**
 * Hàm processRoute:
 * - Lấy đường dẫn module và tên hàm cần chạy từ route.handler trong JSON.
 * - Dynamic import module đó.
 * - Tìm hàm cần chạy từ module hoặc từ export default.
 * - Nếu tìm thấy, gọi hàm và trả về kết quả.
 */
async function processRoute(route) {
  const { module: modulePath, function: functionName } = route.handler; // Lấy module và tên hàm từ JSON
  const mod = await import(modulePath); // Import module động
  let handlerFunc = mod[functionName]; // Tìm hàm theo tên trong module

  // Nếu không tìm thấy, kiểm tra xem export default có chứa hàm đó không
  if (!handlerFunc && mod.default) {
    if (typeof mod.default === 'function') {
      handlerFunc = mod.default;
    } else if (typeof mod.default === 'object' && typeof mod.default[functionName] === 'function') {
      handlerFunc = mod.default[functionName];
    }
  }

  // Nếu không tìm thấy hàm, trả về thông báo lỗi
  if (typeof handlerFunc !== 'function') {
    return "Handler không tồn tại";
  }
  // Gọi hàm và trả về kết quả (sử dụng await nếu hàm trả về Promise)
  return await handlerFunc();
}

/**
 * Hàm router_module:
 * - Tạo router từ FindMyWay với defaultRoute khi không tìm thấy route.
 * - Đăng ký từng route từ file JSON.
 * - Khi có request, gọi processRoute để xử lý và gửi kết quả qua send_api_success.
 */
export default async function router_module(req, res, send_api_success, send_api_error) {
  const router = FindMyWay({
    defaultRoute: (req, res) => send_api_error("Không tìm thấy") // Gửi phản hồi nếu không có route khớp
  });

  // Đăng ký các route từ node_routes.json
  // Đăng ký các route từ node_routes.json
  // Lặp qua tất cả các route
  Object.values(routes).forEach(route => {
    // Nếu route có nhiều handler (là mảng "handlers")
    if (route.handlers && Array.isArray(route.handlers)) {
      route.handlers.forEach(handler => {
        // Ghép nối uri gốc với uri của handler
        let fullUri = route.uri;
        console.log(fullUri);
        if (!handler.uri.startsWith('/')) {
          fullUri += '/' + handler.uri;
        } else {
          fullUri += handler.uri;
        }
        
        const uriPattern = `${fullUri}/*`;

        // Đăng ký route chính
        router.on(['GET', 'POST'], fullUri, async (req, res, params) => {
          try {
            // Bọc handler thành đối tượng có thuộc tính "handler"
            const result = await processRoute({ handler });
            send_api_success(result);
          } catch (error) {
            send_api_error(error);
          }
        });

        // Đăng ký wildcard route cho các subpath của handler
        router.on(['GET', 'POST'], uriPattern, async (req, res, params) => {
          try {
            const result = await processRoute({ handler });
            send_api_success(result);
          } catch (error) {
            send_api_error(error);
          }
        });
      });
    }
    // Nếu route có 1 handler duy nhất (theo cấu trúc cũ)
    else if (route.handler) {
      const uriPattern = `${route.uri}/*`;

      router.on(['GET', 'POST'], route.uri, async (req, res, params) => {
        try {
          const result = await processRoute(route);
          send_api_success(result);
        } catch (error) {
          send_api_error(error);
        }
      });

      router.on(['GET', 'POST'], uriPattern, async (req, res, params) => {
        try {
          const result = await processRoute(route);
          send_api_success(result);
        } catch (error) {
          send_api_error(error);
        }
      });
    }
  });


  // Thực hiện tra cứu route dựa trên req và res
  router.lookup(req, res);
}
