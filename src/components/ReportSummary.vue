<template>
  <!-- a header: when (or why not), and what sent it on the right -->
  <div class="report-tip__title" :class="{ 'report-tip__title--alone': plugins.length === 0 && !translations && !menu }">
    <strong>{{ title }}</strong>
    <span v-if="project.reporter" class="mono faint">{{ reporterLabel(project.reporter) }}</span>
  </div>

  <!-- what's waiting on the site: WordPress and the plugins, installed → available -->
  <template v-if="plugins.length > 0">
    <div class="info-tip__head info-tip__head--todo">Do aktualizacji wtyczki: {{ plugins.length }}</div>

    <dl class="info-tip info-tip--right">
      <template v-for="item in plugins" :key="item.name">
        <dt>{{ item.name }}</dt>
        <dd class="mono">{{ item.version }} → <span class="info-tip__new">{{ item.update }}</span></dd>
      </template>
    </dl>
  </template>

  <div v-if="translations" class="info-tip__head info-tip__head--todo report-tip__row">
    <span>Do aktualizacji tłumaczenia:</span>
    <span class="mono">{{ translations }}</span>
  </div>

  <div v-if="menu && plugins.length === 0 && !translations" class="info-tip__head info-tip__head--ok">Wszystko aktualne</div>
</template>

<script lang="ts" setup>
  import type { Project } from '@/types'
  import { computed } from 'vue'
  import { config } from '@/config'
  import { pendingUpdates } from '@/utils/projects'

  /**
   * What the report's dot says – the same in its tooltip and in its menu: when the site reported and what sent it, the
   * plugins (and WordPress) and the translations waiting for an update. `menu` – says "all up to date" too.
   */
  const props = defineProps<{ project: Project, title: string, menu?: boolean }>()

  const plugins = computed(() => pendingUpdates(props.project, config.latestWordpress))
  const translations = computed(() => props.project.translationUpdates?.length ?? 0)

  /** "mk-core 2026.10.27" → "MK Core 2026.10.27"; plugin_meden as it is */
  const reporterLabel = (reporter: string) => reporter.replace(/^mk-core\b/, 'MK Core')
</script>
