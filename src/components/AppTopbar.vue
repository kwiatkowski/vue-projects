<template>
  <header class="top">
    <RouterLink class="top__brand" :to="{ name: 'projects' }">
      <span aria-hidden="true" class="top__logo"><Layers /></span>
      <span class="top__site">Lista projektów</span>
    </RouterLink>

    <!-- the plugin's version (RRRR.MM.DD) – which build of the list this is -->
    <span v-if="config.version" class="top__version mono">{{ config.version }}</span>

    <span class="top__space" />

    <template v-if="config.canManage">
      <button class="btn btn--sm btn--outline" title="Nowa kategoria" type="button" @click="projects.editingCategory = 'new'">
        <FolderPlus /> <span class="top__label">Nowa kategoria</span>
      </button>

      <button class="btn btn--sm btn--accent" title="Nowy projekt" type="button" @click="projects.editing = 'new'">
        <Plus /> <span class="top__label">Nowy projekt</span>
      </button>
    </template>

    <!-- the owner's preview: says as whom, and leads back to the owner's view -->
    <button
      v-if="config.preview"
      class="btn btn--sm top__preview"
      title="Wróć do swojego widoku"
      type="button"
      @click="viewAs('admin')"
    >
      <Eye /> <span class="top__label">Podgląd: {{ VIEW_LABELS[config.preview] }} ·</span> Wróć
    </button>

    <button
      :aria-label="dark ? 'Jasny motyw' : 'Ciemny motyw'"
      class="btn btn--icon btn--sm"
      :title="dark ? 'Jasny motyw' : 'Ciemny motyw'"
      type="button"
      @click="toggleTheme"
    >
      <Sun v-if="dark" />
      <Moon v-else />
    </button>

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
  import { Check, ChevronDown, Eye, FolderPlus, Layers, LogIn, LogOut, Moon, Plus, Settings, ShieldCheck, Sun, UserRound, Users } from 'lucide-vue-next'
  import { computed, ref } from 'vue'
  import { viewerApi } from '@/api/projects'
  import LoginDialog from '@/components/LoginDialog.vue'
  import DropMenu from '@/components/ui/DropMenu.vue'
  import { useTheme } from '@/composables/theme'
  import { config } from '@/config'
  import { useColumnsStore } from '@/stores/columns'
  import { useProjectsStore } from '@/stores/projects'

  const projects = useProjectsStore()
  const columns = useColumnsStore()
  const { dark, toggleTheme } = useTheme()

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
  box-shadow: 0 0 0 2px var(--warn);
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
