<script setup>
import { onMounted } from 'vue';
import NavBar from './components/NavBar.vue';
import { useAuth } from './composables/useAuth';

const { fetchMe } = useAuth();
onMounted(fetchMe);
</script>

<template>
  <NavBar />
  <main class="container">
    <router-view />
  </main>
</template>

<style scoped>
.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
}
</style>
