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
// Hàm mongo_get_multi sử dụng aggregation pipeline để lọc mảng files theo id_control
export async function mongo_get_multi(query, field) {
  try {
    const collection = db.collection("collection_1"); // Thay bằng tên collection thực tế

    // Xây dựng pipeline với $match
    const pipeline = [{ $match: query }];

    if (typeof field === "string") {
      // Nếu field là chuỗi, chỉ thực hiện projection đơn giản
      pipeline.push({
        $project: {
          _id: 0,
          result: `$${field}`
        }
      });
    } else if (typeof field === "object" && field.path) {
      // Nếu field là object và có path, kiểm tra xem có cấu hình filter hay không
      if (field.filter_field && Array.isArray(field.filter_values)) {
        pipeline.push({
          $project: {
            _id: 0,
            result: {
              $filter: {
                input: `$${field.path}`,
                as: "item",
                cond: { $in: [`$$item.${field.filter_field}`, field.filter_values] }
              }
            }
          }
        });
      } else {
        // Nếu không có cấu hình filter, chỉ cần projection theo field.path
        pipeline.push({
          $project: {
            _id: 0,
            result: `$${field.path}`
          }
        });
      }
    } else {
      throw new Error("Invalid field parameter");
    }

    const results = await collection.aggregate(pipeline).toArray();

    // Gộp kết quả từ tất cả các document thành một mảng duy nhất
    const items = results.flatMap(doc => doc.result);

    return {
      mongo_status: "success",
      mongo_results: items,
    };
  } catch (error) {
    console.error("Error in mongo_get_multi:", error);
    return {
      mongo_status: "cancel",
      mongo_results: error.message,
    };
  }
}

export async function count_document(query) {
  if (!query || typeof query !== "object") {
    console.error("Invalid query object:", query);
    return {
      mongo_status: "cancel",
      mongo_results: `Invalid query object: ${JSON.stringify(query)}`,
    };
  }

  try {
    const collection = db.collection("collection_1");
    const count = await collection.countDocuments(query);
    return {
      mongo_status: "success",
      mongo_results: count,
    };
  } catch (error) {
    console.error("Error in count_document:", error);
    return {
      mongo_status: "cancel",
      mongo_results: error.message,
    };
  }
}

export async function mongo_json_count(query) {
  if (!query || typeof query !== "object") {
    console.error("Invalid query object:", query);
    return {
      mongo_status: "cancel",
      mongo_results: `Invalid query object: ${JSON.stringify(query)}`,
    };
  }

  try {
    const collection = db.collection("collection_1");
    const pipeline = [
      { $match: query },
      { $project: { elementCount: { $size: "$media.audio.files" } } },
      { $group: { _id: null, totalCount: { $sum: "$elementCount" } } }
    ];

    const aggResult = await collection.aggregate(pipeline).toArray();
    const totalCount = aggResult.length > 0 ? aggResult[0].totalCount : 0;

    return {
      mongo_status: "success",
      mongo_results: totalCount,
    };
  } catch (error) {
    console.error("Error in mongo_json_count:", error);
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
      console.log("Not found document phù hợp.");
      return { mongo_status: "cancel", mongo_results: "Not found document phù hợp." };
    }

    // Xác định key của query
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

    // Hàm tiện ích để truy xuất giá trị theo đường dẫn từ một object
    function getNested(obj, path) {
      return path.split('.').reduce((acc, key) => acc && acc[key], obj);
    }

    // Lấy mảng dữ liệu từ document dựa trên basePath
    const nestedData = getNested(result, basePath);
    if (!nestedData || !Array.isArray(nestedData)) {
      console.log(`Not found mảng dữ liệu tại đường dẫn: ${basePath}`);
      return { mongo_status: "cancel", mongo_results: `Not found mảng dữ liệu tại đường dẫn: ${basePath}` };
    }

    // Tìm phần tử trong mảng có filterField === filterValue.
    // Nếu item[filterField] là mảng, kiểm tra xem có chứa filterValue không.
    const element = nestedData.find(item => {
      const value = item[filterField];
      if (Array.isArray(value)) {
        return value.includes(filterValue);
      }
      return value == filterValue;
    });

    if (!element) {
      console.log("Not found phần tử phù hợp trong mảng.");
      return { mongo_status: "cancel", mongo_results: "Not found phần tử phù hợp trong mảng." };
    }

    // Nếu có truyền field thì trả về giá trị của field đó, ngược lại trả về toàn bộ phần tử (JSON)
    const finalResult = field ? element[field] : element;

    return { mongo_status: "success", mongo_results: finalResult };
  } catch (error) {
    console.error("Lỗi khi lấy thông tin:", error);
    return { mongo_status: "cancel", mongo_results: error.message };
  }
}
