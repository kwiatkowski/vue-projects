<template>
  <!-- a popup on hover, as the report's – it can be entered; showing it fetches the Basic Auth password, ready for the lock -->
  <HoverTip :anchor-class="`site-link${check ? ` site-link--${check.tone}` : ''}`" interactive @show="loadPassword">
    <span :aria-label="`${label}: ${url}`" class="site-link__icon" role="button" tabindex="0">
      <slot />
    </span>

    <template #tip>
      <!-- a header as the report's: the name, its address on the right; the list's check under it, as the report's SSL -->
      <div class="report-tip__title">
        <strong>{{ label }}</strong>
        <span class="site-link__host mono faint">{{ host }}</span>
      </div>

      <div v-if="statusText" class="report-tip__row site-link__status" :class="`site-link__status--${check?.tone}`">
        <span>Sprawdzenie</span>
        <span>{{ statusText }}</span>
      </div>

      <!-- the site and its panel: the name opens it, copy beside it; behind Basic Auth also "open" and "copy" with a lock –
           with the login and password in the address -->
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
          <!-- the "open" icon with a small lock in its corner – opens with the login and password; the same on copy -->
          <span class="site-link__auth"><SquareArrowOutUpRight /><LockKeyhole class="site-link__lock" /></span>
        </button>

        <button :aria-label="`Kopiuj adres: ${row.label}`" class="btn btn--icon btn--sm" type="button" @click="copy(row.url)">
          <Copy />
        </button>

        <button
          v-if="auth"
          :aria-label="`Kopiuj adres z loginem i hasłem: ${row.label}`"
          class="btn btn--icon btn--sm"
          type="button"
          @click="copy(row.url, true)"
        >
          <span class="site-link__auth"><Copy /><LockKeyhole class="site-link__lock" /></span>
        </button>
      </div>
    </template>
  </HoverTip>
</template>

<script lang="ts" setup>
  import type { StagingCheck } from '@/types'
  import { Copy, Globe, LockKeyhole, LogIn, SquareArrowOutUpRight } from 'lucide-vue-next'
  import { computed } from 'vue'
  import HoverTip from '@/components/ui/HoverTip.vue'
  import { useNotifyStore } from '@/stores/notify'
  import { formatDateTime, stagingCheck } from '@/utils/projects'

  /**
   * An icon in the list (the local copy, staging) – hovering it shows a popup: the site and its panel, each with
   * "copy" beside it (behind Basic Auth also "open" and "copy" with the login and password).
   */
  const props = defineProps<{
    url: string
    adminUrl?: string | null
    label: string
    status?: StagingCheck | null
    /** the staging behind Basic Auth: its login and how to get its password (the owner's only) */
    auth?: { user: string, password: () => Promise<string | null> } | null
  }>()

  /** the list's check in words and its tone: the icon green, orange (it works, the list can't get in) or red */
  const check = computed(() => props.status ? stagingCheck(props.status) : null)

  /** the list's check, under the header */
  const statusText = computed(() => {
    const status = props.status

    if (!status) {
      return ''
    }

    return `${check.value?.text} · ${formatDateTime(status.checkedAt).slice(-5)}`
  })

  /** the address in the header – without the scheme and the closing slash */
  const host = computed(() => props.url.replace(/^https?:\/\//, '').replace(/\/$/, ''))

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

  /** the address as it is, or with the login and password in it */
  async function copy (url: string, auth = false): Promise<void> {
    const address = auth ? await withAuth(url) : url

    if (!address) {
      notify.show('Nie udało się pobrać hasła.', { tone: 'error' })

      return
    }

    try {
      await navigator.clipboard.writeText(address)
      notify.show(auth ? 'Adres z loginem i hasłem skopiowany do schowka.' : 'Adres skopiowany do schowka.')
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
.site-link--ok {
  color: var(--accent-text);
}

/* the staging's check: orange – it works, but the list can't get in; red – it doesn't work */
.site-link--warn,
.site-link--warn:hover {
  color: var(--warn);
}

.site-link--down,
.site-link--down:hover {
  color: var(--danger);
}

.site-link svg {
  width: 16px;
  height: 16px;
}

/* the check in the icon's colour */
.site-link__status {
  margin: 4px 0 2px;
}

.site-link__status--ok {
  color: var(--accent-text);
}

.site-link__status--warn {
  color: var(--warn);
}

.site-link__status--down {
  color: var(--danger);
}

.site-link__host {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.report-tip__title + .site-link__row {
  margin-top: 4px;
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

/* the lock over the "open" icon's corner, in the accent; its background follows the row's, cutting it out of the icon */
.site-link__auth {
  position: relative;
  display: inline-flex;
}

.site-link__row .site-link__lock {
  position: absolute;
  right: -4px;
  bottom: -4px;
  width: 11px;
  height: 11px;
  padding: 1px;
  border-radius: 50%;
  background: var(--tip-bg);
  color: var(--accent-text);
  stroke-width: 2.75;
}

.site-link__row:hover .site-link__lock {
  background: color-mix(in srgb, var(--tip-bg) 85%, var(--text));
}

/* the items are links here too – the same look as the buttons */
a.menu__item {
  color: inherit;
  text-decoration: none;
}
</style>
