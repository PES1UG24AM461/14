import axios from 'axios';

// Shared Axios instance for all API calls. In development Vite proxies /api to the Express server.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

// Attach the JWT (stored by the login flow, OQS-05) to every request.
api.interceptors.request.use((request) => {
  const token = localStorage.getItem('token');
  if (token) request.headers.Authorization = `Bearer ${token}`;
  return request;
});

export default api;
