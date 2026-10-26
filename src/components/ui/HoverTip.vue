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
      :class="{ 'tip--above': above }"
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
   * A bubble with a little triangle pointing at the anchor – below it and centred by default; pushed sideways when it
   * would leave the screen (the triangle still points at the anchor), above it when there's no room below.
   * Rendered in <body>, so the table's own scrolling doesn't clip it.
   */
  defineProps<{ text?: string }>()

  /** room kept from the screen's edges, the gap to the anchor (the triangle sits in it) */
  const EDGE = 8
  const GAP = 10

  const anchor = useTemplateRef<HTMLElement>('anchor')
  const tip = useTemplateRef<HTMLElement>('tip')
  const open = ref(false)
  const above = ref(false)
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

    above.value = box.bottom + GAP + size.height > window.innerHeight - EDGE && box.top - GAP - size.height >= EDGE
    position.value = {
      'left': `${left}px`,
      'top': `${above.value ? box.top - GAP - size.height : box.bottom + GAP}px`,
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
  max-width: 280px;
  padding: 7px 10px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  background: var(--tip-bg);
  box-shadow: var(--shadow-pop);
  color: var(--text);
  font-size: 12px;
  line-height: 1.45;
  pointer-events: none;
  animation: tip-in .12s ease-out;
}

/* the triangle: a square turned 45°, two of its borders showing – on top (pointing up), or at the bottom when above */
.tip::before {
  position: absolute;
  top: -6px;
  left: var(--arrow, 50%);
  width: 10px;
  height: 10px;
  border-top: 1px solid var(--line-strong);
  border-left: 1px solid var(--line-strong);
  background: var(--tip-bg);
  translate: -50% 0;
  rotate: 45deg;
  content: '';
}

.tip--above::before {
  top: auto;
  bottom: -6px;
  border: 0;
  border-right: 1px solid var(--line-strong);
  border-bottom: 1px solid var(--line-strong);
}

@keyframes tip-in {
  from {
    opacity: 0;
  }
}
</style>
