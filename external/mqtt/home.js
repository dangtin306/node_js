import mqtt from 'mqtt';
import readline from 'readline';

const brokerUrl = 'mqtt://vip.tecom.pro:1883';
const deviceId = 'f850119e9ef0';

// Flag to ensure the function runs only once
let isMqttServerInitialized = false;

export default async function mqtt_server() {
    // If already initialized, skip subsequent calls
    if (isMqttServerInitialized) {
        console.log('MQTT server has already been initialized. Skipping this call.');
        return;
    }
    isMqttServerInitialized = true;

    // Topics to subscribe to
    const subscribeTopics = [`server/send/${deviceId}`, 'device/send/#'];

    // Connect to the MQTT broker
    const client = mqtt.connect(brokerUrl);

    client.on('connect', () => {
        console.log('Connected to MQTT broker');
        // Subscribe to the defined topics
        client.subscribe(subscribeTopics, (err) => {
            if (!err) {
                console.log(`Subscribed to topics: ${subscribeTopics.join(', ')}`);
            } else {
                console.error('Error subscribing:', err);
            }
        });
        console.log(`Enter a message to send to topic server/send/${deviceId} (e.g., Turn on LED):`);
    });

    client.on('message', (topic, message) => {
        // If the topic starts with "device/send/", extract the device_id
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

    // Create a command-line interface for user input
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Listen for user input and send messages to the topic "server/send/deviceId"
    rl.on('line', (input) => {
        const publishTopic = `server/send/${deviceId}`;
        let message = input;
        // If the input is "1", convert it to JSON with command_code: 1
        if (input.trim() === "1") {
            message = JSON.stringify({ command_code: 1 });
        }
        client.publish(publishTopic, message, {}, (err) => {
            if (err) {
                console.error('Error sending message:', err);
            } else {
                console.log(`Message sent to topic ${publishTopic}: ${message}`);
            }
        });
    });
}
