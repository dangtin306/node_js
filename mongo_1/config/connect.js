import { MongoClient } from 'mongodb';

import dotenv from 'dotenv';
// Load biến môi trường từ file .env
dotenv.config();
// Lấy URI từ biến môi trường
const uri = process.env.MONGO_URI;
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
