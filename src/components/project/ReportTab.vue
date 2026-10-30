<template>
  <template v-if="project">
    <div class="report__head">
      <p class="muted report__state">
        <template v-if="project.reportedAt">
          Ostatni: <strong class="mono">{{ formatDateTime(project.reportedAt) }}</strong> <span class="faint">{{ ago(project.reportedAt) }}</span>
        </template>

        <template v-else>Strona jeszcze nic nie wysłała.</template>

        <!-- what sends it – and a newer plugin_meden / MK Core when there is one -->
        <template v-if="project.reporter">
          · <span class="mono">{{ project.reporter.replace(/^mk-core\b/, 'MK Core') }}</span>
          <span v-if="reporterNewer" class="reporter--old"> – najnowszy <span class="mono">{{ reporterNewer }}</span></span>
        </template>
      </p>

      <!-- the list asks the site for its report now, without waiting for the cron -->
      <button
        v-if="project.token"
        class="btn btn--sm btn--outline"
        :disabled="pulling"
        type="button"
        @click="pullReport"
      >
        <RefreshCw :class="{ spin: pulling }" /> {{ pulling ? 'Aktualizuję raport…' : 'Aktualizuj raport' }}
      </button>
    </div>

    <dl v-if="siteReport?.users || siteReport?.plugins" class="site">
      <template v-if="siteReport.users">
        <dt>Użytkownicy</dt>

        <dd>
          <strong class="mono">{{ siteReport.users.total }}</strong>
          <span v-if="siteReport.users.online !== null" class="site__online"><span class="dot" /> {{ siteReport.users.online }} online</span>
          <span v-for="role in siteReport.users.roles" :key="role.role" class="chip chip--soft">{{ role.name }} <span class="mono">{{ role.count }}</span></span>
        </dd>
      </template>

      <template v-if="siteReport.plugins">
        <dt>Wtyczki</dt>

        <dd>
          <strong class="mono">{{ siteReport.plugins.length }}</strong>
          <span class="faint">{{ activePlugins }} aktywnych</span>
          <span v-if="pluginUpdates.length > 0" class="chip chip--warn">{{ pluginUpdates.length }} do aktualizacji</span>
          <span v-else class="site__ok">aktualne</span>
        </dd>

        <dd class="site__plugins">
          <details :open="pluginUpdates.length > 0">
            <summary class="faint">Lista wtyczek</summary>

            <ul class="plugins">
              <li v-for="plugin in sortedPlugins" :key="plugin.file" class="plugin" :class="{ 'plugin--off': !plugin.active }">
                <span class="plugin__name">{{ plugin.name }} <ShieldAlert v-if="vulnerableSlugs.has(slugOf(plugin.file))" v-tip="'Znana podatność – szczegóły wyżej'" class="plugin__vuln" /></span>
                <span v-if="plugin.mu" class="faint">MU</span>
                <span v-else-if="!plugin.active" class="faint">nieaktywna</span>

                <span class="plugin__version mono">
                  {{ plugin.version }}<template v-if="plugin.update"> → <strong>{{ plugin.update }}</strong></template>
                </span>
              </li>
            </ul>
          </details>
        </dd>
      </template>
    </dl>

    <!-- the plugins' known vulnerabilities (WPVulnerability – Wordfence, WPScan, Patchstack, CVE), the link to each -->
    <div v-if="vulnerabilities.length > 0" class="vulns">
      <div class="vulns__head" :class="`vulns__head--${vulnerabilityTone(vulnerabilities)}`"><ShieldAlert /> Podatności wtyczek: {{ vulnerabilities.length }}</div>

      <ul class="plugins">
        <li v-for="item in vulnerabilities" :key="item.id" class="plugin vuln">
          <span class="plugin__name">
            {{ item.name }} <span class="mono faint">{{ item.version }}</span>
            <a class="vuln__title" :href="item.link" rel="noopener" target="_blank">{{ item.title }}</a>
          </span>

          <span class="vuln__fix">
            <span :class="`vuln-severity--${item.severity ?? 'm'}`">{{ item.severity ? SEVERITY_LABELS[item.severity] : 'ważność nieznana' }}</span>
            <template v-if="item.fixedIn"> · naprawia <span class="mono">{{ item.fixedIn }}</span></template>
            <template v-else-if="!item.closed"> · brak poprawki</template>
          </span>
        </li>
      </ul>
    </div>

    <!-- no translation for the site's language at all: WordPress, plugins, the theme (one made in-house left out) -->
    <div v-if="missing.length > 0" class="missing">
      <div class="missing__head">Brak tłumaczeń ({{ project.missingTranslations?.locale }}): {{ missing.length }}</div>

      <ul class="missing__list">
        <li v-for="item in missing" :key="`${item.type}-${item.slug}`">
          {{ item.name }} <span class="faint">{{ MISSING_TYPES[item.type] }}</span>
        </li>
      </ul>
    </div>

    <!-- composer update on production, composer.lock committed and pushed – the other environments pull it -->
    <div v-if="update" class="update">
      <div class="update__head">
        <button
          class="btn btn--sm btn--accent"
          :disabled="!update.available || updateRunning || busy || !scope"
          type="button"
          @click="startUpdate"
        >
          <component :is="updateRunning ? RefreshCw : ArrowUp" :class="{ spin: updateRunning }" /> {{ updateRunning ? 'Aktualizuję stronę…' : scope ? UPDATE_LABELS[scope] : 'Wszystko aktualne' }}
        </button>

        <span v-if="update.mode === 'wordpress'" class="faint">wtyczki, tłumaczenia i baza na produkcji (strona bez Bedrocka – jak „Aktualizuj” w panelu)</span>
        <span v-else class="faint">na produkcji <code>composer update</code>, baza, tłumaczenia i cache (jak <code>www_update</code>), commit i push – na innych środowiskach <code>git pull</code> i <code>composer install</code></span>
      </div>

      <p v-if="!update.available" class="update__note faint">{{ update.reason }}</p>
      <p v-else-if="update.state === 'done' && update.mode === 'wordpress'" class="update__note update__note--ok">Zaktualizowano {{ formatDateTime(update.finishedAt) }}.</p>
      <p v-else-if="update.state === 'done'" class="update__note update__note--ok">Zaktualizowano {{ formatDateTime(update.finishedAt) }} – zmiany są w repozytorium.</p>
      <p v-else-if="update.state === 'nothing' && update.mode === 'wordpress'" class="update__note faint">{{ formatDateTime(update.finishedAt) }}: wtyczki i tłumaczenia są aktualne.</p>
      <p v-else-if="update.state === 'nothing'" class="update__note faint">{{ formatDateTime(update.finishedAt) }}: Composer nie znalazł nowszych wersji w ramach wymagań z <code>composer.json</code> (np. <code>^4</code> nie weźmie 5.0, wtyczki z prywatnych repozytoriów trzeba najpierw podbić tam).</p>
      <p v-else-if="update.state === 'failed'" class="update__note update__note--failed">Aktualizacja się nie udała – szczegóły w logu.</p>

      <details v-if="update.log" :open="update.state === 'failed' || updateRunning">
        <summary class="faint">Log</summary>
        <pre class="update__log mono">{{ update.log }}</pre>
      </details>
    </div>

    <template v-if="project.token">
      <!-- Bedrock reads .env, a plain WordPress the constant in wp-config.php -->
      <div class="env-head">
        <p class="muted">
          Dodaj do pliku <code>{{ envFile }}</code> strony<template v-if="envTarget === 'wordpress'">, przed „That’s all, stop editing”</template>:
        </p>

        <div aria-label="Rodzaj instalacji" class="seg" role="radiogroup">
          <button
            v-for="option in ENV_TARGETS"
            :key="option.value"
            :aria-checked="envTarget === option.value"
            role="radio"
            type="button"
            @click="envTarget = option.value"
          >{{ option.label }}</button>
        </div>
      </div>

      <!-- the copy button sits in the block, top right, and shows on hover -->
      <div class="env">
        <pre class="env__lines mono">{{ envLines }}</pre>

        <button
          v-tip="'Kopiuj'"
          :aria-label="`Kopiuj linie do ${envFile}`"
          class="btn btn--icon btn--sm env__copy"
          type="button"
          @click="copyEnv"
        ><Copy /></button>
      </div>
    </template>

    <div class="report__actions">
      <button class="btn btn--sm btn--warn" :disabled="busy" type="button" @click="newToken">
        <KeyRound /> {{ project.token ? 'Nowy token' : 'Utwórz token' }}
      </button>

      <button
        v-if="project.token && !confirmToken"
        class="btn btn--sm btn--danger"
        :disabled="busy"
        type="button"
        @click="confirmToken = true"
      >
        <Trash2 /> Usuń token
      </button>
    </div>

    <!-- asked here, in the dialog – as deleting the project -->
    <div v-if="project.token && confirmToken" class="alert">
      <div>Usunąć token? Strona przestanie wysyłać raport – ostatni raport zostaje, a pola z raportu znów da się edytować.</div>

      <button class="btn btn--sm" type="button" @click="confirmToken = false">Anuluj</button>

      <button class="btn btn--danger-solid btn--sm" :disabled="busy" type="button" @click="deleteToken">
        <Trash2 /> Tak, usuń token
      </button>
    </div>
  </template>

  <p v-else class="faint">Token raportu pojawi się po utworzeniu projektu.</p>
</template>

<script lang="ts" setup>
  import type { Project, ReportPlugin, UpdateState } from '@/types'
  import { ArrowUp, Copy, KeyRound, RefreshCw, ShieldAlert, Trash2 } from 'lucide-vue-next'
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import { projectsApi } from '@/api/projects'
  import { fromProject, REPORTED_FIELDS, useProjectForm } from '@/components/project/form'
  import { config } from '@/config'
  import { vTip } from '@/directives/tip'
  import { useNotifyStore } from '@/stores/notify'
  import { useProjectsStore } from '@/stores/projects'
  import { ago, formatDateTime, missingTranslations, reporterUpdate, SEVERITY_LABELS, UPDATE_LABELS, updateScope, vulnerabilityTone } from '@/utils/projects'

  /** "Raport strony": what the site last sent, updating it, the report's settings and token */
  const { form, initial, project, busy, siteReport, loadReport } = useProjectForm()
  const projects = useProjectsStore()
  const notify = useNotifyStore()

  const confirmToken = ref(false)

  /** a newer plugin_meden / MK Core than the site runs */
  const reporterNewer = computed(() => project.value ? reporterUpdate(project.value, projects.latestReporters) : null)

  /** no translation for the site's language */
  const missing = computed(() => project.value ? missingTranslations(project.value) : [])
  const MISSING_TYPES = { core: 'WordPress', plugin: 'wtyczka', theme: 'motyw' }

  /** the plugins' known vulnerabilities – critical first */
  const SEVERITY_RANK = { c: 0, h: 1, m: 2, l: 3 }
  const vulnerabilities = computed(() => (project.value?.vulnerabilities ?? []).toSorted((a, b) => SEVERITY_RANK[a.severity ?? 'm'] - SEVERITY_RANK[b.severity ?? 'm']))
  const vulnerableSlugs = computed(() => new Set(vulnerabilities.value.map(item => item.slug)))
  /** a plugin's slug – its folder, as the scanner takes it */
  const slugOf = (file: string) => (file.includes('/') ? file.split('/', 1)[0] ?? '' : file.replace(/\.php$/, '')).toLowerCase()

  const activePlugins = computed(() => siteReport.value?.plugins?.filter(plugin => plugin.active).length ?? 0)
  const pluginUpdates = computed(() => siteReport.value?.plugins?.filter(plugin => plugin.update) ?? [])

  /** waiting for an update first, then the active ones, the inactive last – by name within each */
  const sortedPlugins = computed(() => {
    const rank = (plugin: ReportPlugin) => plugin.update ? 0 : (plugin.active ? 1 : 2)

    return (siteReport.value?.plugins ?? []).toSorted((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'pl'))
  })

  /** the site's update – Composer on Bedrock, the plugins through WP-CLI elsewhere; a project with a token; polled while it runs */
  const update = ref<UpdateState | null>(null)
  const updateRunning = computed(() => update.value?.state === 'running')
  let updateTimer: ReturnType<typeof setTimeout> | undefined

  async function loadUpdate (target: Project): Promise<void> {
    clearTimeout(updateTimer)
    update.value = null

    if (!target.token) {
      return
    }

    try {
      update.value = await projectsApi.updateState(target.id)
    } catch (error) {
      // an older plugin_meden, a site that doesn't answer – the reason instead of the button
      update.value = { available: false, reason: error instanceof Error ? error.message : String(error), state: 'idle', startedAt: null, finishedAt: null, log: '' }
    }

    followUpdate(target)
  }

  /** while it runs: ask again in 3 s; at the end the new report (the site sends it) comes with the list's refresh */
  function followUpdate (target: Project): void {
    if (update.value?.state === 'running' && project.value?.id === target.id) {
      updateTimer = setTimeout(async () => {
        const was = update.value?.state
        update.value = await projectsApi.updateState(target.id).catch(() => update.value)

        if (was === 'running' && update.value?.state !== 'running') {
          void projects.load()
          void loadReport(target)
        }

        followUpdate(target)
      }, 3000)
    }
  }

  /** all, the translations alone, or nothing to do – from the last report */
  const scope = computed(() => project.value ? updateScope(project.value, projects.latestWordpress) : null)

  async function startUpdate (): Promise<void> {
    const target = project.value

    if (!target) {
      return
    }

    try {
      update.value = await projectsApi.startUpdate(target.id, scope.value ?? 'all')
      followUpdate(target)
    } catch (error) {
      notify.error(error)
    }
  }

  onBeforeUnmount(() => clearTimeout(updateTimer))

  type EnvTarget = 'bedrock' | 'wordpress'

  const ENV_TARGETS: Array<{ value: EnvTarget, label: string }> = [
    { value: 'bedrock', label: 'Bedrock' },
    { value: 'wordpress', label: 'WordPress' },
  ]

  /** where the report's settings go – picked by the project's Bedrock flag when the dialog opens */
  const envTarget = ref<EnvTarget>('bedrock')
  const envFile = computed(() => envTarget.value === 'bedrock' ? '.env' : 'wp-config.php')

  // the path only – the report sends it to the list's site (kwiatkowski.co); without Bedrock the token alone, as a
  // constant (the path is the default one)
  const envLines = computed(() => {
    const token = project.value?.token ?? ''

    return envTarget.value === 'bedrock'
      ? `# Site report for the projects list\nPROJECTS_REPORT_URL=${config.reportUrl}\nPROJECTS_REPORT_TOKEN=${token}`
      : `// Site report for the projects list\ndefine('PROJECTS_REPORT_TOKEN', '${token}');`
  })

  async function copyEnv (): Promise<void> {
    try {
      await navigator.clipboard.writeText(envLines.value)
      notify.show(`Skopiowano – wklej do ${envFile.value} strony.`)
    } catch {
      notify.show('Nie udało się skopiować – zaznacz tekst ręcznie.', { tone: 'error' })
    }
  }

  async function newToken (): Promise<void> {
    if (!project.value || (project.value.token && !window.confirm('Nowy token – stary przestanie działać. Kontynuować?'))) {
      return
    }

    busy.value = true
    const updated = await projects.regenerateToken(project.value.id)
    busy.value = false

    if (updated) {
      // the dialog keeps the unsaved form, only the token part is new
      projects.editing = updated
      notify.show('Nowy token gotowy.')
    }
  }

  async function deleteToken (): Promise<void> {
    if (!project.value) {
      return
    }

    busy.value = true
    const updated = await projects.removeToken(project.value.id)
    busy.value = false
    confirmToken.value = false

    if (updated) {
      projects.editing = updated
      notify.show('Token usunięty.')
    }
  }

  // the store's – the mark in the table spins with it
  const pulling = computed(() => project.value !== undefined && project.value !== null && projects.pulling.has(project.value.id))

  async function pullReport (): Promise<void> {
    if (!project.value) {
      return
    }

    const id = project.value.id
    const result = await projects.pullReport(id)

    // closed meanwhile, or another project opened – the list has the report already, the dialog stays as it is
    if (!result || projects.editing === null || projects.editing === 'new' || projects.editing.id !== id) {
      return
    }

    // the fields the report fills take the fresh values; the rest of the form stays as typed
    const fresh = fromProject(result.project) as Record<string, unknown>
    const current = form.value as Record<string, unknown>
    const before = JSON.parse(initial.value || '{}') as Record<string, unknown>

    for (const field of REPORTED_FIELDS) {
      if (JSON.stringify(current[field]) === JSON.stringify(before[field])) {
        current[field] = before[field] = fresh[field]
      }
    }

    initial.value = JSON.stringify(before)
    projects.editing = result.project
    void loadReport(result.project)

    if (result.error) {
      notify.show(`Raport nie przyszedł: ${result.error}.`, { tone: 'error' })
    } else {
      notify.show('Raport pobrany.')
    }
  }

  // a different project: its update's state, the install it is (Bedrock or not), no question pending
  watch(() => project.value?.id, () => {
    confirmToken.value = false
    envTarget.value = project.value && !project.value.bedrock ? 'wordpress' : 'bedrock'

    if (project.value) {
      void loadUpdate(project.value)
    }
  }, { immediate: true })
</script>

<style scoped>
.report__head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px 12px;
}

.report__head .report__state {
  margin: 0;
}

.report__state strong {
  color: var(--text);
}

.env-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
}

.env-head p {
  margin: 0;
}

.env {
  position: relative;
}

.env__lines {
  margin: 0;
  padding: 10px 44px 10px 12px;
  overflow-x: auto;
  border-radius: var(--radius);
  background: var(--panel);
  font-size: 12px;
  white-space: pre;
}

/* the copy button – in the block's top right corner, when the pointer is over it (or the keyboard on the button) */
.env__copy {
  position: absolute;
  top: 6px;
  right: 6px;
  opacity: 0;
  transition: opacity .12s;
}

.env:hover .env__copy,
.env__copy:focus-visible {
  opacity: 1;
}

.report__actions {
  display: flex;
  gap: 6px;
}

/* users and plugins of the site's last report */
.site {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px 14px;
  margin: 0;
  font-size: 13px;
}

.site dt {
  color: var(--text-2);
}

.site dd {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin: 0;
}

/* the vulnerabilities: a red head, each with its title as a link; severity critical / high red, the rest orange */
.vulns {
  display: grid;
  gap: 6px;
}

.vulns__head {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--danger);
  font-size: 13px;
  font-weight: 600;
}

/* only medium or low ones – orange */
.vulns__head--warn {
  color: var(--warn);
}

.vulns__head svg,
.plugin__vuln {
  width: 15px;
  height: 15px;
}

.plugin__vuln {
  color: var(--danger);
  vertical-align: -2px;
}

.vuln {
  align-items: flex-start;
}

.vuln .plugin__name {
  white-space: normal;
}

.vuln__title {
  display: block;
  color: var(--text-2);
  font-size: 12px;
}

.vuln__title:hover {
  color: var(--text);
}

.vuln__fix {
  flex: none;
  font-size: 12px;
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

/* an older plugin_meden / MK Core */
.reporter--old {
  color: var(--warn);
  font-weight: 600;
}

/* no translation: an orange head, the names with what they are */
.missing {
  display: grid;
  gap: 6px;
  font-size: 13px;
}

.missing__head {
  color: var(--warn);
  font-weight: 600;
}

.missing__list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* the Composer update: the button, what came of it, the log */
.update {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.update__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  font-size: 12px;
}

.update__note {
  margin: 0;
  font-size: 13px;
}

.update__note--ok {
  color: var(--positive);
}

.update__note--failed {
  color: var(--danger);
}

.update__log {
  max-height: 240px;
  margin: 6px 0 0;
  padding: 8px 10px;
  overflow: auto;
  border-radius: var(--radius-sm);
  background: var(--panel);
  font-size: 12px;
  white-space: pre-wrap;
}

.spin {
  /* about its own middle, on its own layer – as the list's report mark */
  flex-shrink: 0;
  transform-origin: 50% 50%;
  will-change: transform;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.site__online,
.site__ok {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--positive);
}

.site__online .dot {
  width: 6px;
  height: 6px;
}

.site__plugins {
  grid-column: 1 / -1;
}

.site__plugins details {
  width: 100%;
}

.site__plugins summary {
  cursor: pointer;
}

.plugins {
  display: grid;
  max-height: 260px;
  margin: 6px 0 0;
  padding: 0;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  list-style: none;
}

.plugin {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--line);
}

.plugin:last-child {
  border-bottom: 0;
}

.plugin--off .plugin__name {
  color: var(--text-3);
}

.plugin__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plugin__version {
  flex: none;
  color: var(--text-2);
  font-size: 12px;
}

.plugin__version strong {
  color: var(--warn);
}
</style>
