// Axios config
const API_BASE = "http://localhost:4000/api/v1";
axios.defaults.withCredentials = true;

let currentUser = null;
let currentRoomId = null;
let socket = null;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Verify auth
    const res = await axios.get(`${API_BASE}/auth/me`);
    currentUser = res.data;
    
    // Update profile UI
    document.querySelectorAll(".profile-avatar").forEach(el => el.textContent = currentUser.displayName[0].toUpperCase());
    document.getElementById("profile-name").textContent = currentUser.displayName;
    document.getElementById("profile-username").textContent = `@${currentUser.username}`;
    document.getElementById("profile-email").textContent = currentUser.email;
    
    if (currentUser.role === "ADMIN") {
      document.getElementById("admin-link-btn").classList.remove("hidden");
    }

    // Init Socket
    socket = io("http://localhost:4000", { withCredentials: true });
    
    socket.on("connect", () => console.log("Socket connected!"));
    
    socket.on("new-message", (msg) => {
      if (msg.roomId === currentRoomId) {
        appendMessage(msg);
      }
      // Also refresh room list to show latest
      loadRooms();
    });

    // Load Initial Data
    loadRooms();
    
    // Setup message form
    document.getElementById("message-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("msg-input");
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

    // Search users setup
    document.getElementById("search-user-input").addEventListener("input", async (e) => {
      const q = e.target.value.trim();
      if (q.length >= 2) {
        const users = await axios.get(`${API_BASE}/auth/users?q=${q}`);
        renderSearchResults(users.data);
      } else {
        document.getElementById("search-results").innerHTML = "";
      }
    });

    // Create Group Setup
    document.getElementById("create-group-btn").addEventListener("click", async () => {
      const name = prompt("Nhập tên nhóm:");
      if (name) {
        await axios.post(`${API_BASE}/rooms`, { name, isPrivate: false });
        loadRooms();
      }
    });

  } catch (err) {
    console.error(err);
    window.location.href = "login.html";
  }
});

// Navigation
function switchTab(tabId) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('bg-blue-600', 'text-white', 'shadow-md');
    if(!btn.classList.contains('text-slate-400') && tabId !== 'profile') btn.classList.add('text-slate-400');
  });

  if(tabId !== 'profile') {
    const activeBtn = event.currentTarget;
    activeBtn.classList.remove('text-slate-400');
    activeBtn.classList.add('bg-blue-600', 'text-white', 'shadow-md');
  }

  document.querySelectorAll('.panel').forEach(panel => panel.classList.add('hidden'));
  document.getElementById('panel-' + tabId).classList.remove('hidden');
}

async function loadRooms() {
  const res = await axios.get(`${API_BASE}/rooms`);
  const list = document.getElementById("room-list");
  list.innerHTML = "";

  res.data.forEach(room => {
    const isDirect = room.isDirect;
    const name = room.name;
    const initial = name ? name[0].toUpperCase() : 'G';
    
    const div = document.createElement("div");
    div.className = `chat-item p-3 hover:bg-slate-50 rounded-xl cursor-pointer flex gap-3 transition-colors ${room.id === currentRoomId ? 'bg-blue-50' : ''}`;
    div.onclick = () => selectChat(room.id, name, room._count.members);
    
    div.innerHTML = `
      <div class="relative shrink-0">
        <div class="w-12 h-12 rounded-full ${isDirect ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-600'} flex items-center justify-center font-bold text-lg overflow-hidden">
          ${isDirect ? initial : '👥'}
        </div>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex justify-between items-baseline mb-0.5">
          <h3 class="text-sm font-semibold text-slate-800 truncate">${name}</h3>
        </div>
        <p class="text-xs text-slate-500 truncate">${room._count.members} thành viên</p>
      </div>
    `;
    list.appendChild(div);
  });
}

async function selectChat(roomId, name, membersCount) {
  currentRoomId = roomId;
  
  document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('bg-blue-50'));
  event?.currentTarget?.classList.add('bg-blue-50');

  // Update Header
  document.getElementById('chat-header-info').innerHTML = `
    <div class="relative shrink-0">
      <div class="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-lg">${name[0].toUpperCase()}</div>
    </div>
    <div>
      <h2 class="text-base font-bold text-slate-800 leading-tight">${name}</h2>
      <p class="text-xs text-slate-500 font-medium">${membersCount} thành viên</p>
    </div>
  `;

  // Fetch messages
  const res = await axios.get(`${API_BASE}/rooms/${roomId}/messages`);
  const container = document.getElementById('chat-messages');
  container.innerHTML = "";
  
  res.data.forEach(msg => appendMessage(msg));
  
  // Join socket room
  socket.emit("join-room", { roomId, userId: currentUser.id });
}

function appendMessage(msg) {
  const container = document.getElementById('chat-messages');
  const isMe = msg.sender.id === currentUser.id;
  const time = new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

  const div = document.createElement("div");
  if (isMe) {
    div.className = "flex items-end justify-end mb-4";
    div.innerHTML = `
      <div class="flex flex-col gap-1 items-end max-w-[65%] group">
        <div class="px-4 py-2.5 bg-blue-600 text-white rounded-2xl rounded-br-none shadow-sm text-sm">
          ${escapeHtml(msg.content)}
        </div>
        <span class="text-[10px] text-slate-400 pr-1">${time}</span>
      </div>
    `;
  } else {
    div.className = "flex items-end gap-2 mb-4";
    div.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs shrink-0">${msg.sender.displayName[0]}</div>
      <div class="flex flex-col gap-1 items-start max-w-[65%] group">
        <span class="text-[11px] font-semibold text-slate-500 ml-1">${msg.sender.displayName}</span>
        <div class="px-4 py-2.5 bg-white text-slate-800 rounded-2xl rounded-bl-none shadow-sm text-sm border border-slate-100">
          ${escapeHtml(msg.content)}
        </div>
        <span class="text-[10px] text-slate-400 pl-1 opacity-0 group-hover:opacity-100 transition-opacity">${time}</span>
      </div>
    `;
  }
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function renderSearchResults(users) {
  const list = document.getElementById("search-results");
  list.innerHTML = "";
  users.forEach(u => {
    const div = document.createElement("div");
    div.className = "flex items-center justify-between p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer";
    div.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold">${u.displayName[0]}</div>
        <div>
          <p class="text-sm font-semibold text-slate-800">${u.displayName}</p>
          <p class="text-xs text-slate-500">@${u.username}</p>
        </div>
      </div>
      <button onclick="createDirectChat('${u.id}', '${u.displayName}')" class="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100">Nhắn tin</button>
    `;
    list.appendChild(div);
  });
}

async function createDirectChat(userId, userName) {
  try {
    const res = await axios.post(`${API_BASE}/rooms`, { name: `Chat với ${userName}`, isPrivate: true, isDirect: true });
    // Add member
    await axios.post(`${API_BASE}/rooms/${res.data.id}/members`, { userId: userId });
    switchTab('conversations');
    loadRooms();
  } catch(err) {
    console.error(err);
  }
}

async function logout() {
  await axios.post(`${API_BASE}/auth/logout`);
  window.location.href = "login.html";
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
