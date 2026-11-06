<template>
  <!-- a date typed as text (DD.MM.RRRR – also 2.4.2026, 02042026, 2026-04-02 or pasted) or picked in the calendar -->
  <span class="input-row input-row--inside input-row--two date-field">
    <input
      v-model="text"
      :aria-invalid="invalid ? 'true' : undefined"
      class="input"
      inputmode="numeric"
      :placeholder="placeholder"
      type="text"
      @blur="commit"
      @keydown.enter.prevent="commit"
    >

    <!-- the browser's own calendar – opened from the icon; its value goes into the field -->
    <input
      ref="picker"
      aria-hidden="true"
      class="date-field__picker"
      tabindex="-1"
      type="date"
      :value="model ?? ''"
      @change="pick"
    >

    <HoverTip anchor-class="field-icon" text="Wybierz z kalendarza">
      <button aria-label="Wybierz z kalendarza" class="btn btn--icon btn--sm" type="button" @click="openPicker"><CalendarDays /></button>
    </HoverTip>
  </span>
</template>

<script lang="ts" setup>
  import { CalendarDays } from 'lucide-vue-next'
  import { ref, useTemplateRef, watch } from 'vue'
  import HoverTip from '@/components/ui/HoverTip.vue'

  /** A date field one can type into: the model is RRRR-MM-DD ('' – none), shown and typed as DD.MM.RRRR. */
  const model = defineModel<string | null>({ default: '' })

  withDefaults(defineProps<{ placeholder?: string }>(), { placeholder: 'DD.MM.RRRR' })

  const text = ref('')
  const invalid = ref(false)
  const picker = useTemplateRef<HTMLInputElement>('picker')

  /** RRRR-MM-DD → DD.MM.RRRR */
  function show (iso: string | null | undefined) {
    const match = (iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)

    return match ? `${match[3]}.${match[2]}.${match[1]}` : ''
  }

  watch(model, value => {
    text.value = show(value)
    invalid.value = false
  }, { immediate: true })

  /** what was typed as RRRR-MM-DD – null when it is no real date */
  function parse (typed: string): string | null {
    const value = typed.trim()
    const parts = value.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/)?.slice(1).toReversed()
      ?? value.match(/^(\d{1,2})[-./ ](\d{1,2})[-./ ](\d{4})$/)?.slice(1)
      ?? value.match(/^(\d{2})(\d{2})(\d{4})$/)?.slice(1)

    if (!parts) {
      return null
    }

    const [day, month, year] = parts.map(Number) as [number, number, number]
    const date = new Date(year, month - 1, day)

    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  /** the typed date into the model (empty – no date); a wrong one stays, marked */
  function commit (): void {
    if (text.value.trim() === '') {
      model.value = ''
      invalid.value = false

      return
    }

    const iso = parse(text.value)
    invalid.value = iso === null

    if (iso !== null) {
      model.value = iso
      text.value = show(iso)
    }
  }

  function pick (event: Event): void {
    model.value = (event.target as HTMLInputElement).value
  }

  function openPicker (): void {
    try {
      picker.value?.showPicker()
    } catch {
      picker.value?.focus()
    }
  }
</script>

<style scoped>
.date-field {
  position: relative;
}

/* the native date input – invisible, under the icon, only its calendar is used */
.date-field__picker {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 36px;
  height: 36px;
  opacity: 0;
  pointer-events: none;
}
</style>
