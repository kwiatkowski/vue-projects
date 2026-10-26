<template>
  <DropMenu align="start" :label="`${label}: ${url}`" trigger-class="menu__bare site-link">
    <template #trigger>
      <slot />
    </template>

    <div class="site-link__head faint mono">{{ url }}</div>

    <a
      class="menu__item"
      :href="url"
      rel="noopener"
      role="menuitem"
      target="_blank"
    >
      <SquareArrowOutUpRight /> Otwórz stronę
    </a>

    <a
      v-if="adminUrl"
      class="menu__item"
      :href="adminUrl"
      rel="noopener"
      role="menuitem"
      target="_blank"
    >
      <LogIn /> Otwórz panel
    </a>

    <button class="menu__item" role="menuitem" type="button" @click="copy">
      <Copy /> Kopiuj adres
    </button>
  </DropMenu>
</template>

<script lang="ts" setup>
  import { Copy, LogIn, SquareArrowOutUpRight } from 'lucide-vue-next'
  import DropMenu from '@/components/ui/DropMenu.vue'
  import { useNotifyStore } from '@/stores/notify'

  /** An icon in the list (the local copy, staging) – a click opens a small menu: the site, its panel, copy the address. */
  const props = defineProps<{ url: string, adminUrl?: string | null, label: string }>()

  const notify = useNotifyStore()

  async function copy (): Promise<void> {
    try {
      await navigator.clipboard.writeText(props.url)
      notify.show('Adres skopiowany do schowka.')
    } catch {
      notify.show('Nie udało się skopiować.', { tone: 'error' })
    }
  }
</script>

<style>
.site-link {
  color: var(--text-2);
}

.site-link:hover,
.site-link[aria-expanded='true'] {
  color: var(--accent-text);
}

.site-link svg {
  width: 16px;
  height: 16px;
}

.site-link__head {
  max-width: 260px;
  padding: 6px 10px 4px;
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* the items are links here too – the same look as the buttons */
a.menu__item {
  color: inherit;
  text-decoration: none;
}
</style>
