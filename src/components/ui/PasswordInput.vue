<template>
  <span class="input-row input-row--inside input-row--two">
    <input
      v-model="model"
      autocomplete="new-password"
      class="input mono"
      :placeholder="loading ? 'Wczytuję…' : ''"
      :type="shown ? 'text' : 'password'"
    >

    <!-- the eye – left of copy, or in copy's place when there is no password to copy -->
    <HoverTip :anchor-class="model ? 'field-icon field-icon--second' : 'field-icon'" :text="shown ? 'Ukryj hasło' : 'Pokaż hasło'">
      <button
        :aria-label="shown ? 'Ukryj hasło' : 'Pokaż hasło'"
        class="btn btn--icon btn--sm"
        type="button"
        @click="shown = !shown"
      >
        <EyeOff v-if="shown" />
        <Eye v-else />
      </button>
    </HoverTip>

    <HoverTip v-if="model" anchor-class="field-icon" text="Kopiuj hasło">
      <button
        aria-label="Kopiuj hasło"
        class="btn btn--icon btn--sm input-copy"
        type="button"
        @click="copy"
      ><Copy /></button>
    </HoverTip>
  </span>
</template>

<script lang="ts" setup>
  import { Copy, Eye, EyeOff } from 'lucide-vue-next'
  import HoverTip from '@/components/ui/HoverTip.vue'
  import { useNotifyStore } from '@/stores/notify'

  /**
   * A password field like "input z copy": the eye shows it, the copy button (on hover, only when filled) puts it in
   * the clipboard; `what` names it in the toast. `shown` is a model too, so the dialog hides it again when it reopens.
   */
  const props = defineProps<{ what: string, loading?: boolean }>()

  const model = defineModel<string>({ default: '' })
  const shown = defineModel<boolean>('shown', { default: false })
  const notify = useNotifyStore()

  async function copy (): Promise<void> {
    try {
      await navigator.clipboard.writeText(model.value)
      notify.show(`${props.what} skopiowane do schowka.`)
    } catch {
      notify.show('Nie udało się skopiować.', { tone: 'error' })
    }
  }
</script>
