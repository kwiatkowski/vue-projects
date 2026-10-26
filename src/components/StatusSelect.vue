<template>
  <DropMenu align="start" label="Status" trigger-class="input status-select">
    <template #trigger>
      <StatusChip v-if="model" :status="model" />
      <span v-else class="faint">—</span>
      <ChevronDown class="status-select__arrow" />
    </template>

    <button
      :aria-checked="model === null"
      class="menu__item"
      role="menuitemradio"
      type="button"
      @click="model = null"
    >
      <span class="faint">— bez statusu —</span>
    </button>

    <button
      v-for="(_, status) in STATUS_LABELS"
      :key="status"
      :aria-checked="model === status"
      class="menu__item"
      role="menuitemradio"
      type="button"
      @click="model = status"
    >
      <StatusChip :status="status" />
      <Check v-if="model === status" class="status-select__check" />
    </button>
  </DropMenu>
</template>

<script lang="ts" setup>
  import type { Status } from '@/types'
  import { Check, ChevronDown } from 'lucide-vue-next'
  import StatusChip from '@/components/StatusChip.vue'
  import DropMenu from '@/components/ui/DropMenu.vue'
  import { STATUS_LABELS } from '@/utils/projects'

  /** The status as a dropdown in its colours – the same dot and colour as in the table (a native select can't). */
  const model = defineModel<Status | null>({ default: null })
</script>

<style>
.status-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  cursor: pointer;
  text-align: left;
}

.status-select__arrow {
  flex: none;
  width: 16px;
  height: 16px;
  color: var(--text-3);
}

.status-select__check {
  margin-left: auto;
}
</style>
