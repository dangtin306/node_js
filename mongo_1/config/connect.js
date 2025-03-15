import { MongoClient } from 'mongodb';

// Cấu hình URI kết nối
const uri = "mongodb://admin:180105@vip.tecom.pro:1801/?authMechanism=SCRAM-SHA-256";
const client = new MongoClient(uri, { useUnifiedTopology: true });

// Biến lưu trữ kết nối tới database
let db = null;

// Hàm kết nối một lần và tái sử dụng kết nối
export async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db("data_1");
    console.log("Đã kết nối tới MongoDB");
  }
  return db;
}
