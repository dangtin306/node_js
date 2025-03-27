import os
import subprocess
import time

# Lấy đường dẫn tuyệt đối của file hiện tại
current_file = os.path.abspath(__file__)
# Lấy thư mục chứa file hiện tại (là folder "tools")
tools_dir = os.path.dirname(current_file)
# Lấy thư mục cha của "tools" (là repo)
repo_dir = os.path.dirname(tools_dir)

print(f"Repo directory: {repo_dir}")

def check_and_pull():
    # Chạy lệnh git trong thư mục repo
    subprocess.call(["git", "fetch"], cwd=repo_dir)
    status = subprocess.check_output(["git", "status", "-uno"], cwd=repo_dir).decode("utf-8")
    if "Your branch is behind" in status:
        print("Phát hiện thay đổi trên remote, thực hiện git pull...")
        subprocess.call(["git", "pull"], cwd=repo_dir)
    else:
        print("Không có thay đổi trên remote.")

if __name__ == "__main__":
    while True:
        check_and_pull()
        time.sleep(60)
