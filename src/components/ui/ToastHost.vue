<template>
  <div ref="host" aria-live="polite" class="toasts" popover="manual">
    <Transition name="toast">
      <div v-if="notify.current" :key="notify.current.id" class="toast" :class="{ 'toast--error': notify.current.tone === 'error' }">
        <span class="toast__text">{{ notify.current.text }}</span>

        <button v-if="notify.current.action" class="toast__action" type="button" @click="runAction">
          {{ notify.current.action.label }}
        </button>

        <button aria-label="Zamknij" class="toast__close" type="button" @click="notify.dismiss()">
          <X />
        </button>
      </div>
    </Transition>
  </div>
</template>

<script lang="ts" setup>
  import { X } from 'lucide-vue-next'
  import { onMounted, useTemplateRef, watch } from 'vue'
  import { useNotifyStore } from '@/stores/notify'

  const notify = useNotifyStore()

  /**
   * A popover is in the top layer – above an open modal dialog (no z-index gets there); shown again for each message,
   * so it lands on top of a dialog opened in the meantime.
   */
  const host = useTemplateRef<HTMLElement>('host')

  function raise (): void {
    if (host.value?.matches(':popover-open')) {
      host.value.hidePopover()
    }

    host.value?.showPopover?.()
  }

  onMounted(raise)

  let timer: ReturnType<typeof setTimeout> | undefined

  // each message lives 5 s; a new one restarts the clock
  watch(() => notify.current?.id, id => {
    clearTimeout(timer)

    if (id !== undefined) {
      raise()
      timer = setTimeout(() => notify.current?.id === id && notify.dismiss(), 5000)
    }
  })

  function runAction (): void {
    const action = notify.current?.action
    notify.dismiss()
    action?.run()
  }
</script>

<style scoped>
.toasts {
  position: fixed;
  z-index: 60;
  /* the popover's own (UA) box – gone: no frame, no background, not centred on the screen */
  inset: auto;
  margin: 0;
  padding: 0;
  overflow: visible;
  border: 0;
  background: none;
  color: inherit;
  bottom: max(20px, env(safe-area-inset-bottom));
  left: 50%;
  translate: -50% 0;
  width: max-content;
  max-width: calc(100vw - 32px);
}

.toast {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  padding: 6px 6px 6px 16px;
  border-radius: var(--radius-lg);
  background: var(--text);
  color: var(--bg);
  box-shadow: var(--shadow-pop);
}

.toast--error {
  background: var(--danger);
  color: #fff;
}

.toast__text {
  margin-right: 8px;
}

.toast__action,
.toast__close {
  display: inline-grid;
  place-items: center;
  height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: inherit;
  font-weight: 600;
  cursor: pointer;
}

.toast__action {
  color: var(--accent-soft);
}

.toast__close {
  width: 32px;
  padding: 0;
  opacity: .7;
}

.toast__close svg {
  width: 16px;
  height: 16px;
}

.toast__action:hover,
.toast__close:hover {
  background: rgb(255 255 255 / 12%);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity .16s, transform .16s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
