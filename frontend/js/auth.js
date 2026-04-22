const API_BASE = "http://localhost:4000/api/v1";

// TODO: Hoan thien xu ly form dang ky/dang nhap, validate input, xu ly loi 401/403.

async function login(email, password) {
  const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
  localStorage.setItem("token", response.data.token);
  return response.data;
}

async function register(username, email, password) {
  const response = await axios.post(`${API_BASE}/auth/register`, { username, email, password });
  return response.data;
}

window.authApi = {
  login,
  register,
};
