<template>
  <DropMenu align="start" :label="`${label}: ${url}`" :title="false" :trigger-class="`menu__bare site-link${up ? ' site-link--up' : ''}`">
    <template #trigger>
      <slot />
    </template>

    <div class="site-link__head faint mono">{{ url }}</div>
    <div v-if="statusText" class="site-link__status" :class="{ 'site-link__status--up': up }">{{ statusText }}</div>

    <!-- the site and its panel: the name opens it, the icons beside open it or copy the address -->
    <div v-for="row in rows" :key="row.url" class="site-link__row">
      <a
        class="menu__item site-link__name"
        :href="row.url"
        rel="noopener"
        role="menuitem"
        target="_blank"
      >
        <component :is="row.icon" /> {{ row.label }}
      </a>

      <a
        :aria-label="`Otwórz: ${row.label}`"
        class="btn btn--icon btn--sm"
        :href="row.url"
        rel="noopener"
        target="_blank"
      ><SquareArrowOutUpRight /></a>

      <button :aria-label="`Kopiuj adres: ${row.label}`" class="btn btn--icon btn--sm" type="button" @click="copy(row.url)">
        <Copy />
      </button>
    </div>
  </DropMenu>
</template>

<script lang="ts" setup>
  import { Copy, Globe, LogIn, SquareArrowOutUpRight } from 'lucide-vue-next'
  import { computed } from 'vue'
  import DropMenu from '@/components/ui/DropMenu.vue'
  import { useNotifyStore } from '@/stores/notify'
  import { formatDateTime } from '@/utils/projects'

  /**
   * An icon in the list (the local copy, staging) – a click opens a small menu: the site and its panel, each with
   * "open" and "copy" beside it.
   */
  const props = defineProps<{ url: string, adminUrl?: string | null, label: string, status?: { code: number, checkedAt: string } | null }>()

  /** the list checked the address (the staging) and it answered 200 – the icon in the accent colour */
  const up = computed(() => props.status?.code === 200)

  /** the list's check, at the top of the menu (no tooltip on the icon) */
  const statusText = computed(() => {
    const status = props.status

    if (!status) {
      return ''
    }

    const answer = status.code === 200 ? 'odpowiada (200)' : (status.code ? `nie odpowiada (HTTP ${status.code})` : 'nie odpowiada')

    return `${answer}, sprawdzono ${formatDateTime(status.checkedAt).slice(-5)}`
  })

  const rows = computed(() => [
    { label: props.label, url: props.url, icon: Globe },
    ...(props.adminUrl ? [{ label: 'Panel', url: props.adminUrl, icon: LogIn }] : []),
  ])

  const notify = useNotifyStore()

  async function copy (url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url)
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
.site-link[aria-expanded='true'],
.site-link--up {
  color: var(--accent-text);
}

.site-link svg {
  width: 16px;
  height: 16px;
}

.site-link__status {
  padding: 0 10px 4px;
  color: var(--text-3);
  font-size: 11px;
}

.site-link__status--up {
  color: var(--accent-text);
}

.site-link__head {
  max-width: 260px;
  padding: 6px 10px 4px;
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* a row: the name (it opens too) and the two icons */
.site-link__row {
  display: flex;
  align-items: center;
  gap: 2px;
}

.site-link__name {
  flex: 1;
  min-width: 150px;
}

.site-link__row .btn--icon {
  color: var(--text-2);
}

.site-link__row .btn--icon:hover {
  color: var(--text);
}

/* the items are links here too – the same look as the buttons */
a.menu__item {
  color: inherit;
  text-decoration: none;
}
</style>
