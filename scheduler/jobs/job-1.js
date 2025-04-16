import { parentPort, workerData } from 'worker_threads';
import axios from 'axios';

const { url, data } = workerData;

console.log(data);

// try {
//   const response = await axios.post(url, data, {
//     headers: {
//       'Content-Type': 'application/json'
//     }
//   });

//   console.log('API response:', response.data);

//   if (parentPort) parentPort.postMessage('API post job completed successfully.');
// } catch (error) {
//   console.error('Error posting to API:', error.message);

//   if (parentPort) parentPort.postMessage('Job 1 Field!');
// }