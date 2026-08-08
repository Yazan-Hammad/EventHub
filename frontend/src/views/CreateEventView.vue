<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import client from '../api/client';

const router = useRouter();

const venues = ref([]);
const organizers = ref([]);
const loadingOptions = ref(true);
const optionsError = ref('');

const form = ref({
  title: '',
  description: '',
  startsAt: '',
  price: 0,
  venue: '',
  organizer: '',
  categoriesText: '',
});

const submitting = ref(false);
const submitError = ref('');

async function loadOptions() {
  loadingOptions.value = true;
  optionsError.value = '';
  try {
    const [venuesRes, usersRes] = await Promise.all([
      client.get('/venues'),
      client.get('/users'),
    ]);
    venues.value = venuesRes.data;
    organizers.value = usersRes.data;
  } catch (err) {
    optionsError.value = err.response?.data?.error || 'Failed to load venues/organizers.';
  } finally {
    loadingOptions.value = false;
  }
}

async function submit() {
  submitError.value = '';
  submitting.value = true;
  try {
    const categories = form.value.categoriesText
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const { data } = await client.post('/events', {
      title: form.value.title,
      description: form.value.description,
      startsAt: form.value.startsAt,
      price: Number(form.value.price),
      venue: form.value.venue,
      organizer: form.value.organizer,
      categories,
    });

    router.push(`/events/${data._id}`);
  } catch (err) {
    submitError.value = err.response?.data?.error || 'Failed to create event.';
  } finally {
    submitting.value = false;
  }
}

onMounted(loadOptions);
</script>

<template>
  <div>
    <h1>Create event</h1>

    <p v-if="loadingOptions">Loading form...</p>
    <p v-else-if="optionsError" class="error">{{ optionsError }}</p>

    <form v-else class="event-form" @submit.prevent="submit">
      <label>
        Title
        <input v-model="form.title" type="text" required />
      </label>

      <label>
        Description
        <textarea v-model="form.description" rows="4" required></textarea>
      </label>

      <label>
        Starts at
        <input v-model="form.startsAt" type="datetime-local" required />
      </label>

      <label>
        Price ($)
        <input v-model="form.price" type="number" min="0" step="0.01" required />
      </label>

      <label>
        Venue
        <select v-model="form.venue" required>
          <option value="" disabled>Select a venue</option>
          <option v-for="v in venues" :key="v._id" :value="v._id">
            {{ v.name }} ({{ v.city }}, capacity {{ v.capacity }})
          </option>
        </select>
      </label>

      <label>
        Organizer
        <select v-model="form.organizer" required>
          <option value="" disabled>Select an organizer</option>
          <option v-for="u in organizers" :key="u._id" :value="u._id">{{ u.name }}</option>
        </select>
      </label>

      <label>
        Categories (comma-separated)
        <input v-model="form.categoriesText" type="text" placeholder="tech, workshop" />
      </label>

      <p v-if="submitError" class="error">{{ submitError }}</p>

      <button type="submit" :disabled="submitting">
        {{ submitting ? 'Creating...' : 'Create event' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.event-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 480px;
}
.event-form label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-weight: 600;
}
.event-form input,
.event-form select,
.event-form textarea {
  padding: 0.5rem;
  border: 1px solid #cbd2d9;
  border-radius: 4px;
  font-weight: 400;
}
.error {
  color: #b91c1c;
}
</style>
