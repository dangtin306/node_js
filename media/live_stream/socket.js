import { io } from "socket.io-client";

// Kết nối đến server
const socket = io("http://localhost:3027");

socket.on("connect", () => {
  console.log("Đã kết nối Socket.IO");

  // Gửi sự kiện updatelive với giá trị linklive là 2 (ví dụ)
  socket.emit("updatelive", { linklive: 2 });
});

socket.on("disconnect", () => {
  console.log("Đã ngắt kết nối");
});
