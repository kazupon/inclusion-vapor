<script setup lang="ts">
import VueCounter from './components/Counter.vue'
import ReactCounter from './components/Counter.tsx'
import SvelteCounter from './components/Counter.svelte'
</script>

<template>
  <VueCounter />
  <ReactCounter />
  <SvelteCounter />
</template>
