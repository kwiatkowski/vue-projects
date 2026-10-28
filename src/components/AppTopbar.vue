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

    <!-- the guest's view: says so, and leads back to the owner's -->
    <button
      v-if="config.preview"
      class="btn btn--sm top__preview"
      title="Wróć do swojego widoku"
      type="button"
      @click="preview(false)"
    >
      <EyeOff /> <span class="top__label">Podgląd jako gość ·</span> Wróć
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

    <!-- the photo opens the account's menu: the guest's view (a switch) and logging out -->
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
        <span class="faint">{{ config.preview ? 'podgląd jako gość' : (config.canManage ? 'właściciel listy' : 'zalogowany') }}</span>
      </div>

      <!-- the list as everyone else sees it – without logging out -->
      <button
        v-if="config.canManage || config.preview"
        :aria-checked="config.preview"
        class="menu__item user-menu__switch"
        role="menuitemcheckbox"
        type="button"
        @click="preview(!config.preview)"
      >
        <Eye /> Widok gościa
        <span aria-hidden="true" class="switch" :class="{ 'switch--on': config.preview }" />
      </button>

      <a v-if="config.logoutUrl" class="menu__item" :href="config.logoutUrl" role="menuitem">
        <LogOut /> Wyloguj
      </a>
    </DropMenu>

    <a v-else-if="config.loginUrl" class="btn btn--sm btn--outline" :href="config.loginUrl">
      <LogIn /> <span class="top__label">Zaloguj</span>
    </a>
  </header>
</template>

<script lang="ts" setup>
  import { ChevronDown, Eye, EyeOff, FolderPlus, Layers, LogIn, LogOut, Moon, Plus, Sun } from 'lucide-vue-next'
  import DropMenu from '@/components/ui/DropMenu.vue'
  import { useTheme } from '@/composables/theme'
  import { config } from '@/config'
  import { useProjectsStore } from '@/stores/projects'

  const projects = useProjectsStore()
  const { dark, toggleTheme } = useTheme()

  /** the same page with ?podglad (the guest's view) or without it – the server decides what the page gets */
  function preview (on: boolean): void {
    const url = new URL(window.location.href)

    if (on) {
      url.searchParams.set('podglad', '1')
    } else {
      url.searchParams.delete('podglad')
    }

    window.location.assign(url)
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
  height: var(--topbar);
  padding: 0 var(--edge);
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(8px);
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

/* the guest's view – in the warning colour, so it isn't mistaken for the owner's list */
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

/* the switch on the right of its item */
.user-menu__switch .switch {
  margin-left: auto;
}

.switch {
  position: relative;
  flex: none;
  width: 28px;
  height: 16px;
  border-radius: 999px;
  background: var(--line-strong);
  transition: background-color .15s;
}

.switch::after {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--surface);
  content: '';
  transition: translate .15s;
}

.switch--on {
  background: var(--warn);
}

.switch--on::after {
  translate: 12px 0;
}
</style>
