<template>
  <span
    ref="anchor"
    class="tip-anchor"
    :class="anchorClass"
    @click.capture="onClick"
    @focusin="onFocus"
    @focusout="onFocusOut"
    @mouseenter="show"
    @mouseleave="leave"
  >
    <slot />
  </span>

  <Teleport :to="layer">
    <div
      v-if="open"
      ref="tip"
      class="tip"
      :class="{ 'tip--below': below, 'tip--interactive': interactive }"
      :role="interactive ? 'dialog' : 'tooltip'"
      :style="position"
      @focusout="onFocusOut"
      @mouseenter="stay"
      @mouseleave="leave"
    >
      <slot :hide="hide" name="tip">{{ text }}</slot>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
  import { nextTick, onBeforeUnmount, ref, useTemplateRef } from 'vue'
  import { placeTip } from '@/utils/tip'

  /**
   * A tooltip in the app's style instead of the browser's `title`: `text`, or the `tip` slot for more lines.
   * A bubble with a little triangle pointing at the anchor – above it and centred by default, the triangle at the
   * bottom; pushed sideways when it would leave the screen (the triangle still points at the anchor), below it when
   * there's no room above (under the top bar and the sticky header).
   * Rendered in <body>, so the table's own scrolling doesn't clip it.
   * `interactive`: it can be entered and clicked (actions in it) – it stays while the pointer goes from the anchor onto
   * it and closes a moment after it leaves both; a click on the anchor opens it (touch), Escape closes it.
   */
  const props = defineProps<{ text?: string, anchorClass?: string, interactive?: boolean }>()

  /** it opens – e.g. to fetch what it will need */
  const emit = defineEmits<{ show: [] }>()

  /** an interactive tip waits this long before closing – the pointer crosses the gap to it */
  const LINGER = 200
  let hideTimer: ReturnType<typeof setTimeout> | undefined

  const anchor = useTemplateRef<HTMLElement>('anchor')
  const tip = useTemplateRef<HTMLElement>('tip')
  const open = ref(false)
  const below = ref(false)
  // measured first while invisible, then placed
  const position = ref<Record<string, string>>({ visibility: 'hidden' })

  /** <body>, or the open <dialog> the anchor is in – a modal dialog covers everything in <body> */
  const layer = ref<string | HTMLElement>('body')

  async function show (): Promise<void> {
    stay()

    // back from the tip onto the anchor: it is open and placed already
    if (open.value) {
      return
    }

    layer.value = anchor.value?.closest('dialog') ?? 'body'
    position.value = { visibility: 'hidden', left: '0px', top: '0px' }
    open.value = true
    emit('show')
    window.addEventListener('scroll', hide, { capture: true, passive: true })
    // leaving the tab (a link opened Todo in another one) fires no mouseleave – close it then
    window.addEventListener('blur', hide)
    window.addEventListener('keydown', onKey)

    await nextTick()

    const box = anchor.value?.getBoundingClientRect()
    const size = tip.value?.getBoundingClientRect()

    if (!box || !size) {
      return
    }

    ;({ below: below.value, position: position.value } = placeTip(box, size))
  }

  function hide (): void {
    stay()
    open.value = false
    window.removeEventListener('scroll', hide, { capture: true })
    window.removeEventListener('blur', hide)
    window.removeEventListener('keydown', onKey)
  }

  function stay (): void {
    clearTimeout(hideTimer)
  }

  /** the pointer (or the focus) left the anchor or the tip – a plain tip goes at once, an interactive one a moment later */
  function leave (): void {
    if (!props.interactive) {
      hide()

      return
    }

    stay()
    hideTimer = setTimeout(hide, LINGER)
  }

  /** a plain tip gets out of the way of a click; an interactive one opens on it (a touch has no hover) */
  function onClick (): void {
    if (props.interactive) {
      void show()
    } else {
      hide()
    }
  }

  /** the focus moving between the anchor and an interactive tip keeps it open */
  function onFocusOut (event: FocusEvent): void {
    const next = event.relatedTarget as Node | null

    if (props.interactive && next && (anchor.value?.contains(next) || tip.value?.contains(next))) {
      return
    }

    leave()
  }

  function onKey (event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      hide()
    }
  }

  /**
   * Keyboard focus only: coming back to the tab gives the clicked link its focus again – that shouldn't reopen the tip.
   */
  function onFocus (event: FocusEvent): void {
    if ((event.target as Element | null)?.matches(':focus-visible')) {
      void show()
    }
  }

  onBeforeUnmount(hide)
</script>

<style scoped>
.tip-anchor {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
}
</style>
