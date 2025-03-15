import { connectDB } from './connect.js';
const db = await connectDB();

export async function mongo_insert_query(query) {
  try {
    const collection = db.collection("collection_1");

    // Dùng $push để thêm giá trị mới vào mảng, không làm thay đổi giá trị đã có
    const result = await collection.updateMany(
      {}, // update tất cả các document
      { $push: query }
    );

    // Nếu có ít nhất 1 document được update thì trả về success
    if (result.modifiedCount > 0) {
      return {
        mongo_status: "success",
        mongo_results: "insert_success",
      };
    } else {
      return {
        mongo_status: "cancel",
        mongo_results: "insert_cancel",
      };
    }
  } catch (error) {
    console.error("Lỗi khi insert:", error);
    return {
      mongo_status: "cancel",
      mongo_results: error.message,
    };
  }
}
