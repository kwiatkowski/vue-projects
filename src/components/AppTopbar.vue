<template>
  <header class="top">
    <a class="top__brand" :href="config.homeUrl">
      <span aria-hidden="true" class="top__logo"><LayoutGrid /></span>
      <span class="top__site" :title="config.siteName">{{ host }}</span>
    </a>

    <span aria-hidden="true" class="top__slash">/</span>
    <span class="top__app">Projekty</span>

    <span class="top__space" />

    <template v-if="config.canManage">
      <button class="btn btn--sm btn--outline" title="Nowa kategoria" type="button" @click="projects.editingCategory = 'new'">
        <FolderPlus /> <span class="top__label">Nowa kategoria</span>
      </button>

      <button class="btn btn--sm btn--accent" title="Nowy projekt" type="button" @click="projects.editing = 'new'">
        <Plus /> <span class="top__label">Nowy projekt</span>
      </button>
    </template>

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
  import { FolderPlus, LayoutGrid, LogIn, LogOut, Moon, Plus, Sun } from 'lucide-vue-next'
  import { useTheme } from '@/composables/theme'
  import { config } from '@/config'
  import { useProjectsStore } from '@/stores/projects'

  const projects = useProjectsStore()
  const { dark, toggleTheme } = useTheme()

  // the site's domain – its WordPress title can be a whole sentence
  const host = new URL(config.homeUrl, window.location.origin).host
</script>

<style scoped>
.top {
  position: sticky;
  z-index: 20;
  top: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 52px;
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

.top__slash {
  color: var(--text-3);
}

.top__app {
  color: var(--text-2);
  white-space: nowrap;
}

.top__space {
  flex: 1;
}

.top__avatar {
  width: 24px;
  height: 24px;
  margin-left: 4px;
  border-radius: 50%;
}

@media (max-width: 560px) {
  .top__label,
  .top__site {
    display: none;
  }
}
</style>
