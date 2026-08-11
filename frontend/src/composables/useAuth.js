import { ref, computed } from 'vue';
import client from '../api/client';

const STORAGE_KEY = 'eventhub_token';

// Module-level singletons so every component shares the same identity — logging in
// from the navbar or from the register flow both update the same state everywhere.
const token = ref(localStorage.getItem(STORAGE_KEY) || '');
const user = ref(null);
const authError = ref('');
const otpPreviewUrl = ref('');

const isLoggedIn = computed(() => !!user.value);
const isOrganizer = computed(() => user.value?.role === 'organizer');

function setToken(value) {
  token.value = value;
  if (value) localStorage.setItem(STORAGE_KEY, value);
  else localStorage.removeItem(STORAGE_KEY);
}

// Restores the session from a stored token, if any. Called once on app startup.
async function fetchMe() {
  if (!token.value) return;
  try {
    const { data } = await client.get('/auth/me');
    user.value = data;
  } catch {
    setToken('');
    user.value = null;
  }
}

async function requestOtp(email) {
  authError.value = '';
  otpPreviewUrl.value = '';
  try {
    const { data } = await client.post('/auth/request-otp', { email });
    otpPreviewUrl.value = data.previewUrl || '';
    return true;
  } catch (err) {
    authError.value = err.response?.data?.error || 'Failed to send the code.';
    return false;
  }
}

async function verifyOtp(email, code) {
  authError.value = '';
  try {
    const { data } = await client.post('/auth/verify-otp', { email, code });
    setToken(data.token);
    user.value = data.user;
    otpPreviewUrl.value = '';
    return true;
  } catch (err) {
    authError.value = err.response?.data?.error || 'Invalid code.';
    return false;
  }
}

async function loginOrganizer(username, password) {
  authError.value = '';
  try {
    const { data } = await client.post('/auth/organizer/login', { username, password });
    setToken(data.token);
    user.value = data.user;
    return true;
  } catch (err) {
    authError.value = err.response?.data?.error || 'Login failed. Check credentials.';
    return false;
  }
}

async function registerOrganizer({ username, email, password, name }) {
  authError.value = '';
  try {
    const { data } = await client.post('/auth/organizer/register', { username, email, password, name });
    setToken(data.token);
    user.value = data.user;
    return true;
  } catch (err) {
    authError.value = err.response?.data?.error || 'Registration failed.';
    return false;
  }
}

async function logout() {
  try {
    await client.post('/auth/logout');
  } catch {
    // Token may already be invalid/expired — still clear local state below.
  }
  setToken('');
  user.value = null;
}

export function useAuth() {
  return {
    token,
    user,
    isLoggedIn,
    isOrganizer,
    authError,
    otpPreviewUrl,
    fetchMe,
    requestOtp,
    verifyOtp,
    loginOrganizer,
    registerOrganizer,
    logout,
  };
}

