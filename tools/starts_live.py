import requests
import json

# URL API
url = "http://localhost:2999/main_2/users/back_up/full"

try:
    # Gửi yêu cầu GET
    response = requests.get(url)
    response.raise_for_status()  # Kiểm tra lỗi HTTP
    data = response.json()

    # Kiểm tra nếu "mongo_status" là "success" và "_id" tồn tại
    mongo_results = data.get("api_results", {}).get("mongo_results", {})

    if data.get("api_results", {}).get("mongo_status") == "success" and "_id" in mongo_results:
        # Đường dẫn lưu file
        file_path = r"D:\hustmedia\backup\nosql\mongo.json"

        # Ghi dữ liệu vào file JSON
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(mongo_results, f, ensure_ascii=False, indent=4)

        print(f"Dữ liệu đã được lưu vào {file_path}")
    else:
        print("Không lấy được dữ liệu từ mongo_results hoặc trạng thái không thành công.")
except requests.exceptions.RequestException as e:
    print("Lỗi khi gửi yêu cầu:", e)
except Exception as ex:
    print("Đã xảy ra lỗi:", ex)
