import {
    mongo_get,
    mongo_find_query,
    mongo_detect_single,
    mongo_insert_query,
    mongo_delete_query,
    mongo_update_single
} from '../mongo_1/config/main_process.js';


export default async function test() {
    const query = { "users.pass.id": 3545343 };
    const set = {
        $set: { "users.pass.$.value": "1234567" }
    };
    const info = await mongo_update_single(query, set);
    return info;
}