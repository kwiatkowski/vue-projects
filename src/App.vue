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
  import { onMounted } from 'vue'
  import AppTopbar from '@/components/AppTopbar.vue'
  import CategoryDialog from '@/components/CategoryDialog.vue'
  import ProjectDialog from '@/components/ProjectDialog.vue'
  import ToastHost from '@/components/ui/ToastHost.vue'
  import { config } from '@/config'
  import { useProjectsStore } from '@/stores/projects'

  const projects = useProjectsStore()

  onMounted(() => {
    void projects.load()
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
