import { MongoClient } from 'mongodb';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
// Load biến môi trường từ file .env
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lấy đường dẫn đến file .env ở thư mục cha (2 cấp lên)
const envPath = path.join(__dirname, '..', '..', '.env');

console.log(envPath);
dotenv.config({ path: envPath });
// dotenv.config({ path: envPath });
// console.log(process.env)
console.log("MONGO_URI:", process.env.MONGO_URI); // Kiểm tra giá trị

// Lấy URI từ biến môi trường
const uri = process.env.MONGO_URI;
if (!uri) {
  throw new Error("❌ Lỗi: MONGO_URI không được định nghĩa trong .env");
}
const client = new MongoClient(uri, { useUnifiedTopology: true });

// Biến lưu trữ kết nối tới database
let db = null;

// Hàm kết nối một lần và tái sử dụng kết nối
export async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db("data_1");
    console.log("Connected to MongoDB");
  }
  return db;
}
