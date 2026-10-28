<template>
  <div class="menu" @click.stop>
    <!-- `tip`: the label in the app's tooltip instead of the browser's -->
    <HoverTip v-if="tip" :text="label">
      <button
        ref="trigger"
        :aria-expanded="open"
        aria-haspopup="menu"
        :aria-label="label"
        :class="triggerClass"
        :disabled="disabled"
        type="button"
        @click="toggle"
      >
        <slot name="trigger"><Ellipsis /></slot>
      </button>
    </HoverTip>

    <button
      v-else
      ref="trigger"
      :aria-expanded="open"
      aria-haspopup="menu"
      :aria-label="label"
      :class="triggerClass"
      :disabled="disabled"
      :title="title ? label : undefined"
      type="button"
      @click="toggle"
    >
      <slot name="trigger"><Ellipsis /></slot>
    </button>

    <Teleport :to="layer">
      <Transition name="menu-pop">
        <div
          v-if="open"
          ref="panel"
          class="menu__panel"
          :class="[panelClass, matchWidth && `menu__panel--attached menu__panel--${attachedBelow ? 'below' : 'above'}`]"
          role="menu"
          :style="position"
          @click="pick"
          @keydown.esc.prevent.stop="pick"
        >
          <slot />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
  import { Ellipsis } from 'lucide-vue-next'
  import { nextTick, onBeforeUnmount, ref, useTemplateRef } from 'vue'
  import HoverTip from '@/components/ui/HoverTip.vue'

  /**
   * A "…" button with a small menu; items are `<button class="menu__item">` in the default slot.
   * The `trigger` slot and `triggerClass` turn the button into something else, e.g. a chip.
   */
  const props = withDefaults(defineProps<{
    label?: string
    triggerClass?: string
    /** which edge of the trigger the panel lines up with */
    align?: 'start' | 'end'
    /** a select-like trigger: the panel exactly under it, at least as wide */
    matchWidth?: boolean
    disabled?: boolean
    /** the label in a HoverTip, not the browser's title */
    tip?: boolean
    /** the browser's title with the label – off when the trigger sits in a HoverTip of its own */
    title?: boolean
    /** a class for the panel (it is rendered in <body>, out of the caller's scoped styles) */
    panelClass?: string
  }>(), { label: 'Więcej', triggerClass: 'btn btn--icon btn--sm', align: 'end', matchWidth: false, disabled: false, tip: false, title: true, panelClass: '' })

  const open = ref(false)
  const position = ref<Record<string, string>>({})
  /** where the panel goes: <body>, or the open <dialog> the trigger is in – a modal dialog covers everything in <body> */
  const layer = ref<string | HTMLElement>('body')
  /** matchWidth: the panel hangs under the trigger, or sits on top of it when there's no room below */
  const attachedBelow = ref(true)
  const trigger = useTemplateRef<HTMLButtonElement>('trigger')
  const panel = useTemplateRef<HTMLDivElement>('panel')

  async function toggle (): Promise<void> {
    if (open.value) {
      close()

      return
    }

    layer.value = trigger.value?.closest('dialog') ?? 'body'
    open.value = true
    await nextTick()
    place()
    // a search field first, if the list has one; else the first item
    panel.value?.querySelector<HTMLElement>('input, button')?.focus()
    document.addEventListener('pointerdown', outside, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
  }

  /** Under the trigger, aligned to its edge; flipped above when there is no room below. */
  function place (): void {
    const anchor = trigger.value?.getBoundingClientRect()
    const height = panel.value?.offsetHeight ?? 0

    if (!anchor) {
      return
    }

    const below = anchor.bottom + 4 + height < window.innerHeight
    const top = `${below ? anchor.bottom + 4 : anchor.top - 4 - height}px`

    if (props.matchWidth) {
      // just under the trigger's focus ring (3px), as wide as the trigger
      attachedBelow.value = below
      position.value = {
        top: `${below ? anchor.bottom + 3 : anchor.top - 3 - height}px`,
        left: `${anchor.left}px`,
        width: `${anchor.width}px`,
      }

      return
    }

    position.value = props.align === 'start'
      ? { top, left: `${Math.max(anchor.left - 6, 8)}px` }
      : { top, right: `${Math.max(window.innerWidth - anchor.right, 8)}px` }
  }

  /** an item chosen (or Esc) – closed, and a select-like trigger gets the focus back, as a native select does */
  function pick (): void {
    close()

    if (props.matchWidth) {
      trigger.value?.focus({ preventScroll: true })
    }
  }

  function close (): void {
    open.value = false
    document.removeEventListener('pointerdown', outside, true)
    window.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', close)
  }

  /** the page (or the dialog) scrolling moves the trigger away – close; scrolling the panel's own list doesn't */
  function onScroll (event: Event): void {
    if (!panel.value?.contains(event.target as Node)) {
      close()
    }
  }

  function outside (event: PointerEvent): void {
    const target = event.target as Node

    if (!panel.value?.contains(target) && !trigger.value?.contains(target)) {
      close()
    }
  }

  onBeforeUnmount(close)
</script>

<style>
/* a trigger without looks of its own – the slot draws it */
.menu__bare {
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.menu__panel {
  position: fixed;
  z-index: 50;
  min-width: 190px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-pop);
  animation: menu-in .1s ease-out;
}

@keyframes menu-in {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
}

.menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.menu__item svg {
  width: 15px;
  height: 15px;
  color: var(--text-2);
}

.menu__item:hover,
.menu__item:focus-visible {
  background: var(--hover);
  outline: none;
}

.menu__item:disabled {
  opacity: .4;
  cursor: default;
}

.menu__item:disabled:hover {
  background: transparent;
}

.menu__item--danger,
.menu__item--danger svg {
  color: var(--danger);
}

.menu__item--current {
  font-weight: 500;
}

.menu__check {
  margin-left: auto;
}

.menu__label {
  padding: 8px 10px 2px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-3);
}

.menu__panel {
  max-height: min(420px, 70vh);
  overflow-y: auto;
}

/* a select's list: just under it, as wide, items edge to edge, edged like a plain field */
.menu__panel--attached {
  min-width: 0;
  padding: 4px;
  border-color: var(--line-strong);
  box-shadow: var(--shadow);
  animation: none;
  scrollbar-width: thin;
  scrollbar-color: var(--line-strong) transparent;
}

.menu__panel--attached .menu__item {
  border-radius: 4px;
  padding: 0 12px;
}

.menu__panel--attached .menu__item + .menu__item {
  margin-top: 1px;
}

/* status dots in a list don't pulse – only the one shown in the field (and the table) does */
.menu__panel .menu__item .dot::after {
  display: none;
}

/* the chosen option – like one under the pointer */
.menu__panel--attached .menu__item[aria-checked='true'] {
  background: var(--hover);
}

/* it unrolls from the select and rolls back into it */
.menu__panel--attached.menu-pop-enter-active,
.menu__panel--attached.menu-pop-leave-active {
  transition: clip-path .18s ease, opacity .18s ease;
}

.menu__panel--below.menu-pop-enter-from,
.menu__panel--below.menu-pop-leave-to {
  clip-path: inset(0 0 100% 0);
  opacity: .4;
}

.menu__panel--above.menu-pop-enter-from,
.menu__panel--above.menu-pop-leave-to {
  clip-path: inset(100% 0 0 0);
  opacity: .4;
}

/* the other menus fade out as they faded in */
.menu-pop-leave-active:not(.menu__panel--attached) {
  transition: opacity .1s ease;
}

.menu-pop-leave-to:not(.menu__panel--attached) {
  opacity: 0;
}

.menu__sep {
  height: 1px;
  margin: 4px 6px;
  background: var(--line);
}
</style>
