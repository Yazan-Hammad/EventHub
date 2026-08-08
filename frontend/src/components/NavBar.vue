<script setup>
import { ref, onMounted } from 'vue';
import { useCurrentUser } from '../composables/useCurrentUser';

const { users, currentUserId, currentUser, usersError, loadUsers, logout } = useCurrentUser();

// No real auth yet — clicking "Login" just reveals the "who am I" picker as a stand-in.
const showLogin = ref(false);

onMounted(() => {
  if (!users.value.length) loadUsers();
});

function openLogin() {
  usersError.value = '';
  showLogin.value = true;
  if (!users.value.length) loadUsers();
}
</script>

<template>
  <nav class="navbar">
    <div class="navbar-brand">
      <router-link to="/">EventHub</router-link>
    </div>
    <div class="navbar-links">
      <router-link to="/">Events</router-link>
      <router-link to="/events/new">Create event</router-link>
    </div>
    <div class="navbar-user">
      <template v-if="currentUser">
        <span class="user-name">{{ currentUser.name }}</span>
        <button type="button" @click="logout">Logout</button>
      </template>
      <template v-else-if="showLogin">
        <span v-if="usersError" class="error">{{ usersError }}</span>
        <select v-else v-model="currentUserId" :disabled="!users.length">
          <option value="" disabled>{{ users.length ? 'Choose a user...' : 'Loading...' }}</option>
          <option v-for="user in users" :key="user._id" :value="user._id">
            {{ user.name }}
          </option>
        </select>
      </template>
      <template v-else>
        <button type="button" @click="openLogin">Login</button>
      </template>
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
.navbar-user .user-name {
  font-weight: 600;
}
.navbar-user .error {
  color: #fca5a5;
}
</style>
