import mqtt from 'mqtt';
import readline from 'readline';

// MQTT broker configuration
const brokerUrl = 'mqtt://vip.tecom.pro:1883';
const deviceId = 'f850119e9ef0';

// Topics to subscribe:
// - "server/send/deviceId": receive connection notifications from the device
// - "device/send/#": receive responses from all devices
const subscribeTopics = [`server/send/${deviceId}`, 'device/send/#'];

// Connect to MQTT broker
const client = mqtt.connect(brokerUrl);

client.on('connect', () => {
    console.log('Connected to MQTT broker');
    // Subscribe to the configured topics
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
    // Check if the topic starts with "device/send/", then extract the device_id
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

// Handle user input, send message to topic "server/send/deviceId"
rl.on('line', (input) => {
    const publishTopic = `server/send/${deviceId}`;
    let message = input; // default to sending the exact input message

    // If the input is "1", convert to JSON with command_code: 1
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
