import { ref, watch } from 'vue';
import client from '../api/client';

const STORAGE_KEY = 'eventhub_current_user_id';

// Module-level singletons so every component shares the same "who am I" state.
const users = ref([]);
const usersError = ref('');
const currentUserId = ref(localStorage.getItem(STORAGE_KEY) || '');

watch(currentUserId, (id) => {
  if (id) localStorage.setItem(STORAGE_KEY, id);
  else localStorage.removeItem(STORAGE_KEY);
});

async function loadUsers() {
  usersError.value = '';
  try {
    const { data } = await client.get('/users');
    users.value = data;
    const stillExists = data.some((u) => u._id === currentUserId.value);
    if (!stillExists && data.length) {
      currentUserId.value = data[0]._id;
    }
  } catch (err) {
    usersError.value = err.response?.data?.error || 'Failed to load users.';
  }
}

export function useCurrentUser() {
  return { users, currentUserId, usersError, loadUsers };
}
