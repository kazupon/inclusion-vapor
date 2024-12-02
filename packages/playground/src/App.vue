<script vapor setup lang="ts">
import { computed, onMounted, ref } from 'vue/vapor'

import SvelteCounter from './components/Counter.svelte'
import ReactCounter from './components/Counter.tsx'
import VueCounter from './components/Counter.vue'

const svelteCounter = ref(0)
const vueCounter = ref(0)
const sevelteCounterRef = ref(null)

onMounted(() => {
  console.log('App mounted')
  // @ts-expect-error -- PoC
  console.log('svelteCounter script context foo', sevelteCounterRef.value!.foo)
  // @ts-expect-error -- PoC
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  sevelteCounterRef.value!.counter()
})

const svelteMsg = computed(() => `Svelte Counter value: ${svelteCounter.value}`)
const vueMsg = computed(() => `Vue counter value: ${vueCounter.value}`)

function onSvelteIncrement(e: { detail: { count: number } }) {
  console.log('fire increment event from svelte component on vue component', e)
  svelteCounter.value = e.detail.count
}

function onVueIncrement(e: number) {
  console.log('fire increment event from vue component on svelte component', e)
  vueCounter.value = e
  // @ts-expect-error -- PoC
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  sevelteCounterRef.value!.counter()
}
</script>

<template>
  <VueCounter :msg="svelteMsg" @increment="onVueIncrement">
    <span>slot content</span>
    <!-- prettier-ignore -->
    <br>
    <span>Svelte counter value via event: {{ svelteCounter }}</span>
  </VueCounter>

  <ReactCounter />

  <SvelteCounter ref="sevelteCounterRef" :msg="vueMsg" @increment="onSvelteIncrement">
    <span>slot content</span>
    <!-- prettier-ignore -->
    <br>
    <span>Vue counter value via event: {{ vueCounter }}</span>
  </SvelteCounter>
</template>
