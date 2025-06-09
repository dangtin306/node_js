import { mongo_insert_query } from './insert_process.js';


export async function mongo_insert_id(query, set) {
  // Tạo object với key động
  const insertData = {
    [query]: set
  };

  // Gọi hàm insert và trả về toàn bộ kết quả
  const result = await mongo_insert_query(insertData);
  return result;
}