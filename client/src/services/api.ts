import axios from "axios";
import { getAccessToken } from "./tokenStorage";

const baseURL = import.meta.env.VITE_API_URL?.trim();

if (!baseURL) {
  throw new Error(
    "VITE_API_URL is missing. Configure it in client/.env.",
  );
}

const api = axios.create({
  baseURL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;