<template>
  <!-- down: the status alone, why in the popup – as the report's: the code, what it means, since when, how long -->
  <HoverTip v-if="status && why" anchor-class="status-hit">
    <span class="chip" :class="`chip--${STATUS_TONES[status]}`" tabindex="0">
      <span class="dot" />
      {{ STATUS_LABELS[status] }}
    </span>

    <template #tip>
      <div class="report-tip__title">
        <strong>Strona nie działa</strong>
        <span class="mono status-tip__code">{{ why.short }}</span>
      </div>

      <dl class="info-tip info-tip--after">
        <dt>Przyczyna</dt>
        <dd>{{ why.meaning }}</dd>
        <dt>Od</dt>
        <dd class="mono">{{ formatDateTime(down!.since) }}</dd>
        <dt>Trwa</dt>
        <dd>{{ lasting }}</dd>
      </dl>
    </template>
  </HoverTip>

  <span v-else-if="status" class="chip" :class="[`chip--${STATUS_TONES[status]}`, { 'chip--still': !PULSING.has(status) }]">
    <span class="dot" />
    {{ STATUS_LABELS[status] }}
  </span>
</template>

<script lang="ts" setup>
  import type { DownCheck, Status } from '@/types'
  import { computed } from 'vue'
  import HoverTip from '@/components/ui/HoverTip.vue'
  import { formatDuration } from '@/utils/history'
  import { formatDateTime, outageText, STATUS_LABELS, STATUS_TONES } from '@/utils/projects'

  const props = defineProps<{ status: Status | null | undefined, down?: DownCheck | null }>()

  const why = computed(() => props.status === 'offline' && props.down ? outageText(props.down) : null)
  /** how long it has been down – when the popup opens */
  const lasting = computed(() => props.down ? formatDuration(Math.round((Date.now() - new Date(props.down.since).getTime()) / 60_000)) : '')

  /** only a site that is up or down pulses – one in progress, not watched or suspended doesn't */
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

/* the popup's code – in the offline colour */
.status-tip__code {
  color: var(--danger);
}

/* not watched – a hollow dot, no pulse: the site works, it just isn't checked */
.chip--muted {
  color: var(--text-2);
}

.chip--muted .dot {
  background: none;
  box-shadow: inset 0 0 0 1.5px var(--text-3);
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
