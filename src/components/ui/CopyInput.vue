<template>
  <span class="input-row input-row--inside" :class="{ 'input-row--two': open && href }">
    <input v-model.trim="model" class="input" v-bind="$attrs">

    <!-- an address (or a bare domain) opens in a new tab – left of copy -->
    <HoverTip v-if="open && href" anchor-class="field-icon field-icon--second" text="Otwórz w nowej karcie">
      <a
        :aria-label="`Otwórz: ${what}`"
        class="btn btn--icon btn--sm input-copy"
        :href="href"
        rel="noopener"
        target="_blank"
      ><ArrowUpRight /></a>
    </HoverTip>

    <HoverTip v-if="model" anchor-class="field-icon" :text="tip">
      <button
        :aria-label="tip"
        class="btn btn--icon btn--sm input-copy"
        type="button"
        @click="copy"
      ><Copy /></button>
    </HoverTip>
  </span>
</template>

<script lang="ts" setup>
  import { ArrowUpRight, Copy } from 'lucide-vue-next'
  import { computed } from 'vue'
  import HoverTip from '@/components/ui/HoverTip.vue'
  import { useNotifyStore } from '@/stores/notify'

  /**
   * "Input z copy": a text field (trimmed) with a copy button inside it, on the right – shown on hover, only when
   * the field isn't empty. The attributes (type, placeholder, class …) go to the input; `tip` is the button's
   * tooltip, `what` names the value in the toast ("… skopiowane do schowka."). `open` – an address: a second button opens
   * it in a new tab (a bare domain with https://).
   */
  defineOptions({ inheritAttrs: false })
  const props = defineProps<{ tip: string, what: string, open?: boolean }>()

  const model = defineModel<string | null>({ default: null })
  const notify = useNotifyStore()

  /** what the open button leads to – the address as typed, a bare domain on https */
  const href = computed(() => {
    const value = (model.value ?? '').trim()

    if (!value) {
      return ''
    }

    return /^https?:\/\//i.test(value) ? value : `https://${value}`
  })

  async function copy (): Promise<void> {
    if (!model.value) {
      return
    }

    try {
      await navigator.clipboard.writeText(model.value)
      notify.show(`${props.what} skopiowane do schowka.`)
    } catch {
      notify.show('Nie udało się skopiować.', { tone: 'error' })
    }
  }
</script>
