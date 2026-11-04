<template>
  <header class="top">
    <RouterLink class="top__brand" :to="{ name: 'projects' }">
      <span aria-hidden="true" class="top__logo"><Layers /></span>
      <span class="top__site">Lista projektów</span>
    </RouterLink>

    <!-- the plugin's version (RRRR.MM.DD[.N]) – which build of the list this is; the owner's click shows what's new -->
    <button
      v-if="config.version && config.canManage"
      v-tip="'Co nowego'"
      class="top__version top__version--link mono"
      type="button"
      @click="columns.changelogOpen = true"
    >
      {{ config.version }}
    </button>

    <span v-else-if="config.version" class="top__version mono">{{ config.version }}</span>

    <span class="top__space" />

    <!-- adding – rare, so one quiet button: a new project (the more frequent) or a new category -->
    <DropMenu
      v-if="config.canManage"
      label="Dodaj"
      panel-class="user-menu"
      :title="false"
      trigger-class="btn btn--sm btn--outline"
    >
      <template #trigger>
        <Plus /> <span class="top__label">Dodaj</span>
        <ChevronDown class="top__caret" />
      </template>

      <button class="menu__item" role="menuitem" type="button" @click="projects.editing = 'new'">
        <SquarePlus /> Nowy projekt
      </button>

      <button class="menu__item" role="menuitem" type="button" @click="projects.editingCategory = 'new'">
        <FolderPlus /> Nowa kategoria
      </button>
    </DropMenu>

    <!-- the owner's preview: says as whom, and leads back to the owner's view -->
    <button
      v-if="config.preview"
      v-tip="'Wróć do swojego widoku'"
      class="btn btn--sm top__preview"
      type="button"
      @click="viewAs('admin')"
    >
      <Eye /> <span class="top__label">Podgląd: {{ VIEW_LABELS[config.preview] }} ·</span> Wróć
    </button>

    <!-- the theme: the list's dark and light, meden.com.pl's light and dark – a swatch of each -->
    <DropMenu label="Motyw" panel-class="theme-menu" :title="false" trigger-class="btn btn--icon btn--sm">
      <template #trigger>
        <Moon v-if="dark" />
        <Sun v-else />
      </template>

      <div class="user-menu__label eyebrow">Motyw</div>

      <button
        v-for="item in THEMES"
        :key="item.value"
        :aria-checked="theme === item.value"
        class="menu__item"
        role="menuitemradio"
        type="button"
        @click="setTheme(item.value)"
      >
        <span aria-hidden="true" class="theme-swatch" :style="{ '--swatch-bg': item.bg, '--swatch-accent': item.accent }" />
        {{ item.label }}
        <Check v-if="theme === item.value" class="user-menu__tick" />
      </button>
    </DropMenu>

    <!-- the owner's photo opens the account's menu: whose view to look at, and logging out -->
    <DropMenu
      v-if="config.user"
      :label="`Konto: ${config.user.name}`"
      panel-class="user-menu"
      :title="false"
      :trigger-class="`menu__bare top__me${config.preview ? ' top__me--preview' : ''}`"
    >
      <template #trigger>
        <img
          alt=""
          class="top__avatar"
          height="24"
          :src="config.user.avatar"
          width="24"
        >

        <ChevronDown class="top__caret" />
      </template>

      <div class="user-menu__head">
        <strong>{{ config.user.name }}</strong>
        <span class="faint">{{ owner ? 'administrator listy' : 'zalogowany w WordPressie' }}</span>
      </div>

      <!-- the list as a viewer or a guest sees it – without logging out -->
      <template v-if="owner">
        <div class="user-menu__label eyebrow">Widok jako</div>

        <button
          v-for="view in (['admin', 'viewer', 'guest'] as const)"
          :key="view"
          :aria-checked="current === view"
          class="menu__item user-menu__view"
          role="menuitemradio"
          type="button"
          @click="viewAs(view)"
        >
          <component :is="VIEW_ICONS[view]" /> {{ VIEW_LABELS[view] }}
          <Check v-if="current === view" class="user-menu__tick" />
        </button>

        <div class="user-menu__sep" />
      </template>

      <!-- the account for viewers, and who may see which columns -->
      <button
        v-if="config.canManage"
        class="menu__item"
        role="menuitem"
        type="button"
        @click="columns.settingsOpen = true"
      >
        <Settings /> Ustawienia
      </button>

      <!-- e-mail and Slack: where the alerts and the weekly summary go -->
      <button
        v-if="config.canManage"
        class="menu__item"
        role="menuitem"
        type="button"
        @click="columns.alertsOpen = true"
      >
        <Bell /> Powiadomienia
      </button>

      <button
        v-if="config.canManage"
        class="menu__item"
        role="menuitem"
        type="button"
        @click="columns.changelogOpen = true"
      >
        <Sparkles /> Co nowego
      </button>

      <a v-if="config.logoutUrl" class="menu__item" :href="config.logoutUrl" role="menuitem">
        <LogOut /> Wyloguj
      </a>
    </DropMenu>

    <!-- logged in with the list's own account: its name opens a menu with logging out -->
    <DropMenu
      v-else-if="config.viewer"
      :label="`Konto: ${config.viewer.login}`"
      panel-class="user-menu"
      :title="false"
      trigger-class="menu__bare top__me top__me--viewer"
    >
      <template #trigger>
        <UserRound class="top__viewer-icon" />
        <span class="top__label">{{ config.viewer.login }}</span>
        <ChevronDown class="top__caret" />
      </template>

      <div class="user-menu__head">
        <strong>{{ config.viewer.login }}</strong>
        <span class="faint">zalogowany</span>
      </div>

      <button class="menu__item" role="menuitem" type="button" @click="viewerLogout">
        <LogOut /> Wyloguj
      </button>
    </DropMenu>

    <!-- a guest: the list's own account when there is one, otherwise WordPress's login -->
    <button v-else-if="config.viewerAccount" class="btn btn--sm btn--outline" type="button" @click="loginOpen = true">
      <LogIn /> <span class="top__label">Zaloguj</span>
    </button>

    <a v-else-if="config.loginUrl" class="btn btn--sm btn--outline" :href="config.loginUrl">
      <LogIn /> <span class="top__label">Zaloguj</span>
    </a>

    <LoginDialog v-if="config.viewerAccount && !config.user" v-model="loginOpen" />
  </header>
</template>

<script lang="ts" setup>
  import { Bell, Check, ChevronDown, Eye, FolderPlus, Layers, LogIn, LogOut, Moon, Plus, Settings, ShieldCheck, Sparkles, SquarePlus, Sun, UserRound, Users } from 'lucide-vue-next'
  import { computed, ref } from 'vue'
  import { viewerApi } from '@/api/projects'
  import LoginDialog from '@/components/LoginDialog.vue'
  import DropMenu from '@/components/ui/DropMenu.vue'
  import { THEMES, useTheme } from '@/composables/theme'
  import { config } from '@/config'
  import { vTip } from '@/directives/tip'
  import { useColumnsStore } from '@/stores/columns'
  import { useProjectsStore } from '@/stores/projects'

  const projects = useProjectsStore()
  const columns = useColumnsStore()
  const { theme, dark, setTheme } = useTheme()

  type View = 'admin' | 'viewer' | 'guest'

  const VIEW_LABELS: Record<View, string> = { admin: 'Admin – wszystko', viewer: 'Zalogowany', guest: 'Gość' }
  const VIEW_ICONS = { admin: ShieldCheck, viewer: UserRound, guest: Users }

  /** the owner – also while looking as someone else */
  const owner = config.canManage || config.preview !== null
  const current = computed<View>(() => config.preview ?? 'admin')
  const loginOpen = ref(false)

  /** the same page as the owner, a viewer or a guest sees it (?podglad) – the server decides what the page gets */
  function viewAs (view: View): void {
    const url = new URL(window.location.href)

    if (view === 'admin') {
      url.searchParams.delete('podglad')
    } else {
      url.searchParams.set('podglad', view === 'viewer' ? 'zalogowany' : 'gosc')
    }

    window.location.assign(url)
  }

  async function viewerLogout (): Promise<void> {
    await viewerApi.logout().catch(() => null)
    window.location.reload()
  }
</script>

<style scoped>
.top {
  position: sticky;
  z-index: 20;
  top: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  height: var(--topbar-size);
  /* below 1500px it slides up, whole, while the list is scrolled (--topbar → 0, app.css) – the margin gives its room to
     the page at the same pace */
  margin-bottom: calc(var(--topbar) - var(--topbar-size));
  padding: 0 var(--edge);
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(8px);
  translate: 0 calc(var(--topbar) - var(--topbar-size));
  transition: translate .2s ease, margin-bottom .2s ease;
}

.top__brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-weight: 600;
}

.top__logo {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: var(--accent);
  color: var(--accent-ink);
}

.top__logo svg {
  width: 15px;
  height: 15px;
}

.top__site {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top__version {
  margin-left: 2px;
  color: var(--text-3);
  font-size: 11px;
  white-space: nowrap;
}

/* the owner's: a button – "Co nowego" */
.top__version--link {
  margin-left: -2px;
  padding: 2px 4px;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  cursor: pointer;
}

.top__version--link:hover {
  background: var(--hover);
  color: var(--text);
}

/* a theme's swatch: its background with its accent as a dot */
.theme-swatch {
  position: relative;
  flex: none;
  width: 16px;
  height: 16px;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  background: var(--swatch-bg);
}

.theme-swatch::after {
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: var(--swatch-accent);
  content: '';
}

.top__space {
  flex: 1;
}

/* the owner's preview – in the warning colour, so it isn't mistaken for the owner's list */
.top__preview {
  border: 1px solid var(--warn);
  background: var(--warn-soft);
  color: var(--warn);
}

.top__preview:hover {
  background: var(--warn-soft);
  color: var(--text);
}

.top__avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

/* the photo and a small arrow – one button for the account's menu */
.top :deep(.top__me) {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 4px;
  padding: 2px 4px 2px 2px;
  border-radius: 999px;
  color: var(--text-3);
}

.top :deep(.top__me:hover),
.top :deep(.top__me[aria-expanded='true']) {
  background: var(--hover);
  color: var(--text);
}

/* the guest's view: the photo ringed in the warning colour */
.top :deep(.top__me--preview .top__avatar) {
  box-shadow: 0 0 0 1px var(--warn);
}

.top :deep(.top__me--viewer) {
  gap: 6px;
  padding: 4px 6px;
  color: var(--text-2);
  font-size: 13px;
}

.top__viewer-icon {
  width: 16px;
  height: 16px;
}

.top__caret {
  width: 14px;
  height: 14px;
}

@media (max-width: 560px) {
  .top__label {
    display: none;
  }
}
</style>

<!-- the account's menu is rendered in <body> – out of the scoped styles -->
<style>
.user-menu {
  min-width: 220px;
}

.user-menu__head {
  display: grid;
  gap: 1px;
  padding: 6px 10px 8px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 4px;
  font-size: 13px;
}

.user-menu__head .faint {
  font-size: 12px;
}

.user-menu__label {
  padding: 4px 10px 2px;
}

/* the chosen view – a tick on the right */
.user-menu__tick {
  margin-left: auto;
  color: var(--positive);
}

.user-menu__sep {
  margin: 4px 0;
  border-top: 1px solid var(--line);
}
</style>
