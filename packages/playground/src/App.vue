<script setup lang="ts">
import { ref } from 'vue/vapor'

import VueCounter from './components/Counter.vue'
import ReactCounter from './components/Counter.tsx'
import SvelteCounter from './components/Counter.svelte'

const svelteCounter = ref(0)
const vueCounter = ref(0)

function onSvelteIncrement(e: { detail: { count: number } }) {
  console.log('fire increment event from svelte component on vue component', e)
  svelteCounter.value = e.detail.count
}

function onVueIncrement(e: number) {
  console.log('fire increment event from vue component on svelte component', e)
  vueCounter.value = e
}
</script>

<template>
  <VueCounter @increment="onVueIncrement">
    <span>Svelte counter value via event: {{ svelteCounter }}</span>
  </VueCounter>
  <ReactCounter />
  <SvelteCounter @increment="onSvelteIncrement">
    <span>Vue counter value via event: {{ vueCounter }}</span>
  </SvelteCounter>
</template>
