import os
import subprocess
import time
import psutil
import pyautogui

time.sleep(1)
# Lệnh wmic để lấy thông tin các tiến trình
wmic_command = 'wmic process get processid,commandline'
node_processes = subprocess.Popen(wmic_command, stdout=subprocess.PIPE, shell=True).communicate()[0].decode().split('\n')

# Tìm và xử lý các tiến trình có chứa 'images_text' hoặc 'texttovoice_ok' trong commandline
for process_info in node_processes:
    if 'show_main' in process_info  or 'live_streams_main' in process_info:
        # print(process_info)
        info_parts = process_info.split()
        if len(info_parts) >= 2:
            cmd_pid = info_parts[-1]  # PID của cmd
            print(f"Đóng cửa sổ cmd có PID: {cmd_pid}")
            subprocess.Popen(['taskkill', '/F', '/PID', cmd_pid], shell=True).wait()


# Sử dụng PowerShell để đóng tất cả các cửa sổ cmd
# Tạo độ trễ 2 giây
# time.sleep(2)
# powershell_command = "Get-Process | Where-Object {$_.ProcessName -eq 'cmd'} | ForEach-Object {Stop-Process -Id $_.Id -Force}"
# subprocess.Popen(["powershell.exe", "-Command", powershell_command], shell=True).wait()
# Đường dẫn thư mục hiện tại
time.sleep(2)
# Đường dẫn thư mục hiện tại
# current_dir = os.getcwd()
watch_dir = r"C:\hustmedia6\nodejs\main_server\media\live_stream\multi"

# File chính cần chạy
main_script = os.path.join(watch_dir, "show_main.js")

print(f"Running nodemon with watch: {watch_dir}")
print(f"Main script: {main_script}")

# Chạy nodemon trong cửa sổ CMD mới

subprocess.Popen(
    f'start cmd /k nodemon --watch "{watch_dir}" "{main_script}"',
    shell=True
)

time.sleep(1.5)
    
# File chính cần chạy
main_script = os.path.join(watch_dir, "live_streams_main.js")

print(f"Running nodemon with watch: {watch_dir}")
print(f"Main script: {main_script}")

# Chạy nodemon trong cửa sổ CMD mới

subprocess.Popen(
    f'start cmd /k nodemon --watch "{watch_dir}" "{main_script}"',
    shell=True
)

time.sleep(1.5)
    
# File chính cần chạy
main_script = os.path.join(watch_dir, "main_home.js")

print(f"Running nodemon with watch: {watch_dir}")
print(f"Main script: {main_script}")

# Chạy nodemon trong cửa sổ CMD mới

subprocess.Popen(
    f'start cmd /k nodemon --watch "{watch_dir}" "{main_script}"',
    shell=True
)

time.sleep(1.5)
    