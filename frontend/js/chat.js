// Axios configuration
axios.defaults.withCredentials = true;

let currentUser = null;
let currentRoomId = null;
let socket = null;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 1. Verify session & fetch user profile
    const res = await axios.get(`${API_BASE}/auth/me`);
    currentUser = res.data;
    
    document.getElementById("user-name").textContent = currentUser.displayName;
    if (currentUser.role === "ADMIN") {
      document.getElementById("admin-btn").classList.remove("hidden");
    }

    // 2. Init Socket.IO
    socket = io("http://localhost:4000", {
      withCredentials: true // send cookies
    });

    socket.on("connect", () => {
      console.log("Connected to WebSocket");
    });

    socket.on("new-message", (msg) => {
      if (msg.roomId === currentRoomId) {
        appendMessage(msg);
        scrollToBottom();
      }
    });

    socket.on("error", (err) => {
      alert("Socket error: " + err.message);
    });

    // 3. Load Rooms
    loadRooms();

    // 4. Setup message form
    document.getElementById("message-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("message-input");
      const text = input.value.trim();
      
      if (text && currentRoomId) {
        socket.emit("send-message", {
          roomId: currentRoomId,
          content: text,
          senderId: currentUser.id
        });
        input.value = "";
      }
    });

  } catch (err) {
    console.error("Not authenticated", err);
    window.location.href = "login.html";
  }
});

async function loadRooms() {
  try {
    const res = await axios.get(`${API_BASE}/rooms`);
    const rooms = res.data;
    const list = document.getElementById("room-list");
    list.innerHTML = "";

    rooms.forEach(room => {
      const el = document.createElement("div");
      el.className = "px-4 py-3 hover:bg-slate-50 cursor-pointer rounded-lg mb-1 flex items-center gap-3 transition-colors group";
      el.onclick = () => selectRoom(room.id, room.name, room._count.members);
      
      const icon = room.isPrivate 
        ? `<svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>`
        : `<svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>`;

      el.innerHTML = `
        <div class="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
          ${icon}
        </div>
        <div class="flex-1 overflow-hidden">
          <h4 class="text-sm font-semibold text-slate-800 truncate">${room.name}</h4>
          <p class="text-xs text-slate-500 truncate">${room._count.members} members</p>
        </div>
      `;
      list.appendChild(el);
    });
  } catch (err) {
    console.error("Failed to load rooms", err);
  }
}

async function selectRoom(roomId, name, membersCount) {
  currentRoomId = roomId;
  
  // Update UI
  document.getElementById("welcome-screen").classList.add("hidden");
  document.getElementById("chat-header").classList.remove("hidden");
  document.getElementById("message-input-area").classList.remove("hidden");
  document.getElementById("room-name").textContent = name;
  document.getElementById("room-members").textContent = `${membersCount} members`;
  
  const container = document.getElementById("messages-container");
  container.innerHTML = ""; // Clear messages (in real app, fetch history via API)

  // Join room via socket
  socket.emit("join-room", { roomId, userId: currentUser.id });
}

function appendMessage(msg) {
  const container = document.getElementById("messages-container");
  const isMe = msg.sender.id === currentUser.id;
  
  const div = document.createElement("div");
  div.className = `flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-4`;
  
  div.innerHTML = `
    <span class="text-xs text-slate-400 mb-1 px-1">${isMe ? 'You' : msg.sender.displayName}</span>
    <div class="max-w-[70%] px-4 py-2 rounded-2xl ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm shadow-sm'}">
      ${escapeHtml(msg.content)}
    </div>
  `;
  
  container.appendChild(div);
}

function scrollToBottom() {
  const container = document.getElementById("messages-container");
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
