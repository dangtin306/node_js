import mqtt from 'mqtt';
import readline from 'readline';

// Cấu hình MQTT broker
const brokerUrl = 'mqtt://vip.tecom.pro:1883';
const deviceId = 'f850119e9ef0';

// Các topic cần subscribe:
// - "server/send/deviceId": nhận thông báo kết nối từ thiết bị
// - "device/send/#": nhận phản hồi từ tất cả các thiết bị
const subscribeTopics = [`server/send/${deviceId}`, 'device/send/#'];

// Kết nối tới MQTT broker
const client = mqtt.connect(brokerUrl);

client.on('connect', () => {
    console.log('Đã kết nối tới MQTT broker');
    // Đăng ký nhận tin nhắn từ các topic đã cấu hình
    client.subscribe(subscribeTopics, (err) => {
        if (!err) {
            console.log(`Đã subscribe vào topics: ${subscribeTopics.join(', ')}`);
        } else {
            console.error('Lỗi khi subscribe:', err);
        }
    });
    console.log(`Nhập tin nhắn để gửi tới topic server/send/${deviceId} (ví dụ: Bật LED):`);
});

client.on('message', (topic, message) => {
    // Kiểm tra nếu topic bắt đầu bằng "device/send/" thì tách lấy device_id
    if (topic.startsWith('device/send/')) {
        const parts = topic.split('/');
        const devId = parts.length >= 3 ? parts[2] : 'unknown';
        console.log(`Nhận tin nhắn từ ${topic}: ${message.toString()} (device_id: ${devId})`);
    } else {
        console.log(`Nhận tin nhắn từ ${topic}: ${message.toString()}`);
    }
});

client.on('error', (err) => {
    console.error('Lỗi kết nối:', err);
});

// Tạo giao diện nhập lệnh từ console
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Xử lý khi người dùng nhập tin nhắn, gửi tin nhắn qua topic "server/send/deviceId"
rl.on('line', (input) => {
    const publishTopic = `server/send/${deviceId}`;
    client.publish(publishTopic, input, {}, (err) => {
        if (err) {
            console.error('Lỗi khi gửi tin nhắn:', err);
        } else {
            console.log(`Đã gửi tin nhắn đến topic ${publishTopic}: ${input}`);
        }
    });
});
