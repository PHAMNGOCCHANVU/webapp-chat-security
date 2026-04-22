const SOCKET_URL = "http://localhost:4000";

// TODO: Dong bo danh sach phong, lich su tin nhan va trang thai online/offline nguoi dung.

const socket = io(SOCKET_URL, {
  transports: ["websocket"],
});

function joinRoom(roomId) {
  socket.emit("join-room", roomId);
}

function sendMessage(roomId, content, sender) {
  socket.emit("send-message", { roomId, content, sender });
}

function onNewMessage(handler) {
  socket.on("new-message", handler);
}

window.chatSocket = {
  joinRoom,
  sendMessage,
  onNewMessage,
};
