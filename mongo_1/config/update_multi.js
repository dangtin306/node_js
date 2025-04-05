import { connectDB } from './connect.js';
const db = await connectDB();


export async function mongo_update_multi() {
  try {
    await client.connect();
    const collection = db.collection("collection_1");

    // Sử dụng {} để update tất cả các document
    const result = await collection.updateMany(
      {},
      { $set: { "users.block_list.device_id": "12345" } }
    );
    console.log(`Đã cập nhật ${result.modifiedCount} document.`);
  } catch (error) {
    console.error("Error update document:", error);
  } finally {
    await client.close();
  }
}