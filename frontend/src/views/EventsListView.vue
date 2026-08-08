<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import client from '../api/client';

const events = ref([]);
const total = ref(0);
const page = ref(1);
const size = ref(6);
const loading = ref(false);
const error = ref('');

const q = ref('');
const city = ref('');
const category = ref('');

// No endpoint lists categories, so we derive the filter options from whatever
// events are currently loaded (allowed by the task spec).
const knownCategories = ref([]);

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size.value)));

async function fetchEvents() {
  loading.value = true;
  error.value = '';
  try {
    const params = { page: page.value, size: size.value };
    if (q.value) params.q = q.value;
    if (city.value) params.city = city.value;
    if (category.value) params.category = category.value;

    const { data } = await client.get('/events', { params });
    events.value = data.data;
    total.value = data.total;

    const seen = new Set(knownCategories.value);
    events.value.forEach((e) => e.categories?.forEach((c) => seen.add(c)));
    knownCategories.value = Array.from(seen).sort();
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to load events.';
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  page.value = 1;
  fetchEvents();
}

watch(page, fetchEvents);
onMounted(fetchEvents);

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
</script>

<template>
  <div>
    <h1>Events</h1>

    <form class="filters" @submit.prevent="applyFilters">
      <input v-model="q" type="text" placeholder="Search title or description..." />
      <input v-model="city" type="text" placeholder="City" />
      <select v-model="category">
        <option value="">All categories</option>
        <option v-for="c in knownCategories" :key="c" :value="c">{{ c }}</option>
      </select>
      <button type="submit">Search</button>
    </form>

    <p v-if="loading">Loading events...</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <p v-else-if="!events.length">No events match your search.</p>

    <ul v-else class="event-list">
      <li v-for="event in events" :key="event._id" class="event-card">
        <router-link :to="`/events/${event._id}`" draggable="false">
          <h3>{{ event.title }}</h3>
        </router-link>
        <p>{{ formatDate(event.startsAt) }} · {{ event.venue?.name }} ({{ event.venue?.city }})</p>
        <p>Organized by {{ event.organizer?.name }} · ${{ event.price }}</p>
        <p class="categories">
          <span v-for="c in event.categories" :key="c" class="tag">{{ c }}</span>
        </p>
      </li>
    </ul>

    <div class="pagination" v-if="!loading && events.length">
      <button :disabled="page <= 1" @click="page--">Previous</button>
      <span>Page {{ page }} of {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="page++">Next</button>
    </div>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}
.filters input,
.filters select {
  padding: 0.5rem;
  border: 1px solid #cbd2d9;
  border-radius: 4px;
}
.event-list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 1rem;
}
.event-card {
  border: 1px solid #e4e7eb;
  border-radius: 8px;
  padding: 1rem;
  background: white;
}
.event-card h3 {
  margin: 0 0 0.25rem;
}
.categories {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.tag {
  background: #e8edff;
  color: #2c3e91;
  border-radius: 12px;
  padding: 0.1rem 0.6rem;
  font-size: 0.8rem;
}
.pagination {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
}
.error {
  color: #b91c1c;
}
</style>
