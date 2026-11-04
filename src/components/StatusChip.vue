<template>
  <span
    v-if="status"
    v-tip="why?.long"
    class="chip"
    :class="[`chip--${STATUS_TONES[status]}`, { 'chip--still': !PULSING.has(status) }]"
    :tabindex="why ? 0 : undefined"
  >
    <span class="dot" />
    {{ STATUS_LABELS[status] }}
    <!-- down: why – the code or the failure; the tooltip says what it means and since when -->
    <span v-if="why" class="chip__why">· {{ why.short }}</span>
  </span>
</template>

<script lang="ts" setup>
  import type { DownCheck, Status } from '@/types'
  import { computed } from 'vue'
  import { vTip } from '@/directives/tip'
  import { outageText, STATUS_LABELS, STATUS_TONES } from '@/utils/projects'

  const props = defineProps<{ status: Status | null | undefined, down?: DownCheck | null }>()

  const why = computed(() => props.status === 'offline' && props.down ? outageText(props.down) : null)

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

/* the reason – the status' colour, the code in the numbers' font */
.chip__why {
  font-family: var(--mono);
  font-size: 12px;
  white-space: nowrap;
}

/* suspended – a dark dot, no pulse, the label greyed */
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
