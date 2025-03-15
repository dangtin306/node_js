import { connectDB } from "./connect.js";

const db = await connectDB();

export async function mongo_delete_query(query) {
  try {
    const collection = db.collection("collection_1");

    // Sử dụng $pull để xóa giá trị khỏi mảng users.block_list.device_id
    const result = await collection.updateMany(
      {}, // update tất cả các document
      { $pull: query }
    );

    if (result.modifiedCount > 0) {
      return {
        mongo_status: "success",
        mongo_results: "delete_success",
      };
    } else {
      return {
        mongo_status: "cancel",
        mongo_results: "delete_cancel",
      };
    }
  } catch (error) {
    console.error("Lỗi khi delete:", error);
    return {
      mongo_status: "cancel",
      mongo_results: error.message,
    };
  }
}
