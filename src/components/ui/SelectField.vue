<template>
  <div class="select-field">
    <DropMenu align="start" :label="label" match-width trigger-class="input select-field__trigger">
      <template #trigger>
        <span v-if="current" class="select-field__value"><slot name="option" :option="current">{{ current.label }}</slot></span>
        <span v-else class="faint">{{ placeholder }}</span>
        <ChevronDown class="select-field__arrow" />
      </template>

      <button
        v-for="option in options"
        :key="String(option.value)"
        :aria-checked="model === option.value"
        class="menu__item"
        role="menuitemradio"
        type="button"
        @click="model = option.value"
      >
        <slot name="option" :option="option">{{ option.label }}</slot>
        <Check v-if="model === option.value" class="select-field__check" />
      </button>
    </DropMenu>

    <!-- next to the arrow, outside the trigger (a button can't hold a button) -->
    <button
      v-if="model !== null"
      :aria-label="`Wyczyść: ${label}`"
      class="select-field__clear"
      :title="`Wyczyść: ${label}`"
      type="button"
      @click="model = null"
    >
      <X />
    </button>
  </div>
</template>

<script lang="ts" setup generic="T extends string | number">
  import { Check, ChevronDown, X } from 'lucide-vue-next'
  import { computed } from 'vue'
  import DropMenu from '@/components/ui/DropMenu.vue'

  /**
   * A dropdown in the app's style instead of a native select (which can't show colours): the options, the `option`
   * slot to draw one (a status chip …). Empty when nothing is chosen – no "none" option; the × clears a chosen one.
   */
  const props = withDefaults(defineProps<{
    options: Array<{ value: T, label: string }>
    label: string
    placeholder?: string
  }>(), { placeholder: '' })

  const model = defineModel<T | null>({ default: null })

  const current = computed(() => props.options.find(option => option.value === model.value) ?? null)
</script>

<style>
.select-field {
  position: relative;
}

.select-field__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding-right: 58px;
  cursor: pointer;
  text-align: left;
}

.select-field__value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-field__arrow {
  position: absolute;
  top: 50%;
  right: 10px;
  width: 16px;
  height: 16px;
  color: var(--text-3);
  translate: 0 -50%;
}

.select-field__check {
  margin-left: auto;
}

.select-field__clear {
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

.select-field__clear:hover {
  background: var(--hover);
  color: var(--text);
}

.select-field__clear svg {
  width: 14px;
  height: 14px;
}
</style>
