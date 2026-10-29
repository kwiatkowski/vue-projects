<template>
  <!-- a popup on hover, as the report's – it can be entered; showing it fetches the Basic Auth password, ready for the lock -->
  <HoverTip :anchor-class="`site-link${up ? ' site-link--up' : ''}`" interactive @show="loadPassword">
    <span :aria-label="`${label}: ${url}`" class="site-link__icon" role="button" tabindex="0">
      <slot />
    </span>

    <template #tip>
      <div class="site-link__head faint mono">{{ url }}</div>
      <div v-if="statusText" class="site-link__status" :class="{ 'site-link__status--up': up }">{{ statusText }}</div>

      <!-- the site and its panel: the name opens it; behind Basic Auth the lock opens it with the login and password in the
         address, and copy takes that address – else the icons beside open it or copy it -->
      <div v-for="row in rows" :key="row.url" class="site-link__row">
        <a
          class="menu__item site-link__name"
          :href="row.url"
          rel="noopener"
          target="_blank"
        >
          <component :is="row.icon" /> {{ row.label }}
        </a>

        <button
          v-if="auth"
          :aria-label="`Otwórz z loginem i hasłem: ${row.label}`"
          class="btn btn--icon btn--sm"
          type="button"
          @click="openWithAuth(row.url)"
        >
          <LockKeyhole />
        </button>

        <a
          v-else
          :aria-label="`Otwórz: ${row.label}`"
          class="btn btn--icon btn--sm"
          :href="row.url"
          rel="noopener"
          target="_blank"
        ><SquareArrowOutUpRight /></a>

        <button
          :aria-label="auth ? `Kopiuj adres z loginem i hasłem: ${row.label}` : `Kopiuj adres: ${row.label}`"
          class="btn btn--icon btn--sm"
          type="button"
          @click="copy(row.url)"
        >
          <Copy />
        </button>
      </div>
    </template>
  </HoverTip>
</template>

<script lang="ts" setup>
  import { Copy, Globe, LockKeyhole, LogIn, SquareArrowOutUpRight } from 'lucide-vue-next'
  import { computed } from 'vue'
  import HoverTip from '@/components/ui/HoverTip.vue'
  import { useNotifyStore } from '@/stores/notify'
  import { formatDateTime } from '@/utils/projects'

  /**
   * An icon in the list (the local copy, staging) – hovering it shows a popup: the site and its panel, each with
   * "open" and "copy" beside it.
   */
  const props = defineProps<{
    url: string
    adminUrl?: string | null
    label: string
    status?: { code: number, checkedAt: string } | null
    /** the staging behind Basic Auth: its login and how to get its password (the owner's only) */
    auth?: { user: string, password: () => Promise<string | null> } | null
  }>()

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

  /** the password, fetched once the menu opens */
  let password: Promise<string | null> | null = null

  function loadPassword (): void {
    if (props.auth && !password) {
      password = props.auth.password().catch(() => {
        password = null

        return null
      })
    }
  }

  /** the address with the login and password in it – the browser passes them to Basic Auth; null without a password */
  async function withAuth (url: string): Promise<string | null> {
    loadPassword()
    const secret = await password

    if (!props.auth || !secret) {
      return null
    }

    const address = new URL(url)
    address.username = encodeURIComponent(props.auth.user)
    address.password = encodeURIComponent(secret)

    return address.toString()
  }

  async function openWithAuth (url: string): Promise<void> {
    const address = await withAuth(url)

    if (address) {
      window.open(address, '_blank', 'noopener')
    } else {
      notify.show('Nie udało się pobrać hasła.', { tone: 'error' })
    }
  }

  async function copy (url: string): Promise<void> {
    const address = props.auth ? await withAuth(url) : url

    if (!address) {
      notify.show('Nie udało się pobrać hasła.', { tone: 'error' })

      return
    }

    try {
      await navigator.clipboard.writeText(address)
      notify.show(props.auth ? 'Adres z loginem i hasłem skopiowany do schowka.' : 'Adres skopiowany do schowka.')
    } catch {
      notify.show('Nie udało się skopiować.', { tone: 'error' })
    }
  }
</script>

<style>
.site-link {
  justify-content: center;
  color: var(--text-2);
}

.site-link:hover,
.site-link--up {
  color: var(--accent-text);
}

.site-link svg {
  width: 16px;
  height: 16px;
}

.site-link__status {
  padding: 0 4px 4px;
  color: var(--text-3);
  font-size: 11px;
}

.site-link__status--up {
  color: var(--accent-text);
}

.site-link__head {
  max-width: 260px;
  padding: 0 4px 4px;
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* a row: the name (it opens too) and the two icons – the hover over all of it, as on the report's actions */
.site-link__row {
  display: flex;
  align-items: center;
  gap: 2px;
  margin: 0 -6px;
  border-radius: var(--radius-sm);
}

.site-link__row:last-child {
  margin-bottom: -3px;
}

.site-link__row:hover {
  background: color-mix(in srgb, var(--tip-bg) 85%, var(--text));
}

.site-link__row .menu__item {
  color: var(--text);
}

.site-link__row .site-link__name:hover {
  background: transparent;
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
