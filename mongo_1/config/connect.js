import { MongoClient } from 'mongodb';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lấy đường dẫn đến file .env ở thư mục cha (2 cấp lên)
const envPath = path.join(__dirname, '..', '..', '.env');
console.log("Đường dẫn .env:", envPath);
dotenv.config({ path: envPath });

// Kiểm tra MONGO_URI từ biến môi trường
console.log("MONGO_URI:", process.env.MONGO_URI);
const uri = process.env.MONGO_URI;
if (!uri) {
  throw new Error("❌ Lỗi: MONGO_URI không được định nghĩa trong .env");
}

const client = new MongoClient(uri, { useUnifiedTopology: true });

// Xác định tên database dựa trên URI: nếu URL có chứa "editor" thì dùng "editor", ngược lại dùng "data_1"
let dbName = "data_1"; // mặc định
try {
  const url = new URL(uri);
  // Nếu phần pathname có chứa "editor", dùng "editor"
  if (url.pathname.toLowerCase().includes("editor")) {
    dbName = "editor";
  }
} catch (error) {
  console.error("Lỗi phân tích URI, sử dụng db mặc định:", error);
}

// Biến lưu trữ kết nối tới database
let db = null;

// Hàm kết nối một lần và tái sử dụng kết nối
export async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db(dbName);
    console.log(`Connected to MongoDB database: ${dbName}`);
  }
  return db;
}
