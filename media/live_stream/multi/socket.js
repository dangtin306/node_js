import { io } from "socket.io-client";

// Kết nối đến server
const socket = io("http://localhost:3028");

socket.on("connect", () => {
  console.log("Đã kết nối Socket.IO");

  // Gửi sự kiện socket_live_1 với giá trị linklive là 4
  socket.emit("socket_live_2", { linklive: 4 });

  // Sau khi gửi sự kiện, đợi 3 giây rồi ngắt kết nối và kết thúc tiến trình
  setTimeout(() => {
    socket.disconnect();
    console.log("Đã ngắt kết nối và kết thúc tiến trình");
    process.exit(0);
  }, 3000);
});

socket.on("disconnect", () => {
  console.log("Đã ngắt kết nối từ server");
});