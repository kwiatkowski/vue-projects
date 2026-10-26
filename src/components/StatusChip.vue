<template>
  <span v-if="status" class="chip" :class="[`chip--${STATUS_TONES[status]}`, { 'chip--still': !PULSING.has(status) }]">
    <span class="dot" />
    {{ STATUS_LABELS[status] }}
  </span>
</template>

<script lang="ts" setup>
  import type { Status } from '@/types'
  import { STATUS_LABELS, STATUS_TONES } from '@/utils/projects'

  defineProps<{ status: Status | null | undefined }>()

  /** only a site that is up or down pulses – one in progress or suspended doesn't */
  const PULSING = new Set<Status>(['online', 'offline'])
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

/* suspended – the dark dot of an unset report, no pulse, the label greyed */
.chip--off {
  color: var(--text-3);
}

.chip--off .dot {
  background: var(--off);
  box-shadow: 0 0 0 1px var(--line-strong);
}

.chip--still .dot::after {
  display: none;
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
