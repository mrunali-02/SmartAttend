import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// We don't attach static tokens here; dynamic headers are attached inside AuthContext.jsx
// via the React-based Clerk token dynamic interceptor.

export default api;
