import { connectDB } from './connect.js';
const db = await connectDB();

export async function mongo_update_single(query, set) {
  try {
    const collection = db.collection("collection_1");

    const result = await collection.updateOne(query, set);
    console.log(`Matched ${result.matchedCount} document(s) and modified ${result.modifiedCount} document(s).`);
    if (result.modifiedCount > 0) {
      return {
        mongo_status: "success",
        mongo_results: "update_success",
      }
    } else {
      return {
        mongo_status: "success",
        mongo_results: "update_cancel",
      }
    }
  } catch (error) {
    console.error("Lỗi khi update:", error);
    return {
      mongo_status: "cancel",
      mongo_results: error.message,
    }
  } finally {
    console.error("đã xử lý hàm update:");
  }
}
