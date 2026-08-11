<script setup>
import { ref } from 'vue';
import { useAuth } from '../composables/useAuth';

const { user, authError, otpPreviewUrl, requestOtp, verifyOtp, logout } = useAuth();

// 'idle' | 'email' | 'otp' — mirrors the same inline flow used on the register box.
const step = ref('idle');
const email = ref('');
const code = ref('');
const sending = ref(false);
const verifying = ref(false);

function startLogin() {
  step.value = 'email';
}

async function sendCode() {
  sending.value = true;
  const ok = await requestOtp(email.value);
  sending.value = false;
  if (ok) step.value = 'otp';
}

async function confirmCode() {
  verifying.value = true;
  const ok = await verifyOtp(email.value, code.value);
  verifying.value = false;
  if (ok) {
    step.value = 'idle';
    email.value = '';
    code.value = '';
  }
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
        <span class="user-name">{{ user.name }}</span>
        <button type="button" @click="logout">Logout</button>
      </template>
      <template v-else-if="step === 'email'">
        <input v-model="email" type="email" placeholder="you@example.com" class="nav-input" />
        <button type="button" :disabled="sending" @click="sendCode">{{ sending ? 'Sending...' : 'Send code' }}</button>
      </template>
      <template v-else-if="step === 'otp'">
        <a v-if="otpPreviewUrl" :href="otpPreviewUrl" target="_blank" rel="noopener">View email</a>
        <input v-model="code" type="text" inputmode="numeric" maxlength="6" placeholder="Code" class="nav-input nav-input-code" />
        <button type="button" :disabled="verifying" @click="confirmCode">{{ verifying ? 'Verifying...' : 'Verify' }}</button>
      </template>
      <template v-else>
        <button type="button" @click="startLogin">Login</button>
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
}
.navbar-user select,
.navbar-user button {
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  border: none;
}
.navbar-user .nav-input {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: none;
  width: 160px;
}
.navbar-user .nav-input-code {
  width: 80px;
}
.navbar-user .user-name {
  font-weight: 600;
}
.navbar-user a {
  color: #93c5fd;
}
.navbar-user .error {
  color: #fca5a5;
}
</style>
