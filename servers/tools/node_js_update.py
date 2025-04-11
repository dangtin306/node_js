import os
import subprocess
import time

# Lấy đường dẫn tuyệt đối của file hiện tại
current_file = os.path.abspath(__file__)
# Lấy thư mục chứa file hiện tại (là folder "tools")
tools_dir = os.path.dirname(current_file)
# Lấy thư mục cha của "tools" (là repo)
repo_dir = os.path.dirname(tools_dir)

# Đường dẫn thư mục reactapp cần reset
reactapp_dir = r"C:\hustmedia5\reactapp"

print(f"Repo directory: {repo_dir}")
print(f"ReactApp directory: {reactapp_dir}")

def check_and_pull(directory):
    """
    Kiểm tra cập nhật và thực hiện git pull nếu cần ở thư mục được chỉ định.
    """
    try:
        # Chạy lệnh git fetch
        subprocess.call(["git", "fetch"], cwd=directory)
        status = subprocess.check_output(["git", "status", "-uno"], cwd=directory).decode("utf-8")
        if "Your branch is behind" in status:
            print(f"Phát hiện thay đổi trên remote ở {directory}, thực hiện git pull...")
            subprocess.call(["git", "pull"], cwd=directory)
        else:
            print(f"Không có thay đổi trên remote ở {directory}.")
    except Exception as e:
        print(f"Đã xảy ra lỗi với thư mục {directory}: {e}")

if __name__ == "__main__":
    while True:
        print("Kiểm tra repo chính...")
        check_and_pull(repo_dir)
        print("Chờ 30 giây...\n")
        time.sleep(30)
        print("Kiểm tra thư mục ReactApp...")
        check_and_pull(reactapp_dir)
        print("Chờ 30 giây...\n")
        time.sleep(30)
