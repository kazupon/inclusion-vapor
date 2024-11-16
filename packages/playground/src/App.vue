<script vapor setup lang="ts">
import { computed, ref } from 'vue'

import SvelteCounter from './components/Counter.svelte'
import ReactCounter from './components/Counter.tsx'
import VueCounter from './components/Counter.vue'

const svelteCounter = ref(0)
const vueCounter = ref(0)

const svelteMsg = computed(() => `Svelte Counter value: ${svelteCounter.value}`)
const vueMsg = computed(() => `Vue Counter value: ${vueCounter.value}`)

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
  <VueCounter :msg="svelteMsg" @increment="onVueIncrement">
    <span>slot content</span>
    <br>
    <span>Svelte counter value via event: {{ svelteCounter }}</span>
  </VueCounter>

  <ReactCounter />

  <SvelteCounter :msg="vueMsg" @increment="onSvelteIncrement">
    <span>slot content</span>
    <br>
    <span>Vue counter value via event: {{ vueCounter }}</span>
  </SvelteCounter>
</template>
