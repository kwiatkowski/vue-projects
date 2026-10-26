<template>
  <div class="status-select-wrap">
    <DropMenu align="start" label="Status" trigger-class="input status-select">
      <template #trigger>
        <StatusChip v-if="model" :status="model" />
        <span v-else />
        <ChevronDown class="status-select__arrow" />
      </template>

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

    <!-- next to the arrow, outside the trigger (a button can't hold a button) -->
    <button
      v-if="model"
      aria-label="Usuń status"
      class="status-select__clear"
      title="Usuń status"
      type="button"
      @click="model = null"
    >
      <X />
    </button>
  </div>
</template>

<script lang="ts" setup>
  import type { Status } from '@/types'
  import { Check, ChevronDown, X } from 'lucide-vue-next'
  import StatusChip from '@/components/StatusChip.vue'
  import DropMenu from '@/components/ui/DropMenu.vue'
  import { STATUS_LABELS } from '@/utils/projects'

  /**
   * The status as a dropdown in its colours – the same dot and colour as in the table (a native select can't).
   * Empty when there is none; the × clears a set one.
   */
  const model = defineModel<Status | null>({ default: null })
</script>

<style>
.status-select-wrap {
  position: relative;
}

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

.status-select__clear {
  position: absolute;
  top: 50%;
  right: 32px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--text-3);
  cursor: pointer;
  translate: 0 -50%;
}

.status-select__clear:hover {
  background: var(--hover);
  color: var(--text);
}

.status-select__clear svg {
  width: 14px;
  height: 14px;
}
</style>
