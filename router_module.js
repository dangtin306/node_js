import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FindMyWay from 'find-my-way';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routes = JSON.parse(fs.readFileSync(path.join(__dirname, 'node_routes.json'), 'utf8'));

async function processRoute(route) {
  const { module: modulePath, function: functionName } = route.handler;
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

export default async function router_module(req, res, send_api_success, send_api_error) {
  const router = FindMyWay({
    defaultRoute: (req, res) => send_api_error("Không tìm thấy")
  });

  Object.values(routes).forEach(route => {
    if (route.handlers && Array.isArray(route.handlers)) {
      route.handlers.forEach(handler => {
        let fullUri = route.uri;
        if (!handler.uri.startsWith('/')) {
          fullUri += '/' + handler.uri;
        } else {
          fullUri += handler.uri;
        }
        const uriPattern = `${fullUri}/*`;
        router.on(['GET', 'POST'], fullUri, async (req, res, params) => {
          try {
            const result = await processRoute({ handler });
            send_api_success(result);
          } catch (error) {
            send_api_error(error);
          }
        });
        router.on(['GET', 'POST'], uriPattern, async (req, res, params) => {
          try {
            const result = await processRoute({ handler });
            send_api_success(result);
          } catch (error) {
            send_api_error(error);
          }
        });
      });
    } else if (route.handler) {
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

  router.lookup(req, res);
}
