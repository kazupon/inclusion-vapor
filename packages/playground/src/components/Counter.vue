<script setup lang="ts">
import { ref } from 'vue/vapor'
const count = ref(0)
</script>

<template>
  <button
    class="vue"
    type="button"
    @click="count++"
  >
    Vue Vapor count is {{ count }}
  </button>
</template>
