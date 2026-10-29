<template>
  <!-- the name and its version together – one bigger area for the tooltip -->
  <HoverTip v-if="project.themeDetails?.version || rows.length > 0" anchor-class="theme-hit">
    <span class="theme-hit__body" tabindex="0">
      <span class="has-tip">{{ project.theme }}</span>
      <span v-if="project.themeDetails?.version" class="cell-sub mono">{{ project.themeDetails.version }}</span>
    </span>

    <!-- as the report's: a header – the name, its version on the right – then the rest, values on the right -->
    <template #tip>
      <div class="report-tip__title" :class="{ 'report-tip__title--alone': rows.length === 0 }">
        <strong>{{ project.theme }}</strong>
        <span v-if="project.themeDetails?.version" class="mono faint">{{ project.themeDetails.version }}</span>
      </div>

      <dl v-if="rows.length > 0" class="info-tip info-tip--right info-tip--after">
        <template v-for="row in rows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        </template>
      </dl>
    </template>
  </HoverTip>

  <template v-else>{{ project.theme }}</template>
</template>

<script lang="ts" setup>
  import type { Project } from '@/types'
  import { computed } from 'vue'
  import HoverTip from '@/components/ui/HoverTip.vue'

  /** The "Motyw" cell: the theme, its version under it; author and parent theme in the tooltip. */
  const props = defineProps<{ project: Project }>()

  /** the tooltip under its header (name, version): author, parent theme and its author */
  const rows = computed(() => {
    const details = props.project.themeDetails
    const parent = props.project.parentTheme
      ? [props.project.parentTheme, details?.parentVersion].filter(Boolean).join(' ')
      : null

    return [
      { label: 'Autor', value: details?.author },
      { label: 'Motyw nadrzędny', value: parent },
      { label: 'Autor nadrzędnego', value: parent ? details?.parentAuthor : null },
    ].filter((row): row is { label: string, value: string } => Boolean(row.value))
  })
</script>

<style scoped>
.theme-hit__body {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  outline: none;
}

/* the theme with more in its tooltip (version, author, parent) */
.has-tip {
  cursor: default;
  text-decoration: underline dotted var(--text-3);
  text-underline-offset: 3px;
}
</style>
