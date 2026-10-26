<template>
  <span v-if="status" class="chip" :class="TONES[status]">
    <span class="dot" />
    {{ STATUS_LABELS[status] }}
  </span>
</template>

<script lang="ts" setup>
  import type { Status } from '@/types'
  import { STATUS_LABELS } from '@/utils/projects'

  defineProps<{ status: Status | null | undefined }>()

  const TONES: Record<Status, string> = {
    online: 'chip--accent',
    dev: 'chip--info',
    suspended: 'chip--danger',
    offline: 'chip--warn',
  }
</script>

<style scoped>
.dot {
  width: 6px;
  height: 6px;
}
</style>
