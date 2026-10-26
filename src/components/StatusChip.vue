<template>
  <span v-if="status" class="chip" :class="`chip--${STATUS_TONES[status]}`">
    <span class="dot" />
    {{ STATUS_LABELS[status] }}
  </span>
</template>

<script lang="ts" setup>
  import type { Status } from '@/types'
  import { STATUS_LABELS, STATUS_TONES } from '@/utils/projects'

  defineProps<{ status: Status | null | undefined }>()
</script>

<style scoped>
/* just the coloured dot and label – no tinted background */
.chip {
  gap: 6px;
  padding: 0;
  background: none;
}

.chip--accent {
  color: var(--positive);
}

/* the size of the dots in Todo */
.dot {
  position: relative;
}

/* a pulsing ring around the dot, in the dot's colour */
.dot::after {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: currentcolor;
  opacity: .75;
  animation: ping 1s cubic-bezier(0, 0, .2, 1) infinite;
  content: '';
}

@keyframes ping {
  75%,
  100% {
    opacity: 0;
    transform: scale(2);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dot::after {
    animation: none;
    opacity: 0;
  }
}
</style>
