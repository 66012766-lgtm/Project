import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export const loginUser = async (data) => {
  const res = await api.post("/api/login", data);
  return res.data;
};

export const createVisit = async (data) => {
  const res = await api.post("/api/save-visit", data);
  return res.data;
};

export default api;