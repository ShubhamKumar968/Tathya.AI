/**
 * auth.js — Shared authentication helpers
 * Used by login.html, signup.html, and index.html
 */

// Dynamically uses the same host+port the page was served from
// so it works on port 5000, 3000, or any other port without changes.
const API_BASE = "https://tathya-backend-23rh.onrender.com";

/**
 * Log in an existing user.
 * Saves token and userName to localStorage on success.
 * @returns {{ success: boolean, message?: string }}
 */
async function loginUser(email, password) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, message: data.message || "Login failed." };
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("userName", data.name);
    return { success: true };
  } catch (err) {
    return { success: false, message: "Network error. Is the backend running on port 5000?" };
  }
}

/**
 * Register a new user.
 * Saves token and userName to localStorage on success.
 * @returns {{ success: boolean, message?: string }}
 */
async function signupUser(name, email, password) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, message: data.message || "Signup failed." };
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("userName", data.name);
    return { success: true };
  } catch (err) {
    return { success: false, message: "Network error. Is the backend running on port 5000?" };
  }
}
