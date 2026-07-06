import axios from "axios";

// When frontend is served by the backend (production build), use same origin.
// Otherwise fall back to dev-mode env variable.
const BACKEND_URL = "";
export const API = `${BACKEND_URL}/api/vacancy`;

export const api = axios.create({
  baseURL: API,
});

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("pz_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
