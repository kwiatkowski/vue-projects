<template>
  <div class="app">
    <AppTopbar />

    <main class="app__main">
      <RouterView />
    </main>

    <template v-if="config.canManage">
      <ProjectDialog />
      <CategoryDialog />
      <HostDialog />
      <HostsDialog />
      <SettingsDialog />
      <AlertsDialog />
      <ChangelogDialog />
    </template>

    <ViewDialog />

    <ToastHost />

    <!-- v-tip's tooltip, one for the whole app -->
    <TipLayer />
  </div>
</template>

<script lang="ts" setup>
  import { onBeforeUnmount, onMounted } from 'vue'
  import AlertsDialog from '@/components/AlertsDialog.vue'
  import AppTopbar from '@/components/AppTopbar.vue'
  import CategoryDialog from '@/components/CategoryDialog.vue'
  import ChangelogDialog from '@/components/ChangelogDialog.vue'
  import HostDialog from '@/components/HostDialog.vue'
  import HostsDialog from '@/components/HostsDialog.vue'
  import ProjectDialog from '@/components/ProjectDialog.vue'
  import SettingsDialog from '@/components/SettingsDialog.vue'
  import TipLayer from '@/components/ui/TipLayer.vue'
  import ToastHost from '@/components/ui/ToastHost.vue'
  import ViewDialog from '@/components/ViewDialog.vue'
  import { useTabBadge } from '@/composables/tabBadge'
  import { config } from '@/config'
  import { useHostsStore } from '@/stores/hosts'
  import { useProjectsStore } from '@/stores/projects'
  import { updateScope } from '@/utils/projects'

  const projects = useProjectsStore()

  // the tab: how many sites are down – a red number on the favicon, "(1) Projekty" in the title; none down – how many
  // have something to update (WordPress, plugins, translations), in orange
  useTabBadge(() => {
    const down = projects.items.filter(project => project.status === 'offline').length

    return down > 0
      ? { count: down, tone: 'down' }
      : { count: projects.items.filter(project => updateScope(project, projects.latestWordpress) !== null).length, tone: 'updates' }
  })

  // quietly, only while the tab is visible: every few seconds a tiny check whether the list changed on the server (a
  // site's report, an edit elsewhere) – then it refreshes at once; every minute the whole list anyway (Todo's tasks
  // don't move the server's marker); and both when the tab comes back
  const CHECK_MS = 3000
  const REFRESH_MS = 60_000
  let lastRefresh = Date.now()
  let checkTimer: ReturnType<typeof setInterval> | undefined
  let refreshTimer: ReturnType<typeof setInterval> | undefined

  function check (): void {
    if (!document.hidden) {
      void projects.checkChanged()
    }
  }

  function refresh (): void {
    if (document.hidden) {
      return
    }

    lastRefresh = Date.now()
    void projects.refresh()
  }

  function onVisible (): void {
    if (document.hidden) {
      return
    }

    if (Date.now() - lastRefresh >= REFRESH_MS) {
      refresh()
    } else {
      check()
    }
  }

  onMounted(() => {
    void projects.load()

    // the hosting accounts – the owner's only
    if (config.canManage) {
      void useHostsStore().load()
    }
    checkTimer = setInterval(check, CHECK_MS)
    refreshTimer = setInterval(refresh, REFRESH_MS)
    document.addEventListener('visibilitychange', onVisible)
  })

  onBeforeUnmount(() => {
    clearInterval(checkTimer)
    clearInterval(refreshTimer)
    document.removeEventListener('visibilitychange', onVisible)
  })
</script>

<style>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.app__main {
  flex: 1;
  width: 100%;
}
</style>
