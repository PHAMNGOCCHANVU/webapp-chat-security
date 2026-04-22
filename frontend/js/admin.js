const API_BASE = "http://localhost:4000/api/v1";

// TODO: Them bo loc theo action/user/time va phan trang cho man hinh Audit Log.

async function getAuditLogs() {
  const token = localStorage.getItem("token");
  const response = await axios.get(`${API_BASE}/admin/audit-logs`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}

window.adminApi = {
  getAuditLogs,
};
