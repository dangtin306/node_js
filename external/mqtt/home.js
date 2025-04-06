import mqtt from 'mqtt';
import readline from 'readline';

const brokerUrl = 'mqtt://vip.tecom.pro:1883';

// Flag để đảm bảo khởi tạo MQTT server chỉ một lần
let isMqttServerInitialized = false;
// Biến lưu trữ client để sử dụng cho các lần gọi sau
let client = null;

export default async function mqtt_server(device_id, passedMessage) {
    // Nếu server đã khởi tạo rồi, chỉ cần gửi message nếu có và thoát luôn
    if (isMqttServerInitialized) {
        if (passedMessage) {
            const publishTopic = `server/send/${device_id}`;
            let messageToSend;
            if (typeof passedMessage === 'object') {
                messageToSend = JSON.stringify(passedMessage);
            } else {
                messageToSend = passedMessage;
            }
            client.publish(publishTopic, messageToSend, {}, (err) => {
                if (err) {
                    console.error('Error sending message:', err);
                } else {
                    console.log(`Message sent to topic ${publishTopic}: ${messageToSend}`);
                }
            });
        }
        return;
    }
    isMqttServerInitialized = true;

    // Các topics cần subscribe
    const subscribeTopics = [`server/send/${device_id}`, 'device/send/#'];

    // Kết nối đến MQTT broker
    client = mqtt.connect(brokerUrl);

    client.on('connect', () => {
        console.log('Connected to MQTT broker');
        client.subscribe(subscribeTopics, (err) => {
            if (!err) {
                console.log(`Subscribed to topics: ${subscribeTopics.join(', ')}`);
            } else {
                console.error('Error subscribing:', err);
            }
        });

        // Nếu có truyền biến message vào hàm thì gửi ngay lập tức
        if (passedMessage) {
            const publishTopic = `server/send/${device_id}`;
            let messageToSend;
            if (typeof passedMessage === 'object') {
                messageToSend = JSON.stringify(passedMessage);
            } else {
                messageToSend = passedMessage;
                if (messageToSend.trim() === "1") {
                    messageToSend = JSON.stringify({ command_code: 1 });
                }
            }
            client.publish(publishTopic, messageToSend, {}, (err) => {
                if (err) {
                    console.error('Error sending message:', err);
                } else {
                    console.log(`Message sent to topic ${publishTopic}: ${messageToSend}`);
                }
            });
        } else {
            console.log(`Enter a message to send to topic server/send/${device_id} (e.g., Turn on LED):`);
        }
    });

    client.on('message', (topic, message) => {
        if (topic.startsWith('device/send/')) {
            const parts = topic.split('/');
            const devId = parts.length >= 3 ? parts[2] : 'unknown';
            console.log(`Received message from ${topic}: ${message.toString()} (device_id: ${devId})`);
        } else {
            console.log(`Received message from ${topic}: ${message.toString()}`);
        }
    });

    client.on('error', (err) => {
        console.error('Connection error:', err);
    });

    // Tạo giao diện dòng lệnh để nhập message từ người dùng
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on('line', (input) => {
        const publishTopic = `server/send/${device_id}`;
        let inputMessage = input;
        if (input.trim() === "1") {
            inputMessage = JSON.stringify({ command_code: 1 });
        }
        client.publish(publishTopic, inputMessage, {}, (err) => {
            if (err) {
                console.error('Error sending message:', err);
            } else {
                console.log(`Message sent to topic ${publishTopic}: ${inputMessage}`);
            }
        });
    });
}
