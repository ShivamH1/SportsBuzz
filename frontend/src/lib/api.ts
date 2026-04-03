import axios from "axios";
import { API_BASE_URL } from "@/config";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: Add request/response interceptors here if needed for auth or error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Global error handling could go here (e.g., toast notification)
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  },
);
