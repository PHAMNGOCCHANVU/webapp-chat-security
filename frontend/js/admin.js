// Axios config
axios.defaults.withCredentials = true;

const API_BASE = "http://localhost:4000/api/v1";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await axios.get(`${API_BASE}/admin/audit-logs`);
    const logs = res.data;
    
    const tbody = document.getElementById("audit-log-body");
    tbody.innerHTML = "";

    logs.forEach(log => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-50 transition-colors";
      
      const date = new Date(log.createdAt).toLocaleString();
      const actorName = log.actor ? log.actor.displayName : "System / Unknown";
      
      let actionColor = "bg-blue-100 text-blue-700";
      if (log.action.includes("DELETE") || log.action.includes("REMOVE")) actionColor = "bg-red-100 text-red-700";
      if (log.action.includes("CREATE") || log.action.includes("ADD")) actionColor = "bg-emerald-100 text-emerald-700";
      if (log.action.includes("UPDATE")) actionColor = "bg-amber-100 text-amber-700";

      tr.innerHTML = `
        <td class="p-4 text-slate-500 whitespace-nowrap">${date}</td>
        <td class="p-4 font-medium text-slate-800">${actorName}</td>
        <td class="p-4">
          <span class="px-2.5 py-1 rounded-md text-xs font-semibold ${actionColor}">
            ${log.action}
          </span>
        </td>
        <td class="p-4 text-slate-600">${log.targetType || '-'}</td>
        <td class="p-4 text-slate-500 font-mono text-xs">${log.ipAddress || '-'}</td>
        <td class="p-4 text-slate-600">${log.description || '-'}</td>
      `;
      
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("Failed to fetch audit logs", err);
    if (err.response?.status === 403) {
      window.location.href = "access-denied.html";
    }
  }
});
