<template>
  <div class="select-field" @pointerdown.capture="query = ''">
    <DropMenu
      align="start"
      :disabled="disabled"
      :label="label"
      match-width
      trigger-class="input select-field__trigger"
    >
      <template #trigger>
        <span v-if="current" class="select-field__value"><slot name="option" :option="current">{{ current.label }}</slot></span>
        <span v-else class="faint">{{ placeholder }}</span>
        <ChevronDown class="select-field__arrow" />
      </template>

      <!-- the search: filters the options; with `custom` a typed value that isn't there can be used as it is -->
      <div v-if="searchable" class="select-field__search" @click.stop>
        <Search />

        <input
          v-model.trim="query"
          :aria-label="`Szukaj: ${label}`"
          class="select-field__query"
          placeholder="Szukaj…"
          type="text"
          @keydown.enter.prevent="chooseFirst"
        >
      </div>

      <p v-if="searchable && filtered.length === 0 && !custom" class="select-field__empty faint">Nic nie pasuje</p>

      <button
        v-for="option in filtered"
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

      <!-- a typed value that isn't among them – last, under the matches -->
      <button
        v-if="custom && query && !filtered.some(option => option.label === query)"
        class="menu__item"
        role="menuitem"
        type="button"
        @click="model = query as T"
      >
        <Plus /> Użyj „{{ query }}”
      </button>
    </DropMenu>

    <!-- next to the arrow, outside the trigger (a button can't hold a button) -->
    <button
      v-if="clearable && !disabled && model !== null"
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
  import { Check, ChevronDown, Plus, Search, X } from 'lucide-vue-next'
  import { computed, ref } from 'vue'
  import DropMenu from '@/components/ui/DropMenu.vue'

  /**
   * A dropdown in the app's style instead of a native select (which can't show colours): the options, the `option`
   * slot to draw one (a status chip …). Empty when nothing is chosen – no "none" option; the × clears a chosen one.
   */
  const props = withDefaults(defineProps<{
    options: Array<{ value: T, label: string }>
    label: string
    placeholder?: string
    /** a search field on top of the list */
    searchable?: boolean
    /** a typed value that isn't in the list can be chosen as it is (string values) */
    custom?: boolean
    /** the × next to the arrow – off when one of the options means "none" (a filter's "all") */
    clearable?: boolean
    disabled?: boolean
  }>(), { placeholder: '', searchable: false, custom: false, clearable: true, disabled: false })

  const model = defineModel<T | null>({ default: null })
  const query = ref('')

  /** the chosen value even when it isn't among the options (a custom one) */
  const current = computed(() => props.options.find(option => option.value === model.value)
    ?? (model.value === null ? null : { value: model.value, label: String(model.value) }))

  const filtered = computed(() => {
    const needle = query.value.toLowerCase()

    return needle ? props.options.filter(option => option.label.toLowerCase().includes(needle)) : props.options
  })

  /** Enter in the search: the first match – or the typed value itself */
  function chooseFirst (event: KeyboardEvent): void {
    const first = filtered.value[0]

    if (first) {
      model.value = first.value
    } else if (props.custom && query.value) {
      model.value = query.value as T
    } else {
      return
    }

    // as a click on an item would: the menu closes and the field gets the focus back
    ;(event.target as HTMLElement).closest('.menu__panel')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }
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

.select-field__trigger:disabled {
  cursor: default;
}

/* focused – or its list open – looks like a focused text field */
.select-field__trigger[aria-expanded='true'] {
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
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

.select-field__search {
  position: relative;
  margin-bottom: 4px;
}

.select-field__search svg {
  position: absolute;
  top: 50%;
  left: 10px;
  width: 14px;
  height: 14px;
  color: var(--text-3);
  translate: 0 -50%;
  pointer-events: none;
}

.select-field__query {
  width: 100%;
  height: 32px;
  padding: 0 10px 0 30px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--panel);
  color: var(--text);
  font: inherit;
  font-size: 13px;
  outline: none;
}

.select-field__query:hover {
  border-color: var(--text-3);
}

/* focused like the other fields: the green edge and the 1px ring – without the global :focus-visible outline */
.select-field__query:focus {
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
  outline: none;
}

.select-field__empty {
  margin: 0;
  padding: 6px 12px;
  font-size: 13px;
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
