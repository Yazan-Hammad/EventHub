<script setup>
import { ref } from 'vue';
import { useAuth } from '../composables/useAuth';

const {
  user,
  authError,
  otpPreviewUrl,
  requestOtp,
  verifyOtp,
  loginOrganizer,
  registerOrganizer,
  logout,
} = useAuth();

// 'idle' | 'choice' | 'attendee-email' | 'attendee-otp' | 'organizer-login'
const step = ref('idle');
const email = ref('');
const code = ref('');
const username = ref('');
const password = ref('');

const sending = ref(false);
const verifying = ref(false);
const submitting = ref(false);

function startLogin() {
  step.value = 'choice';
}

function cancelLogin() {
  step.value = 'idle';
  email.value = '';
  code.value = '';
  username.value = '';
  password.value = '';
}

async function sendCode() {
  sending.value = true;
  const ok = await requestOtp(email.value);
  sending.value = false;
  if (ok) step.value = 'attendee-otp';
}

async function confirmCode() {
  verifying.value = true;
  const ok = await verifyOtp(email.value, code.value);
  verifying.value = false;
  if (ok) cancelLogin();
}

async function handleOrganizerLogin() {
  submitting.value = true;
  const ok = await loginOrganizer(username.value, password.value);
  submitting.value = false;
  if (ok) cancelLogin();
}
</script>

<template>
  <nav class="navbar">
    <div class="navbar-brand">
      <router-link to="/" draggable="false">EventHub</router-link>
    </div>
    <div class="navbar-links">
      <router-link to="/" draggable="false">Events</router-link>
      <router-link to="/events/new" draggable="false">Create event</router-link>
    </div>
    <div class="navbar-user">
      <template v-if="user">
        <span class="user-name">{{ user.name }} <span class="role-badge">({{ user.role }})</span></span>
        <button type="button" class="btn-sm" @click="logout">Logout</button>
      </template>

      <template v-else-if="step === 'choice'">
        <button type="button" class="btn-sm btn-choice" @click="step = 'attendee-email'">Attendee Login</button>
        <button type="button" class="btn-sm btn-choice" @click="step = 'organizer-login'">Organizer Login</button>
        <button type="button" class="btn-sm btn-text" @click="cancelLogin">Cancel</button>
      </template>

      <template v-else-if="step === 'attendee-email'">
        <input v-model="email" type="email" placeholder="attendee@example.com" class="nav-input" />
        <button type="button" class="btn-sm" :disabled="sending" @click="sendCode">{{ sending ? 'Sending...' : 'Send code' }}</button>
        <button type="button" class="btn-sm btn-text" @click="cancelLogin">Cancel</button>
      </template>

      <template v-else-if="step === 'attendee-otp'">
        <a v-if="otpPreviewUrl" :href="otpPreviewUrl" target="_blank" rel="noopener">View email</a>
        <input v-model="code" type="text" inputmode="numeric" maxlength="6" placeholder="Code" class="nav-input nav-input-code" />
        <button type="button" class="btn-sm" :disabled="verifying" @click="confirmCode">{{ verifying ? 'Verifying...' : 'Verify' }}</button>
        <button type="button" class="btn-sm btn-text" @click="cancelLogin">Cancel</button>
      </template>

      <template v-else-if="step === 'organizer-login'">
        <form class="nav-form" @submit.prevent="handleOrganizerLogin">
          <input v-model="username" type="text" placeholder="Username / Email" class="nav-input" required />
          <input v-model="password" type="password" placeholder="Password" class="nav-input nav-input-pass" required />
          <button type="submit" class="btn-sm" :disabled="submitting">{{ submitting ? 'Logging in...' : 'Login' }}</button>
          <button type="button" class="btn-sm btn-text" @click="cancelLogin">Cancel</button>
        </form>
      </template>

      <template v-else>
        <button type="button" class="btn-sm" @click="startLogin">Login</button>
      </template>

      <span v-if="authError" class="error">{{ authError }}</span>
    </div>
  </nav>
</template>


<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: #1f2933;
  color: white;
  flex-wrap: wrap;
}
.navbar-brand a {
  color: white;
  font-weight: 700;
  font-size: 1.25rem;
  text-decoration: none;
}
.navbar-links {
  display: flex;
  gap: 1rem;
}
.navbar-links a {
  color: #d2d6dc;
  text-decoration: none;
}
.navbar-links a.router-link-exact-active {
  color: white;
  font-weight: 600;
}
.navbar-user {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  flex-wrap: wrap;
}
.navbar-user button {
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}
.btn-choice {
  background: #3b82f6;
  color: white;
  font-weight: 500;
}
.btn-choice:hover {
  background: #2563eb;
}
.btn-text {
  background: transparent;
  color: #9ca3af;
}
.btn-text:hover {
  color: white;
}
.nav-form {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.navbar-user .nav-input {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid #4b5563;
  width: 140px;
  background: #111827;
  color: white;
}
.navbar-user .nav-input-pass {
  width: 110px;
}
.navbar-user .nav-input-code {
  width: 80px;
}
.navbar-user .nav-input-sm {
  width: 100px;
}
.navbar-user .user-name {
  font-weight: 600;
}
.role-badge {
  font-size: 0.8rem;
  color: #60a5fa;
  font-weight: 400;
  text-transform: capitalize;
}
.navbar-user a {
  color: #93c5fd;
}
.navbar-user .error {
  color: #fca5a5;
  font-size: 0.85rem;
}
</style>

