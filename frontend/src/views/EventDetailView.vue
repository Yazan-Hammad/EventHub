<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import client from '../api/client';
import { useCurrentUser } from '../composables/useCurrentUser';

const route = useRoute();
const { currentUserId, users, loadUsers } = useCurrentUser();

const event = ref(null);
const attendees = ref([]);
const loading = ref(true);
const error = ref('');

const registering = ref(false);
const registerError = ref('');
const registerSuccess = ref('');

async function fetchEvent() {
  loading.value = true;
  error.value = '';
  try {
    const [eventRes, attendeesRes] = await Promise.all([
      client.get(`/events/${route.params.id}`),
      client.get(`/events/${route.params.id}/attendees`),
    ]);
    event.value = eventRes.data;
    attendees.value = attendeesRes.data;
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to load this event.';
  } finally {
    loading.value = false;
  }
}

async function register() {
  registerError.value = '';
  registerSuccess.value = '';
  if (!currentUserId.value) {
    registerError.value = 'Please log in first.';
    return;
  }
  registering.value = true;
  try {
    await client.post(`/events/${route.params.id}/register`, {
      userId: currentUserId.value,
      ticketCount: 1,
    });
    registerSuccess.value = 'Registered successfully!';
    await fetchEvent();
  } catch (err) {
    registerError.value = err.response?.data?.error || 'Registration failed.';
  } finally {
    registering.value = false;
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

onMounted(() => {
  if (!users.value.length) loadUsers();
  fetchEvent();
});
</script>

<template>
  <div>
    <p v-if="loading">Loading event...</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <div v-else-if="event">
      <router-link to="/" draggable="false">&larr; Back to events</router-link>
      <h1>{{ event.title }}</h1>
      <p>{{ event.description }}</p>
      <ul class="meta">
        <li><strong>When:</strong> {{ formatDate(event.startsAt) }}</li>
        <li><strong>Price:</strong> ${{ event.price }}</li>
        <li><strong>Venue:</strong> {{ event.venue?.name }} — {{ event.venue?.address }}, {{ event.venue?.city }} (capacity {{ event.venue?.capacity }})</li>
        <li><strong>Organizer:</strong> {{ event.organizer?.name }} ({{ event.organizer?.email }})</li>
        <li v-if="event.categories?.length"><strong>Categories:</strong> {{ event.categories.join(', ') }}</li>
      </ul>

      <section class="register-box">
        <button :disabled="registering || !currentUserId" @click="register">
          {{ !currentUserId ? 'Log in to register' : registering ? 'Registering...' : 'Register for this event' }}
        </button>
        <p v-if="registerError" class="error">{{ registerError }}</p>
        <p v-if="registerSuccess" class="success">{{ registerSuccess }}</p>
      </section>

      <section>
        <h2>Attendees ({{ attendees.length }})</h2>
        <p v-if="!attendees.length">No one has registered yet.</p>
        <ul v-else>
          <li v-for="reg in attendees" :key="reg._id">
            {{ reg.user?.name }} — {{ reg.ticketCount }} ticket(s)
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.meta {
  list-style: none;
  padding: 0;
}
.meta li {
  margin-bottom: 0.4rem;
}
.register-box {
  margin: 1.5rem 0;
  padding: 1rem;
  background: white;
  border: 1px solid #e4e7eb;
  border-radius: 8px;
}
.error {
  color: #b91c1c;
}
.success {
  color: #15803d;
}
</style>
