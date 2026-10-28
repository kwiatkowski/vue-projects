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

  /** an interactive tip waits this long before closing – the pointer crosses the gap to it */
  const LINGER = 200
  let hideTimer: ReturnType<typeof setTimeout> | undefined

  /** room kept from the screen's edges, the gap to the anchor (the triangle sits in it) */
  const EDGE = 8
  const GAP = 10
  /** the triangle in a corner: this far from the bubble's side */
  const CORNER = 14

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

    const center = box.left + box.width / 2
    let left = center - size.width / 2

    // too close to an edge to centre it: the bubble goes the other way, its corner (and the triangle) at the anchor
    if (left + size.width > window.innerWidth - EDGE) {
      left = center + CORNER - size.width
    } else if (left < EDGE) {
      left = center - CORNER
    }

    left = Math.min(Math.max(left, EDGE), window.innerWidth - size.width - EDGE)

    // the top bar and the page's sticky header cover the upper part of the screen – no room above there
    const top = (document.querySelector('.head')?.getBoundingClientRect().bottom ?? 0) + EDGE

    below.value = box.top - GAP - size.height < top
    position.value = {
      'left': `${left}px`,
      'top': `${below.value ? box.bottom + GAP : box.top - GAP - size.height}px`,
      // where the triangle points – the anchor's centre, kept off the rounded corners
      '--arrow': `${Math.min(Math.max(center - left, CORNER), size.width - CORNER)}px`,
    }
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

.tip {
  position: fixed;
  z-index: 60;
  /* as wide as its content – near the screen's right edge a fixed box would otherwise squeeze and wrap */
  width: max-content;
  max-width: min(360px, calc(100vw - 16px));
  padding: 7px 10px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  background: var(--tip-bg);
  box-shadow: 0 2px 4px rgb(0 0 0 / 12%), 0 6px 16px rgb(0 0 0 / 14%);
  color: var(--text);
  font-size: 12px;
  line-height: 1.45;
  pointer-events: none;
  animation: tip-in .12s ease-out;
}

/* the triangle: a square turned 45°, two of its borders showing – at the bottom (pointing down), on top when below */
.tip::before {
  position: absolute;
  bottom: -6px;
  left: var(--arrow, 50%);
  width: 10px;
  height: 10px;
  border-right: 1px solid var(--line-strong);
  border-bottom: 1px solid var(--line-strong);
  background: var(--tip-bg);
  translate: -50% 0;
  rotate: 45deg;
  content: '';
}

/* it can be entered: the pointer works in it, and an invisible bridge over the gap keeps it while crossing */
.tip--interactive {
  pointer-events: auto;
}

.tip--interactive::after {
  position: absolute;
  right: 0;
  bottom: -12px;
  left: 0;
  height: 12px;
  content: '';
}

.tip--interactive.tip--below::after {
  top: -12px;
  bottom: auto;
}

.tip--below::before {
  top: -6px;
  bottom: auto;
  border: 0;
  border-top: 1px solid var(--line-strong);
  border-left: 1px solid var(--line-strong);
}

@keyframes tip-in {
  from {
    opacity: 0;
  }
}
</style>
