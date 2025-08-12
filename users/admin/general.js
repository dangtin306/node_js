// Import various MongoDB query functions from the main process configuration.
import {
    mongo_get,                // Function to get data from MongoDB.
    mongo_find_query,         // Function to find documents based on a query.
    mongo_detect_single,      // Function to detect a single document.
    mongo_insert_query,       // Function to insert a document.
    mongo_delete_query,       // Function to delete a document.
    mongo_update_single,     // Function to update a single document.
    mongo_update_multi,
    mongo_get_multi
} from '../../mongo_1/config/main_process.js';
import { asyncLocalStorage } from '../../requestContext.js';
// Import asyncLocalStorage to manage request-specific context.
import { db_connect } from '../../servers/sql/main.js';


export default async function admin() {
    // Retrieve the full URL and posted data
    const url_full = asyncLocalStorage.getStore().get('url_full');
    const data_post_api = asyncLocalStorage.getStore().get('data_post_api');
    const conn = await db_connect();

    // Check if the URL is meant for updating the device_title
    if (url_full.includes('/data_home')) {
        const apikey = data_post_api.apikey;
        const [rows] = await conn.execute(
            'SELECT `id` FROM `users` WHERE `key` = ?',
            [apikey]
        );
        // Lấy thẳng id_users (nếu không có bản ghi thì null)
        const id_users = rows[0]?.id ?? null;

        let level_manage = await mongo_find_query({ "users.settings.id_users": id_users }, "level_manage");
        const query = { "settings.admin.data_home": { $exists: true } };
        const field = {
            path: "settings.admin.data_home",
            level_manage: { $gt: level_manage }   // <-- lọc: item.level_manage > level_manage
        };
        const data_home = await mongo_get_multi(query, field);
        return data_home;
    } else if (url_full.includes('/edit_2')) {
        // Destructure necessary fields
        const {
            device_id,
            device_title,
            device_type,
            device_model,
            status_device,
            status_connect,
            ver
        } = data_post_api;

        if (!device_id) {
            return { error: "device_id is required" };
        }

        // Construct the update fields dynamically
        const updateFields = {};
        if (device_title !== undefined) updateFields["external_connect.devices.lists.$.device_title"] = device_title;
        if (device_type !== undefined) updateFields["external_connect.devices.lists.$.device_type"] = device_type;
        if (device_model !== undefined) updateFields["external_connect.devices.lists.$.device_model"] = device_model;
        if (status_device !== undefined) updateFields["external_connect.devices.lists.$.status_device"] = status_device;
        if (status_connect !== undefined) updateFields["external_connect.devices.lists.$.status_connect"] = status_connect;
        if (ver !== undefined) updateFields["external_connect.devices.lists.$.ver"] = ver;

        // MongoDB query to update multiple fields
        const updateResult = await mongo_update_multi(
            { "external_connect.devices.lists.device_id": device_id },
            { $set: updateFields }
        );

        return updateResult;
    } else {
        return { error: "device_id is required" };
    }

    //     else if (url_full.includes('/delete')) {
    //         // TODO: Add code to handle deletion logic here.
    //         return "code here";
    //     }
}