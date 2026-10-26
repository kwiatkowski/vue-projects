<template>
  <div class="app">
    <AppTopbar />

    <main class="app__main">
      <RouterView />
    </main>

    <template v-if="config.canManage">
      <ProjectDialog />
      <CategoryDialog />
    </template>

    <ToastHost />
  </div>
</template>

<script lang="ts" setup>
  import { onBeforeUnmount, onMounted } from 'vue'
  import AppTopbar from '@/components/AppTopbar.vue'
  import CategoryDialog from '@/components/CategoryDialog.vue'
  import ProjectDialog from '@/components/ProjectDialog.vue'
  import ToastHost from '@/components/ui/ToastHost.vue'
  import { config } from '@/config'
  import { useProjectsStore } from '@/stores/projects'

  const projects = useProjectsStore()

  // the list refreshes itself every minute, quietly – only while the tab is visible, and at once when it comes back
  const REFRESH_MS = 60_000
  let lastRefresh = Date.now()
  let timer: ReturnType<typeof setInterval> | undefined

  function refresh (): void {
    if (document.hidden) {
      return
    }

    lastRefresh = Date.now()
    void projects.refresh()
  }

  function onVisible (): void {
    if (!document.hidden && Date.now() - lastRefresh >= REFRESH_MS) {
      refresh()
    }
  }

  onMounted(() => {
    void projects.load()
    timer = setInterval(refresh, REFRESH_MS)
    document.addEventListener('visibilitychange', onVisible)
  })

  onBeforeUnmount(() => {
    clearInterval(timer)
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
