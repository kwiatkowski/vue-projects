<template>
  <span class="input-row input-row--inside">
    <input v-model.trim="model" class="input" v-bind="$attrs">

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
  import { Copy } from 'lucide-vue-next'
  import HoverTip from '@/components/ui/HoverTip.vue'
  import { useNotifyStore } from '@/stores/notify'

  /**
   * "Input z copy": a text field (trimmed) with a copy button inside it, on the right – shown on hover, only when
   * the field isn't empty. The attributes (type, placeholder, class …) go to the input; `tip` is the button's
   * tooltip, `what` names the value in the toast ("… skopiowane do schowka.").
   */
  defineOptions({ inheritAttrs: false })
  const props = defineProps<{ tip: string, what: string }>()

  const model = defineModel<string | null>({ default: null })
  const notify = useNotifyStore()

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
