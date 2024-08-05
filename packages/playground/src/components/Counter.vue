<script setup lang="ts">
import { ref } from 'vue/vapor'

const count = ref(0)
</script>

<template>
  <div class="card">
    <button type="button" @click="count++">Vue Vapor count is {{ count }}</button>
  </div>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
