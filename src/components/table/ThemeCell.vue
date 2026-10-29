<template>
  <!-- the name and its version together – one bigger area for the tooltip -->
  <HoverTip v-if="project.themeDetails?.version || rows.length > 0" anchor-class="theme-hit">
    <span class="theme-hit__body" tabindex="0">
      <span class="has-tip">{{ project.theme }}</span>
      <Check v-if="own" aria-label="Motyw zrobiony u nas" class="own-theme" />
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

  <template v-else>
    {{ project.theme }}
    <Check v-if="own" v-tip="'Motyw zrobiony u nas'" aria-label="Motyw zrobiony u nas" class="own-theme" />
  </template>
</template>

<script lang="ts" setup>
  import type { Project } from '@/types'
  import { Check } from 'lucide-vue-next'
  import { computed } from 'vue'
  import HoverTip from '@/components/ui/HoverTip.vue'
  import { vTip } from '@/directives/tip'
  import { ownTheme } from '@/utils/projects'

  /** The "Motyw" cell: the theme (a tick when made in-house), its version under it; author and parent in the tooltip. */
  const props = defineProps<{ project: Project }>()

  /** the theme or its parent by meden.com.pl / kwiatkowski.co (Author URI) */
  const own = computed(() => ownTheme(props.project))

  /** the tooltip under its header (name, version): author, parent theme and its author */
  const rows = computed(() => {
    const details = props.project.themeDetails
    const parent = props.project.parentTheme
      ? [props.project.parentTheme, details?.parentVersion].filter(Boolean).join(' ')
      : null

    return [
      { label: 'Autor', value: details?.author },
      { label: 'Strona autora', value: details?.authorUri },
      { label: 'Motyw nadrzędny', value: parent },
      { label: 'Autor nadrzędnego', value: parent ? details?.parentAuthor : null },
      { label: 'Strona autora nadrzędnego', value: parent ? details?.parentAuthorUri : null },
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

/* made in-house – the positive green, as the checkmarks in the table */
.own-theme {
  width: 13px;
  height: 13px;
  margin-left: 4px;
  color: var(--positive);
  stroke-width: 2.5;
  vertical-align: -1px;
}

/* the theme with more in its tooltip (version, author, parent) */
.has-tip {
  cursor: default;
  text-decoration: underline dotted var(--text-3);
  text-underline-offset: 3px;
}
</style>
