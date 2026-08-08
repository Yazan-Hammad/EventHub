import { ref, computed, watch } from 'vue';
import client from '../api/client';

const STORAGE_KEY = 'eventhub_current_user_id';

// Module-level singletons so every component shares the same "who am I" state.
// Default is guest (no id) — there's no real auth yet, this just stands in for it.
const users = ref([]);
const usersError = ref('');
const currentUserId = ref(localStorage.getItem(STORAGE_KEY) || '');

const currentUser = computed(() => users.value.find((u) => u._id === currentUserId.value) || null);

watch(currentUserId, (id) => {
  if (id) localStorage.setItem(STORAGE_KEY, id);
  else localStorage.removeItem(STORAGE_KEY);
});

async function loadUsers() {
  usersError.value = '';
  try {
    const { data } = await client.get('/users');
    users.value = data;
    // Only clear a stale id (points at a user that no longer exists) — never
    // auto-pick a user for a guest, that would defeat the point of "logged out".
    if (currentUserId.value && !data.some((u) => u._id === currentUserId.value)) {
      currentUserId.value = '';
    }
  } catch (err) {
    usersError.value = err.response?.data?.error || 'Failed to load users.';
  }
}

function logout() {
  currentUserId.value = '';
}

export function useCurrentUser() {
  return { users, currentUserId, currentUser, usersError, loadUsers, logout };
}
