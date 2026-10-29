<template>
  <!-- the name as in Server and Theme, the version centred under it: green – the newest, orange with an arrow – a newer
       one is out -->
  <span class="engine">
    <span v-if="project.engine">{{ project.engine }}</span>

    <span
      v-if="project.version"
      v-tip="versionTitle"
      class="cell-sub mono"
      :class="{ latest: isLatest, outdated: isOutdated }"
    >{{ project.version }}<ArrowUp v-if="isOutdated" /></span>
  </span>
</template>

<script lang="ts" setup>
  import type { Project } from '@/types'
  import { ArrowUp } from 'lucide-vue-next'
  import { computed } from 'vue'
  import { vTip } from '@/directives/tip'
  import { useProjectsStore } from '@/stores/projects'
  import { latestWordpress, outdatedWordpress } from '@/utils/projects'

  /** The "Silnik" cell: the engine, its version under it – the newest WordPress or a newer one out. */
  const props = defineProps<{ project: Project }>()
  const projects = useProjectsStore()

  const isLatest = computed(() => latestWordpress(props.project, projects.latestWordpress))
  const isOutdated = computed(() => outdatedWordpress(props.project, projects.latestWordpress))

  /** the newest WordPress, or the one waiting */
  const versionTitle = computed(() => {
    if (isLatest.value) {
      return `Najnowszy WordPress (${projects.latestWordpress})`
    }

    return isOutdated.value ? `Dostępny WordPress ${projects.latestWordpress}` : undefined
  })
</script>

<style scoped>
/* the engine's name with its version centred under it */
.engine {
  display: inline-block;
  text-align: center;
}

.engine svg {
  width: 12px;
  height: 12px;
  margin-left: 1px;
  stroke-width: 2.5;
  vertical-align: -1px;
}
</style>
