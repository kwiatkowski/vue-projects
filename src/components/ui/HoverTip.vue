<template>
  <span
    ref="anchor"
    class="tip-anchor"
    @focusin="show"
    @focusout="hide"
    @mouseenter="show"
    @mouseleave="hide"
  >
    <slot />
  </span>

  <Teleport to="body">
    <div
      v-if="open"
      ref="tip"
      class="tip"
      :class="{ 'tip--below': below }"
      role="tooltip"
      :style="position"
    >
      <slot name="tip">{{ text }}</slot>
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
   */
  defineProps<{ text?: string }>()

  /** room kept from the screen's edges, the gap to the anchor (the triangle sits in it) */
  const EDGE = 8
  const GAP = 10

  const anchor = useTemplateRef<HTMLElement>('anchor')
  const tip = useTemplateRef<HTMLElement>('tip')
  const open = ref(false)
  const below = ref(false)
  // measured first while invisible, then placed
  const position = ref<Record<string, string>>({ visibility: 'hidden' })

  async function show (): Promise<void> {
    position.value = { visibility: 'hidden', left: '0px', top: '0px' }
    open.value = true
    window.addEventListener('scroll', hide, { capture: true, passive: true })

    await nextTick()

    const box = anchor.value?.getBoundingClientRect()
    const size = tip.value?.getBoundingClientRect()

    if (!box || !size) {
      return
    }

    const center = box.left + box.width / 2
    const left = Math.min(Math.max(center - size.width / 2, EDGE), window.innerWidth - size.width - EDGE)

    // the top bar and the page's sticky header cover the upper part of the screen – no room above there
    const top = (document.querySelector('.head')?.getBoundingClientRect().bottom ?? 0) + EDGE

    below.value = box.top - GAP - size.height < top
    position.value = {
      'left': `${left}px`,
      'top': `${below.value ? box.bottom + GAP : box.top - GAP - size.height}px`,
      // where the triangle points – the anchor's centre, kept off the rounded corners
      '--arrow': `${Math.min(Math.max(center - left, 12), size.width - 12)}px`,
    }
  }

  function hide (): void {
    open.value = false
    window.removeEventListener('scroll', hide, { capture: true })
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
  /* a shade lifted from the table it floats over (lighter in the dark theme, darker in the light one) */
  --tip-bg: color-mix(in srgb, var(--surface) 88%, var(--text));

  position: fixed;
  z-index: 60;
  /* as wide as its content – near the screen's right edge a fixed box would otherwise squeeze and wrap */
  width: max-content;
  max-width: 280px;
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
