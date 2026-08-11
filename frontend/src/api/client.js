import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
});

// Reads localStorage directly (rather than importing useAuth) to avoid a circular
// dependency, since useAuth itself imports this client.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('eventhub_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;
