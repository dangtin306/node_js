// mqtt_websocket_log.js
import mqtt from "mqtt";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 0 }); // cache không tự xóa

export default function mqtt_servers_code_item() {
  const url = "ws://vip.tecom.pro:8793";
  const client = mqtt.connect(url);

  client.on("connect", () => {
    console.log("✅ Server đã kết nối MQTT broker");
    client.subscribe("server_log", (err) => {
      if (err) console.error("❌ Không thể subscribe server_log:", err.message);
      else console.log("📡 Server lắng nghe topic: server_log");
    });
  });

  client.on("message", (t, msg) => {
    const text = msg.toString();
    console.log(`💬 [LOG] ${text}`);

    // 📦 Nếu message là JSON — xử lý dữ liệu client gửi
    try {
      const data = JSON.parse(text);

      if (data?.mode === "posts" && data?.category) {
        const clientId = t; // topic = clientId

        if (cache.has(clientId)) {
          const oldData = cache.get(clientId);
          const updated = { ...oldData, [data.category]: data.value };
          cache.set(clientId, updated);

          console.log(`✅ Đã cập nhật cache cho ${clientId}:`, updated);
          client.publish(clientId, JSON.stringify(updated));
          console.log(`📨 Đã phản hồi tới ${clientId}:`, updated);

        } else {
          console.log(`⚠️ Nhận dữ liệu từ ${clientId} nhưng cache chưa tồn tại.`);
        }
      }
    } catch {
      // Không phải JSON -> bỏ qua
    }

    // 📥 Khi client kết nối
    const matchConnect = text.match(/Client\s+([a-zA-Z0-9_-]+)\s+đã\s+kết\s+nối/i);
    if (matchConnect) {
      const clientId = matchConnect[1];

      // 👉 Server bắt đầu lắng nghe riêng client này
      client.subscribe(clientId, (err) => {
        if (err) return console.error(`❌ Không thể subscribe ${clientId}:`, err.message);
        console.log(`📡 Server đang lắng nghe topic client: ${clientId}`);
      });

      // Nếu client mới -> thêm vào cache và subscribe
      if (!cache.has(clientId)) {
        cache.set(clientId, { upload_videos_check: false });
        console.log(`🧠 Đã lưu cache cho ${clientId}`);
        // Sau 500ms, kiểm tra lại cache
        setTimeout(() => {
          const data = cache.get(clientId);
          console.log(`🕒 500ms sau => Cache của ${clientId}:`, data);

          client.publish(clientId, JSON.stringify(data));
          console.log(`📨 Đã phản hồi tới ${clientId}:`, data);
        }, 500);
      } else {
        const data = cache.get(clientId);
        console.log(`📂 Cache hiện tại của ${clientId}:`, data);
        client.publish(clientId, JSON.stringify(data));
        console.log(`📨 Đã phản hồi tới ${clientId}:`, data);
      }
    }

    // 📤 Khi client ngắt kết nối (bắt mọi kiểu thông báo)
    const matchDisconnect = text.match(/Client\s+([a-zA-Z0-9_-]+).*?(ngắt|disconnect|lost|timeout)/i);
    if (matchDisconnect) {
      const clientId = matchDisconnect[1];

      console.log(`⚡ Phát hiện tín hiệu ngắt kết nối từ client: ${clientId}`);
      console.log(`🧾 Toàn bộ nội dung log nhận được: "${text}"`);

      if (cache.has(clientId)) {
        console.log(`📦 Client ${clientId} vẫn tồn tại trong cache — chỉ hủy subscribe, KHÔNG xóa cache.`);

        client.unsubscribe(clientId, (err) => {
          if (err) {
            console.error(`⚠️ Không thể hủy subscribe ${clientId}:`, err.message);
          } else {
            console.log(`🔕 Đã hủy lắng nghe topic của ${clientId}`);
          }
        });
      } else {
        console.log(`ℹ️ Client ${clientId} không có trong cache hoặc đã bị xóa trước đó.`);
      }
    }
  });

  client.on("error", (err) => console.error("⚠️ MQTT error:", err.message));
  client.on("close", () => console.log("🔴 MQTT WebSocket disconnected"));
}
