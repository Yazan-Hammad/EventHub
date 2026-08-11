<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import client from '../api/client';
import { useAuth } from '../composables/useAuth';

const route = useRoute();
const router = useRouter();
const { user, isLoggedIn, authError, otpPreviewUrl, requestOtp, verifyOtp } = useAuth();

const event = ref(null);
const attendees = ref([]);
const loading = ref(true);
const error = ref('');
const deleting = ref(false);
const deleteError = ref('');

const confirmedAttendees = computed(() => attendees.value.filter((r) => r.status !== 'waitlisted'));
const waitlistedAttendees = computed(() => attendees.value.filter((r) => r.status === 'waitlisted'));

const isOwner = computed(() => {
  if (!user.value || !event.value?.organizer) return false;
  const organizerId = typeof event.value.organizer === 'object' ? event.value.organizer._id : event.value.organizer;
  return organizerId === user.value._id;
});

async function handleDelete() {
  if (!confirm('Are you sure you want to delete this event?')) return;
  deleteError.value = '';
  deleting.value = true;
  try {
    await client.delete(`/events/${route.params.id}`);
    router.push('/');
  } catch (err) {
    deleteError.value = err.response?.data?.error || 'Failed to delete event.';
  } finally {
    deleting.value = false;
  }
}

// The logged-in user's own registration for this event, if any — used to hide the
// register form and show its status instead, rather than letting them try again
// and hit the 409 from the backend's duplicate-registration check.
const myRegistration = computed(() => {
  if (!user.value) return null;
  return attendees.value.find((r) => r.user?._id === user.value._id) || null;
});
const myWaitlistPosition = computed(() => {
  if (!myRegistration.value || myRegistration.value.status !== 'waitlisted') return null;
  return waitlistedAttendees.value.findIndex((r) => r._id === myRegistration.value._id) + 1;
});

const ticketCount = ref(1);
// 'idle' | 'email' | 'otp' — the email/otp steps only appear if you're not already
// logged in when you click Register.
const registerStep = ref('idle');
const email = ref('');
const code = ref('');
const registering = ref(false);
const sendingCode = ref(false);
const verifyingCode = ref(false);
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

async function doRegister() {
  registering.value = true;
  try {
    const { data } = await client.post(`/events/${route.params.id}/register`, {
      ticketCount: ticketCount.value,
    });
    registerSuccess.value = data.status === 'waitlisted'
      ? `This event is full — you've been added to the waitlist (position ${data.waitlistPosition}).`
      : 'Registered successfully!';
    await fetchEvent();
  } catch (err) {
    registerError.value = err.response?.data?.error || 'Registration failed.';
  } finally {
    registering.value = false;
  }
}

async function startRegister() {
  registerError.value = '';
  registerSuccess.value = '';
  if (isLoggedIn.value) {
    await doRegister();
    return;
  }
  registerStep.value = 'email';
}

async function sendCode() {
  registerError.value = '';
  sendingCode.value = true;
  const ok = await requestOtp(email.value);
  sendingCode.value = false;
  if (ok) registerStep.value = 'otp';
  else registerError.value = authError.value;
}

async function confirmCode() {
  registerError.value = '';
  verifyingCode.value = true;
  const ok = await verifyOtp(email.value, code.value);
  verifyingCode.value = false;
  if (!ok) {
    registerError.value = authError.value;
    return;
  }
  registerStep.value = 'idle';
  email.value = '';
  code.value = '';
  await doRegister();
}

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

onMounted(fetchEvent);
</script>

<template>
  <div>
    <p v-if="loading">Loading event...</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <div v-else-if="event">
      <router-link to="/" draggable="false">&larr; Back to events</router-link>
      <h1>{{ event.title }}</h1>

      <div v-if="isOwner" class="organizer-box">
        <span class="owner-badge">👑 You are the Organizer of this event</span>
        <button class="btn-danger" :disabled="deleting" @click="handleDelete">
          {{ deleting ? 'Deleting...' : 'Delete Event' }}
        </button>
        <span v-if="deleteError" class="error">{{ deleteError }}</span>
      </div>

      <p>{{ event.description }}</p>
      <ul class="meta">
        <li><strong>When:</strong> {{ formatDate(event.startsAt) }}</li>
        <li><strong>Price:</strong> ${{ event.price }}</li>
        <li><strong>Venue:</strong> {{ event.venue?.name }} — {{ event.venue?.address }}, {{ event.venue?.city }} (capacity {{ event.venue?.capacity }})</li>
        <li><strong>Organizer:</strong> {{ event.organizer?.name }} ({{ event.organizer?.email }})</li>
        <li v-if="event.categories?.length"><strong>Categories:</strong> {{ event.categories.join(', ') }}</li>
      </ul>


      <section class="register-box">
        <p v-if="registerSuccess" class="success">{{ registerSuccess }}</p>

        <p v-if="myRegistration" class="already-registered">
          <template v-if="myRegistration.status === 'waitlisted'">
            You're on the waitlist for this event (position {{ myWaitlistPosition }}), for
            {{ myRegistration.ticketCount }} ticket(s).
          </template>
          <template v-else>
            You are registered for this event ({{ myRegistration.ticketCount }} ticket(s)).
          </template>
        </p>

        <template v-else>
          <label class="ticket-label">
            Tickets
            <input
              v-model.number="ticketCount"
              type="number"
              min="1"
            />
          </label>

          <template v-if="registerStep === 'idle'">
            <button :disabled="registering" @click="startRegister">
              {{ registering ? 'Registering...' : 'Register for this event' }}
            </button>
          </template>

          <template v-else-if="registerStep === 'email'">
            <p class="hint">Enter your email to verify and complete registration.</p>
            <input v-model="email" type="email" placeholder="you@example.com" />
            <button :disabled="sendingCode || !email" @click="sendCode">
              {{ sendingCode ? 'Sending...' : 'Send code' }}
            </button>
          </template>

          <template v-else-if="registerStep === 'otp'">
            <p class="hint">Enter the 6-digit code sent to {{ email }}.</p>
            <a v-if="otpPreviewUrl" :href="otpPreviewUrl" target="_blank" rel="noopener">View email</a>
            <input v-model="code" type="text" inputmode="numeric" maxlength="6" placeholder="123456" />
            <button :disabled="verifyingCode || !code" @click="confirmCode">
              {{ verifyingCode ? 'Verifying...' : 'Verify' }}
            </button>
          </template>
        </template>

        <p v-if="registerError" class="error">{{ registerError }}</p>
      </section>


      <section>
        <h2>Attendees ({{ confirmedAttendees.length }})</h2>
        <p v-if="!attendees.length">No one has registered yet.</p>
        <ul v-else-if="confirmedAttendees.length">
          <li v-for="reg in confirmedAttendees" :key="reg._id">
            {{ reg.user?.name }} — {{ reg.ticketCount }} ticket(s)
          </li>
        </ul>
      </section>

      <section v-if="waitlistedAttendees.length">
        <h2>Waitlist ({{ waitlistedAttendees.length }})</h2>
        <ul>
          <li v-for="(reg, index) in waitlistedAttendees" :key="reg._id">
            #{{ index + 1 }} {{ reg.user?.name }} — {{ reg.ticketCount }} ticket(s)
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
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}
.ticket-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}
.ticket-label input {
  width: 70px;
  padding: 0.3rem;
  border: 1px solid #cbd2d9;
  border-radius: 4px;
}
.register-box input[type='email'],
.register-box input[type='text'] {
  padding: 0.4rem 0.6rem;
  border: 1px solid #cbd2d9;
  border-radius: 4px;
  width: 220px;
}
.already-registered {
  margin: 0;
  font-weight: 600;
  color: #15803d;
}
.hint {
  margin: 0;
  font-size: 0.9rem;
  color: #52606d;
}
.organizer-box {
  margin: 1rem 0;
  padding: 0.75rem 1rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.owner-badge {
  font-weight: 600;
  color: #1e40af;
}
.btn-danger {
  padding: 0.35rem 0.75rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}
.btn-danger:hover {
  background: #b91c1c;
}
.error {
  color: #b91c1c;
}
.success {
  color: #15803d;
}
</style>

