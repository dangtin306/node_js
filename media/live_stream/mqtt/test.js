import mqtt from 'mqtt';
import readline from 'readline';

// Cấu hình MQTT broker
const brokerUrl = 'mqtt://vip.tecom.pro:1883';
const topic = 'test/topic';

// Kết nối tới MQTT broker
const client = mqtt.connect(brokerUrl);

// Sự kiện khi kết nối thành công
client.on('connect', () => {
    console.log('Đã kết nối tới MQTT broker');
    // Đăng ký nhận tin nhắn từ topic
    client.subscribe(topic, (err) => {
        if (!err) {
            console.log(`Đã subscribe vào topic: ${topic}`);
        } else {
            console.error('Lỗi khi subscribe:', err);
        }
    });
    console.log('Nhập tin nhắn để gửi tới topic test/topic (ví dụ: Bật LED):');
});

// Xử lý nhận tin nhắn từ MQTT broker
client.on('message', (topic, message) => {
    console.log(`Nhận tin nhắn từ ${topic}: ${message.toString()}`);
});

// Sự kiện khi có lỗi
client.on('error', (err) => {
    console.error('Lỗi kết nối:', err);
});

// Tạo giao diện nhập lệnh từ console
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Xử lý khi người dùng nhập tin nhắn
rl.on('line', (input) => {
    client.publish(topic, input, {}, (err) => {
        if (err) {
            console.error('Lỗi khi gửi tin nhắn:', err);
        } else {
            console.log(`Đã gửi tin nhắn: ${input}`);
        }
    });
});
