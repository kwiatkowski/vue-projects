<template>
  <!-- one popup for the mark: what the report says and, for a site that reports, what to do – it can be entered -->
  <HoverTip anchor-class="report-hit" :interactive="full && Boolean(project.token)">
    <span
      :aria-label="reportTitle(project)"
      class="report"
      :class="`report--${reportMark(project)}`"
      role="img"
      tabindex="0"
    >
      <RefreshCw v-if="reportMark(project) === 'running'" />
      <TriangleAlert v-else-if="reportMark(project) === 'failed'" />
      <template v-else-if="reportMark(project) === 'vulnerable'"><ShieldAlert /><span class="mono">{{ project.vulnerabilities?.length }}</span></template>

      <template v-else-if="reportMark(project) === 'todo'">
        <template v-if="updateCount(project) > 0"><ArrowUp /><span class="mono">{{ updateCount(project) }}</span></template>
        <Lock v-else />
      </template>

      <Check v-else-if="reportMark(project) === 'ok'" />
      <Minus v-else />
    </span>

    <template #tip="{ hide }">
      <ReportSummary :menu="full && Boolean(project.token)" :project="project" :title="reportTitle(project)" />

      <div v-if="full && project.token" class="report-actions">
        <!-- everything (plugins, translations, the database; on Bedrock through Composer, committed and pushed),
               or the translations alone – only when something waits -->
        <button
          v-if="scopeOf(project)"
          class="menu__item"
          :disabled="projects.updating.has(project.id)"
          type="button"
          @click="projects.runUpdate(project.id, scopeOf(project) ?? 'all')"
        >
          <ArrowUp /> {{ projects.updating.has(project.id) ? 'Aktualizuję stronę…' : UPDATE_LABELS[scopeOf(project) ?? 'all'] }}
        </button>

        <!-- the site sends its report now – as "Aktualizuj raport" in the project's dialog -->
        <button class="menu__item" :disabled="pulling.has(project.id)" type="button" @click="pullReport(project.id)">
          <RefreshCw :class="{ spin: pulling.has(project.id) }" />
          {{ pulling.has(project.id) ? 'Aktualizuję raport…' : 'Aktualizuj raport' }}
        </button>

        <button class="menu__item" type="button" @click="hide(); emit('open', project)">
          <FileText /> Szczegóły raportu
        </button>
      </div>
    </template>
  </HoverTip>
</template>

<script lang="ts" setup>
  import type { Project } from '@/types'
  import { ArrowUp, Check, FileText, Lock, Minus, RefreshCw, ShieldAlert, TriangleAlert } from 'lucide-vue-next'
  import { ref } from 'vue'
  import ReportSummary from '@/components/ReportSummary.vue'
  import HoverTip from '@/components/ui/HoverTip.vue'
  import { useNotifyStore } from '@/stores/notify'
  import { useProjectsStore } from '@/stores/projects'
  import { formatDateTime, pendingUpdates, reportState, sslState, UPDATE_LABELS, updateScope } from '@/utils/projects'

  /** The "Raport" cell: the report's mark, and its popup – what the report says and, for the owner, what to do. */
  defineProps<{ project: Project, full: boolean }>()
  const emit = defineEmits<{ open: [Project] }>()

  const projects = useProjectsStore()
  const notify = useNotifyStore()

  /** the report mark's tooltip – when the site last reported, or why it doesn't */
  function reportTitle (project: Project): string {
    const last = formatDateTime(project.reportedAt)

    switch (reportState(project)) {
      case 'ok': {
        return `Raport: ${last}`
      }
      case 'failed': {
        return last ? `Brak nowego raportu – ostatni: ${last}` : 'Raport skonfigurowany, ale strona jeszcze nic nie wysłała'
      }
      default: {
        return 'Raport nieskonfigurowany'
      }
    }
  }

  const scopeOf = (project: Project) => updateScope(project, projects.latestWordpress)

  /** sites whose report is being fetched from the report's popup */
  const pulling = ref<Set<number>>(new Set())

  async function pullReport (id: number): Promise<void> {
    pulling.value = new Set(pulling.value).add(id)
    const result = await projects.pullReport(id)
    const next = new Set(pulling.value)
    next.delete(id)
    pulling.value = next

    if (!result) {
      return
    }

    if (result.error) {
      notify.show(`Raport nie przyszedł: ${result.error}.`, { tone: 'error' })
    } else {
      notify.show('Raport pobrany.')
    }
  }

  /** WordPress, plugins and translations waiting – the number next to the report's arrow */
  function updateCount (project: Project) {
    return pendingUpdates(project, projects.latestWordpress).length + (project.translationUpdates?.length ?? 0)
  }

  /** the report's mark: a tick when the site reports, an orange arrow (or lock) when it has something to update */
  function reportMark (project: Project): string {
    if (projects.updating.has(project.id)) {
      return 'running'
    }

    const state = reportState(project)

    // a certificate that is not fine – red; one that runs out soon – orange, as something to do
    if (state !== 'off' && sslState(project) === 'bad') {
      return 'failed'
    }

    // a plugin with a known vulnerability – red, with how many
    if (state !== 'off' && (project.vulnerabilities?.length ?? 0) > 0) {
      return 'vulnerable'
    }

    return state === 'ok' && (scopeOf(project) || sslState(project) === 'soon') ? 'todo' : state
  }

</script>

<style scoped>
/* the site's report as an icon – not a dot, that is the status's: a green tick – it reports; an orange arrow with the
   number of updates (a lock – only the certificate runs out soon); a red warning – no report or a bad certificate;
   a red shield with a number – plugins with known vulnerabilities; a grey dash – not set up. No pulse. The date and time in the tooltip. */
.report {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  font-size: 12px;
  font-weight: 600;
  vertical-align: middle;
}

.report svg {
  width: 16px;
  height: 16px;
  stroke-width: 2.5;
}

.report--ok {
  color: var(--positive);
}

.report--todo {
  color: var(--warn);
}

.report--failed,
.report--vulnerable {
  color: var(--danger);
}

.report--off {
  color: var(--text-3);
}

/* updating itself – the refresh icon spinning, in the info colour */
.report--running {
  color: var(--info);
}

.report--running svg,
.report-actions .spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .report--running svg,
  .report-actions .spin {
    animation: none;
  }
}

/* the actions under the summary: a line, room around them */
.report-actions {
  display: grid;
  gap: 2px;
  margin: 8px -6px -3px;
  padding-top: 6px;
  border-top: 1px solid var(--line-strong);
}

.report-actions .menu__item {
  height: 34px;
  color: var(--text);
}

.report-actions .menu__item:hover {
  background: color-mix(in srgb, var(--tip-bg) 85%, var(--text));
}
</style>
