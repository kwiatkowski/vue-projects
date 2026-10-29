<template>
  <!-- a header: when (or why not), and what sent it on the right -->
  <div class="report-tip__title" :class="{ 'report-tip__title--alone': plugins.length === 0 && !translations && !menu && !project.ssl && vulnerabilities.length === 0 && missing.length === 0 }">
    <strong>{{ title }}</strong>
    <span v-if="project.reporter" class="mono faint">{{ reporterLabel(project.reporter) }}</span>
  </div>

  <!-- the certificate: until when and who issued it; a warning colour when it runs out soon, red when it is not fine -->
  <div v-if="project.ssl" class="report-tip__row report-tip__ssl" :class="`report-tip__ssl--${ssl}`">
    <span>Certyfikat SSL</span>

    <span v-if="ssl === 'bad'">{{ project.ssl.error }}<template v-if="project.ssl.validTo"> · <span class="mono">{{ formatDay(project.ssl.validTo) }}</span></template></span>

    <span v-else>
      do <span class="mono">{{ formatDay(project.ssl.validTo) }}</span>{{ ' ' }}<span class="faint">({{ daysLeft }} dni<template v-if="project.ssl.issuer">, {{ project.ssl.issuer }}</template>)</span>
    </span>
  </div>

  <!-- the plugins' known vulnerabilities: the plugin, its version, what fixes it -->
  <template v-if="vulnerabilities.length > 0">
    <div class="info-tip__head" :class="`info-tip__head--${vulnerabilityTone(vulnerabilities)}`">Podatności: {{ vulnerabilities.length }}</div>

    <dl class="info-tip info-tip--right">
      <template v-for="item in vulnerabilities" :key="item.id">
        <dt>{{ item.name }} <span class="mono faint">{{ item.version }}</span></dt>

        <dd>
          <span class="vuln-severity" :class="`vuln-severity--${item.severity ?? 'm'}`">{{ item.severity ? SEVERITY_LABELS[item.severity] : 'ważność nieznana' }}</span>
          <template v-if="item.closed"> · zamknięta</template>
          <template v-else-if="item.fixedIn"> · naprawia <span class="mono">{{ item.fixedIn }}</span></template>
        </dd>
      </template>
    </dl>
  </template>

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

  <!-- no translation for the site's language at all – WordPress, plugins, the theme -->
  <template v-if="missing.length > 0">
    <div class="info-tip__head info-tip__head--todo">Brak tłumaczeń ({{ project.missingTranslations?.locale }}): {{ missing.length }}</div>
    <div class="missing">{{ missing.map(item => item.name).join(', ') }}</div>
  </template>

  <div v-if="menu && plugins.length === 0 && !translations" class="info-tip__head info-tip__head--ok">Wszystko aktualne</div>
</template>

<script lang="ts" setup>
  import type { Project } from '@/types'
  import { computed } from 'vue'
  import { useProjectsStore } from '@/stores/projects'
  import { formatDay, missingTranslations, pendingUpdates, SEVERITY_LABELS, sslDaysLeft, sslState, vulnerabilityTone } from '@/utils/projects'

  /**
   * What the report's mark says – the same in its tooltip and in its menu: when the site reported and what sent it, the
   * site's certificate, the plugins (and WordPress) and the translations waiting for an update. `menu` – says "all up to
   * date" too.
   */
  const props = defineProps<{ project: Project, title: string, menu?: boolean }>()

  const projects = useProjectsStore()

  const plugins = computed(() => pendingUpdates(props.project, projects.latestWordpress))
  const translations = computed(() => props.project.translationUpdates?.length ?? 0)
  const vulnerabilities = computed(() => props.project.vulnerabilities ?? [])
  const missing = computed(() => missingTranslations(props.project))
  const ssl = computed(() => sslState(props.project))
  const daysLeft = computed(() => sslDaysLeft(props.project))

  /** "mk-core 2026.10.27" → "MK Core 2026.10.27"; plugin_meden as it is */
  const reporterLabel = (reporter: string) => reporter.replace(/^mk-core\b/, 'MK Core')
</script>

<style scoped>
/* what has no translation – the names in one wrapped line */
.missing {
  max-width: 320px;
  color: var(--text-2);
  white-space: normal;
}

/* the vulnerabilities: red with a high or critical one, else orange; their severity – the same */
.info-tip__head--bad,
.info-tip__head--warn {
  margin: 8px 0 4px;
  color: var(--danger);
}

.info-tip__head--warn {
  color: var(--warn);
}

.vuln-severity--c,
.vuln-severity--h {
  color: var(--danger);
  font-weight: 600;
}

.vuln-severity--m,
.vuln-severity--l {
  color: var(--warn);
}

/* the certificate's line under the header */
.report-tip__ssl {
  margin-top: 6px;
}

.report-tip__ssl--soon {
  color: var(--warn);
}

.report-tip__ssl--bad {
  color: var(--danger);
}
</style>
