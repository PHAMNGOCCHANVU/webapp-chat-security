const API_BASE = "http://localhost:4000/api/v1";

// Axios config to include cookies
axios.defaults.withCredentials = true;

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const errorMsg = document.getElementById("error-msg");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
        await axios.post(`${API_BASE}/auth/login`, { email, password });
        window.location.href = "app.html";
      } catch (err) {
        let msg = "Login failed.";
        if (err.response?.data?.error) {
          if (Array.isArray(err.response.data.error)) {
            msg = err.response.data.error.map(err => err.message).join(", ");
          } else {
            msg = err.response.data.error;
          }
        }
        alert(msg);
      }
    });
  }

  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const email = document.getElementById("email").value;
      const username = document.getElementById("username").value;
      const displayName = document.getElementById("displayName").value;
      const password = document.getElementById("password").value;

      try {
        await axios.post(`${API_BASE}/auth/register`, { email, username, displayName, password });
        // Automatically login after register
        await axios.post(`${API_BASE}/auth/login`, { email, password });
        window.location.href = "app.html";
      } catch (err) {
        let msg = "Registration failed.";
        if (err.response?.data?.error) {
          if (Array.isArray(err.response.data.error)) {
            msg = err.response.data.error.map(e => e.message).join(", ");
          } else {
            msg = err.response.data.error;
          }
        }
        alert(msg);
      }
    });
  }
});

async function logout() {
  try {
    await axios.post(`${API_BASE}/auth/logout`);
    window.location.href = "login.html";
  } catch (err) {
    console.error("Logout failed", err);
  }
}
