<script vapor setup lang="ts">
import { ref } from 'vue/vapor'

const { msg = 'hello' } = defineProps<{ msg: string }>()
const emits = defineEmits<{ (e: 'increment', value: number): void }>()

const count = ref(0)
function increment(e: Event) {
  console.log('increment vue', e)
  count.value++
  emits('increment', count.value)
}
</script>

<template>
  <div id="vue" class="box">
    <button class="vue" type="button" @click="increment">Vue Vapor count is {{ count }}</button>
    <!-- prettier-ignore -->
    <br>
    <span>Props msg: {{ msg }}</span>
    <!-- prettier-ignore -->
    <br>
    <slot />
  </div>
</template>

<style scoped>
span {
  color: #35eb9a;
}
</style>
