// Import various MongoDB query functions from the main process configuration.
import {
    mongo_get,                // Function to get data from MongoDB.
    mongo_find_query,         // Function to find documents based on a query.
    mongo_detect_single,      // Function to detect a single document.
    mongo_insert_query,       // Function to insert a document.
    mongo_delete_query,       // Function to delete a document.
    mongo_update_single,     // Function to update a single document.
    mongo_update_multi
} from '../mongo_1/config/main_process.js';

// Import asyncLocalStorage to manage request-specific context.
import { asyncLocalStorage } from '../requestContext.js';


export default async function editor() {
    // Retrieve the full URL and posted data
    const url_full = asyncLocalStorage.getStore().get('url_full');
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');

    // Check if the URL is meant for updating the device_title
    if (url_full.includes('/edit')) {
        // Extract necessary fields from the posted data
        const { device_id, device_title } = data_post_api;

        if (!device_id || !device_title) {
            return { error: "device_id and device_title are required" };
        }

        // MongoDB query to update only the device_title field
        const updateResult = await mongo_update_single(
            // Query to find the correct device
            { "external_connect.devices.lists.device_id": device_id }, 
            {
                $set: {
                    "external_connect.devices.lists.$.device_title": device_title
                }
            }
        );

        return updateResult;
    }

    //     else if (url_full.includes('/delete')) {
    //         // TODO: Add code to handle deletion logic here.
    //         return "code here";
    //     }
}