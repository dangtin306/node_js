import os
import subprocess
import time
import psutil
import pyautogui
import sys

def kill_process_tree(pid):
    try:
        parent = psutil.Process(pid)
    except psutil.NoSuchProcess:
        return
    # Lấy tất cả tiến trình con và kết thúc chúng
    for child in parent.children(recursive=True):
        try:
            child.kill()
        except Exception as e:
            print(f"Lỗi khi tắt tiến trình con {child.pid}: {e}")
    try:
        parent.kill()
    except Exception as e:
        print(f"Lỗi khi tắt tiến trình cha {pid}: {e}")

time.sleep(1)
# Lệnh wmic để lấy thông tin các tiến trình
wmic_command = 'wmic process get processid,commandline'
node_processes = subprocess.Popen(wmic_command, stdout=subprocess.PIPE, shell=True).communicate()[0].decode().split('\n')

# Tìm và xử lý các tiến trình có chứa 'show_live_main' hoặc 'streams_main' trong commandline
for process_info in node_processes:
    if 'ffmpeg' in process_info.lower() or 'show_live_main' in process_info.lower() or 'streams_main' in process_info.lower():
        info_parts = process_info.split()
        if len(info_parts) >= 2:
            try:
                cmd_pid = int(info_parts[-1])  # PID của cmd
                print(f"Đóng cửa sổ cmd có PID: {cmd_pid}")
                kill_process_tree(cmd_pid)
            except Exception as e:
                print(f"Lỗi khi xử lý tiến trình: {e}")
            time.sleep(2)

time.sleep(1)
watch_dir = r"C:\hustmedia6\nodejs\main_server\media\live_stream\multi"

# File chính cần chạy cho streams_main.js
main_script = os.path.join(watch_dir, "streams_main.js")
print(f"Running node with watch: {watch_dir}")
print(f"Main script: {main_script}")
subprocess.Popen(
    f'start cmd /k node {main_script}',
    shell=True
)

time.sleep(2)
# File chính cần chạy cho show_live_main.js
main_script = os.path.join(watch_dir, "show_live_main.js")
print(f"Running node with watch: {watch_dir}")
print(f"Main script: {main_script}")
subprocess.Popen(
    f'start cmd /k node {main_script}',
    shell=True
)

time.sleep(2)
sys.exit()
