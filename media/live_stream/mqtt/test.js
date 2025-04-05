import mqtt from 'mqtt';
import readline from 'readline';

// Cấu hình MQTT broker
const brokerUrl = 'mqtt://vip.tecom.pro:1883';
// Các topic cần subscribe: ở đây ESP32 gửi thông báo kết nối và phản hồi lệnh qua "server/response"
// và bạn cũng muốn gửi lệnh qua "test/topic"
const subscribeTopics = ['test/topic', 'server/response'];

// Kết nối tới MQTT broker
const client = mqtt.connect(brokerUrl);

client.on('connect', () => {
    console.log('Đã kết nối tới MQTT broker');
    // Đăng ký nhận tin nhắn từ các topic cần lắng nghe
    client.subscribe(subscribeTopics, (err) => {
        if (!err) {
            console.log(`Đã subscribe vào topics: ${subscribeTopics.join(', ')}`);
        } else {
            console.error('Lỗi khi subscribe:', err);
        }
    });
    console.log('Nhập tin nhắn để gửi tới topic test/topic (ví dụ: Bật LED):');
});

client.on('message', (topic, message) => {
    console.log(`Nhận tin nhắn từ ${topic}: ${message.toString()}`);
});

client.on('error', (err) => {
    console.error('Lỗi kết nối:', err);
});

// Tạo giao diện nhập lệnh từ console
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Xử lý khi người dùng nhập tin nhắn, gửi tin nhắn qua topic "test/topic"
rl.on('line', (input) => {
    client.publish('test/topic', input, {}, (err) => {
        if (err) {
            console.error('Lỗi khi gửi tin nhắn:', err);
        } else {
            console.log(`Đã gửi tin nhắn: ${input}`);
        }
    });
});
