import axios from "axios";

const getBackendUrl = () => {
  let envUrl = (process.env.REACT_APP_BACKEND_URL || "").trim();
  if (envUrl) {
    if (envUrl.startsWith("http")) return envUrl;
    // Render's fromService property:host gives hostname without protocol
    if (envUrl.includes(".")) return `https://${envUrl}`;
  }

  // Dynamic detection for Render Blueprint deployments
  const host = window.location.hostname;
  if (host.endsWith(".onrender.com")) {
    const match = host.match(/^faktura-frontend(.*)\.onrender\.com$/);
    if (match) {
      const suffix = match[1]; // e.g. "-izha"
      return `https://faktura-backend${suffix}.onrender.com`;
    }
  }

  const isSubfolder = window.location.pathname.startsWith("/faktura");
  return isSubfolder ? "/faktura" : "";
};

const BACKEND_URL = getBackendUrl();
export const API_BASE = `${BACKEND_URL}/api`;

export function getAppBaseUrl() {
  const isSubfolder = window.location.pathname.startsWith("/faktura");
  return window.location.origin + (isSubfolder ? "/faktura/" : "/");
}

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Attach Bearer token (fallback when third-party cookies are blocked)
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("session_token");
  if (token) {
    cfg.headers = cfg.headers || {};
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

export function setToken(token) {
  if (token) localStorage.setItem("session_token", token);
}
export function clearToken() {
  localStorage.removeItem("session_token");
}

export function apiErrorText(detail) {
  if (detail == null) return "Wystąpił błąd. Spróbuj ponownie.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default api;
