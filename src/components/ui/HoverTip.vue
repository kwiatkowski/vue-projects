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
  import { onBeforeUnmount, ref, useTemplateRef } from 'vue'

  /**
   * A tooltip in the app's style instead of the browser's `title`: `text`, or the `tip` slot for more lines.
   * Rendered in <body>, so the table's own scrolling doesn't clip it; above the anchor, below it near the top.
   */
  defineProps<{ text?: string }>()

  const anchor = useTemplateRef<HTMLElement>('anchor')
  const open = ref(false)
  const below = ref(false)
  const position = ref<Record<string, string>>({})

  function show (): void {
    const box = anchor.value?.getBoundingClientRect()

    if (!box) {
      return
    }

    // the sticky header and the top bar take the upper part – there it opens downwards
    below.value = box.top < 160
    position.value = {
      left: `${box.left + box.width / 2}px`,
      top: `${below.value ? box.bottom + 8 : box.top - 8}px`,
    }
    open.value = true
    window.addEventListener('scroll', hide, { capture: true, passive: true })
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
  position: fixed;
  z-index: 60;
  max-width: 280px;
  padding: 7px 10px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-pop);
  color: var(--text);
  font-size: 12px;
  line-height: 1.45;
  translate: -50% -100%;
  pointer-events: none;
  animation: tip-in .12s ease-out;
}

.tip--below {
  translate: -50% 0;
}

@keyframes tip-in {
  from {
    opacity: 0;
  }
}
</style>
