import {
  mongo_get,
  mongo_get_multi,
  mongo_find_query,
  mongo_detect_single,
  mongo_json_count,
  mongo_insert_query,
  mongo_delete_query,
  mongo_update_single,
  mongo_update_multi
} from './main_process.js';



export async function mongo_insert_id(query, set) {
  function hasIdField(obj) {
    return Object.prototype.hasOwnProperty.call(obj, 'id');
  }
  if (hasIdField(set)) {
    return "lỗi có trường id";
  } else {
    // Tạo object với key động
    let maxId = await mongo_get(query);
    maxId = maxId.mongo_results;
    maxId = maxId.reduce((max, data) => data.id > max ? data.id : max, 0);
    // Clone `set` và gán thêm id
    const payload = {
      id: maxId + 1,
      ...set
    };
    const insertData = {
      [query]: payload
    };

    // Gọi hàm insert và trả về toàn bộ kết quả
    const result = await mongo_insert_query(insertData);
    return result;
  }
}