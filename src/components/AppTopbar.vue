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

      <!-- the list as everyone else sees it – without logging out -->
      <button class="btn btn--sm btn--outline" title="Zobacz listę tak, jak widzą ją niezalogowani" type="button" @click="preview(true)">
        <Eye /> <span class="top__label">Widok gościa</span>
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

    <template v-if="config.user">
      <img
        alt=""
        class="top__avatar"
        height="24"
        :src="config.user.avatar"
        :title="config.user.name"
        width="24"
      >

      <a v-if="config.logoutUrl" class="btn btn--icon btn--sm" :href="config.logoutUrl" title="Wyloguj">
        <LogOut />
        <span class="visually-hidden">Wyloguj</span>
      </a>
    </template>

    <a v-else-if="config.loginUrl" class="btn btn--sm btn--outline" :href="config.loginUrl">
      <LogIn /> <span class="top__label">Zaloguj</span>
    </a>
  </header>
</template>

<script lang="ts" setup>
  import { Eye, EyeOff, FolderPlus, Layers, LogIn, LogOut, Moon, Plus, Sun } from 'lucide-vue-next'
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
  margin-left: 4px;
  border-radius: 50%;
}

@media (max-width: 560px) {
  .top__label {
    display: none;
  }
}
</style>
