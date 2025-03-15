import { connectDB } from "./connect.js";
const db = await connectDB();

// Hàm tiện ích: Tách chuỗi path (dấu .) và duyệt theo cấu trúc của đối tượng
function getValueByPath(obj, path) {
  return path.split('.').reduce((acc, key) => acc && acc[key], obj);
}

export async function mongo_get(fieldOrProjection) {
  // Nếu nhận được chuỗi, chuyển thành projection object
  const isString = typeof fieldOrProjection === "string";
  const projection = isString ? { [fieldOrProjection]: 1 } : fieldOrProjection;

  try {
    const collection = db.collection("collection_1");
    const result = await collection.findOne({}, { projection });

    let finalResult = null;
    if (result) {
      // Nếu chỉ select một field hoặc truyền vào chuỗi thì trích xuất giá trị
      finalResult = (isString || Object.keys(projection).length === 1)
        ? getValueByPath(result, isString ? fieldOrProjection : Object.keys(projection)[0])
        : result;
    }

    return {
      mongo_status: "success",
      mongo_results: finalResult,
    };
  } catch (error) {
    console.error("Lỗi khi lấy thông tin:", error);
    return {
      mongo_status: "cancel",
      mongo_results: error.message,
    };
  }
}

export async function mongo_detect_single(query) {
  if (!query || typeof query !== "object") {
    console.error("Invalid query object:", query);
    return {
      mongo_status: "cancel",
      mongo_results: `Invalid query object: ${JSON.stringify(query)}`,
    };
  }

  try {
    const collection = db.collection("collection_1");
    const result = await collection.findOne(query);
    const detect = result ? "detect_yes" : "detect_no";

    return {
      mongo_status: "success",
      mongo_results: detect,
    };
  } catch (error) {
    console.error("Error in mongo_detect_single:", error);
    return {
      mongo_status: "cancel",
      mongo_results: error.message,
    };
  }
}


export async function mongo_find_query(query, field) {
  try {
    const collection = db.collection("collection_1");

    // Tìm document dựa trên query
    const result = await collection.findOne(query);
    if (!result) {
      console.log("Không tìm thấy document phù hợp.");
      return { mongo_status: "cancel", mongo_results: "Không tìm thấy document phù hợp." };
    }

    // Xác định key của query, giả sử query có dạng: { "users.block_list.id_users": "2344" }
    const queryKeys = Object.keys(query);
    if (queryKeys.length === 0) {
      console.log("Query rỗng.");
      return { mongo_status: "cancel", mongo_results: "Query rỗng." };
    }
    const queryKey = queryKeys[0];

    // Tách đường dẫn chứa mảng và trường cần lọc
    const lastDotIndex = queryKey.lastIndexOf('.');
    if (lastDotIndex === -1) {
      console.log("Query không có định dạng phù hợp.");
      return { mongo_status: "cancel", mongo_results: "Query không có định dạng phù hợp." };
    }
    const basePath = queryKey.substring(0, lastDotIndex);
    const filterField = queryKey.substring(lastDotIndex + 1);
    const filterValue = query[queryKey];

    // Hàm tiện ích để truy xuất giá trị theo đường dẫn (path) từ một object
    function getNested(obj, path) {
      return path.split('.').reduce((acc, key) => acc && acc[key], obj);
    }

    // Lấy mảng chứa dữ liệu từ document dựa trên basePath (ví dụ: "users.block_list")
    const nestedData = getNested(result, basePath);
    if (!nestedData || !Array.isArray(nestedData)) {
      console.log(`Không tìm thấy mảng dữ liệu tại đường dẫn: ${basePath}`);
      return { mongo_status: "cancel", mongo_results: `Không tìm thấy mảng dữ liệu tại đường dẫn: ${basePath}` };
    }

    // Tìm phần tử trong mảng có filterField === filterValue
    const element = nestedData.find(item => item[filterField] == filterValue);
    if (!element) {
      console.log("Không tìm thấy phần tử phù hợp trong mảng.");
      return { mongo_status: "cancel", mongo_results: "Không tìm thấy phần tử phù hợp trong mảng." };
    }

    // Nếu có truyền field thì trả về giá trị của field đó, ngược lại trả về toàn bộ phần tử (JSON)
    const finalResult = field ? element[field] : element;

    return { mongo_status: "success", mongo_results: finalResult };
  } catch (error) {
    console.error("Lỗi khi lấy thông tin:", error);
    return { mongo_status: "cancel", mongo_results: error.message };
  }
}
