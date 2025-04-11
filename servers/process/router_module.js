import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FindMyWay from 'find-my-way';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routes = JSON.parse(fs.readFileSync(path.join(__dirname, 'node_routes.json'), 'utf8'));

// Hàm processRoute giữ nguyên
async function processRoute(handlerObj) {
  const { module: modulePath, function: functionName } = handlerObj;
  const mod = await import(modulePath);
  let handlerFunc = mod[functionName];
  if (!handlerFunc && mod.default) {
    if (typeof mod.default === 'function') {
      handlerFunc = mod.default;
    } else if (typeof mod.default === 'object' && typeof mod.default[functionName] === 'function') {
      handlerFunc = mod.default[functionName];
    }
  }
  if (typeof handlerFunc !== 'function') {
    return "Handler không tồn tại";
  }
  return await handlerFunc();
}

// Hàm đệ quy để đăng ký route
function registerRoute(router, route, parentUri = '', send_api_success, send_api_error) {
  // Xây dựng URI đầy đủ
  let fullUri = parentUri;
  if (!route.uri.startsWith('/')) {
    fullUri += '/' + route.uri;
  } else {
    fullUri += route.uri;
  }

  // Nếu route có module và function, đăng ký route
  if (route.module && route.function) {
    const uriPattern = `${fullUri}/*`;
    router.on(['GET', 'POST'], fullUri, async (req, res, params) => {
      try {
        const result = await processRoute(route);
        send_api_success(res, result);
      } catch (error) {
        send_api_error(res, error);
      }
    });
    router.on(['GET', 'POST'], uriPattern, async (req, res, params) => {
      try {
        const result = await processRoute(route);
        send_api_success(res, result);
      } catch (error) {
        send_api_error(res, error);
      }
    });
  }

  // Nếu route có children, xử lý đệ quy
  if (route.children && Array.isArray(route.children)) {
    route.children.forEach(child => {
      registerRoute(router, child, fullUri, send_api_success, send_api_error);
    });
  }
}

export default async function router_module(req, res, send_api_success, send_api_error) {
  const router = FindMyWay({
    defaultRoute: (req, res) => send_api_error("Không tìm thấy")
  });

  // Đăng ký tất cả các route từ node_routes.json
  Object.values(routes).forEach(route => {
    registerRoute(router, route, '', send_api_success, send_api_error);
  });

  router.lookup(req, res);
}