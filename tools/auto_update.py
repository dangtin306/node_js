import subprocess
import time

def check_and_pull():
    # Lấy thông tin mới từ remote
    subprocess.call(["git", "fetch"])
    # Kiểm tra trạng thái nhánh hiện tại (không kiểm tra các file không được theo dõi)
    status = subprocess.check_output(["git", "status", "-uno"]).decode("utf-8")
    if "Your branch is behind" in status:
        print("Phát hiện thay đổi trên remote, thực hiện git pull...")
        subprocess.call(["git", "pull"])
    else:
        print("Không có thay đổi trên remote.")

if __name__ == "__main__":
    # Chỉnh thời gian chờ giữa các lần kiểm tra (ở đây là 60 giây)
    while True:
        check_and_pull()
        time.sleep(60)
