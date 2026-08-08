<script setup>
import { onMounted } from 'vue';
import { useCurrentUser } from '../composables/useCurrentUser';

const { users, currentUserId, loadUsers } = useCurrentUser();

onMounted(() => {
  if (!users.value.length) loadUsers();
});
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
      <label for="current-user">Logged in as</label>
      <select id="current-user" v-model="currentUserId">
        <option v-if="!users.length" value="">Loading...</option>
        <option v-for="user in users" :key="user._id" :value="user._id">
          {{ user.name }}
        </option>
      </select>
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
.navbar-user select {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: none;
}
</style>
