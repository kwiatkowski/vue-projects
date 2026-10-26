<template>
  <BaseDialog
    v-model="open"
    :can-close="canClose"
    :title="project ? 'Projekt' : 'Nowy projekt'"
    :width="640"
    @submit="save"
  >
    <input
      ref="nameInput"
      v-model.trim="form.name"
      :aria-invalid="nameError ? 'true' : undefined"
      aria-label="Nazwa"
      class="input input--title"
      placeholder="Nazwa projektu"
      type="text"
    >

    <span v-if="nameError" class="error-text">{{ nameError }}</span>

    <div class="field">
      <span>Domeny <span class="faint">– pierwsza jest główna (link na liście)</span></span>

      <div class="domains">
        <div v-for="(_, index) in form.domains" :key="index" class="domains__row">
          <input
            v-model.trim="form.domains[index]"
            :aria-label="`Domena ${index + 1}`"
            class="input"
            placeholder="przyklad.pl"
            type="text"
            @blur="onDomainBlur(index)"
          >

          <button
            v-if="form.domains.length > 1"
            aria-label="Usuń domenę"
            class="btn btn--icon btn--sm"
            title="Usuń domenę"
            type="button"
            @click="form.domains.splice(index, 1)"
          ><X /></button>
        </div>

        <button class="btn btn--sm domains__add" type="button" @click="addDomain">
          <Plus /> Dodaj domenę
        </button>
      </div>
    </div>

    <div class="grid">

      <label class="field">
        <span>Status</span>

        <select v-model="form.status" class="input">
          <option :value="null">—</option>
          <option v-for="(label, value) in STATUS_LABELS" :key="value" :value="value">{{ label }}</option>
        </select>
      </label>

      <label class="field">
        <span>Kategoria</span>

        <select v-model="form.categoryId" class="input">
          <option :value="null">— bez kategorii —</option>
          <option v-for="category in projects.sortedCategories" :key="category.id" :value="category.id">{{ category.name }}</option>
        </select>
      </label>
    </div>

    <fieldset class="group">
      <legend class="eyebrow">Serwer</legend>

      <div class="grid grid--3">
        <label class="field">
          <span>Hosting</span>
          <input v-model.trim="form.server" class="input" placeholder="hostido.pl" type="text">
        </label>

        <label class="field">
          <span>Link (panel)</span>
          <input v-model.trim="form.serverUrl" class="input" placeholder="https://…" type="url">
        </label>

        <label class="field">
          <span>Konto</span>
          <input v-model.trim="form.serverAccount" class="input mono" type="text">
        </label>
      </div>
    </fieldset>

    <fieldset class="group">
      <legend class="eyebrow">Technologia <span class="group__hint">– uzupełnia też raport strony</span></legend>

      <div class="grid grid--4">
        <label class="field">
          <span>Silnik</span>
          <input v-model.trim="form.engine" class="input" list="engines" type="text">
        </label>

        <label class="field">
          <span>Wersja</span>
          <input v-model.trim="form.version" class="input mono" type="text">
        </label>

        <label class="field">
          <span>PHP</span>
          <input v-model.trim="form.php" class="input mono" type="text">
        </label>

        <label class="field">
          <span>Motyw</span>
          <input v-model.trim="form.theme" class="input" type="text">
        </label>
      </div>

      <datalist id="engines">
        <option value="wordpress" />
        <option value="vue" />
        <option value="static" />
      </datalist>
    </fieldset>

    <fieldset class="group">
      <legend class="eyebrow">Kod</legend>

      <div class="grid grid--3">
        <label class="field">
          <span>Repozytorium</span>
          <input v-model.trim="form.repo" class="input" placeholder="https://github.com/…" type="url">
        </label>

        <label class="field">
          <span>Wersja lokalna</span>
          <input v-model.trim="form.localUrl" class="input" placeholder="https://….local/" type="url">
        </label>

        <label class="field">
          <span>DB sync</span>
          <input v-model="form.dbSync" class="input" type="date">
        </label>
      </div>

      <div class="checks">
        <label v-for="flag in FLAGS" :key="flag" class="check">
          <input v-model="form[flag]" type="checkbox"> {{ FLAG_LABELS[flag] }}
        </label>
      </div>
    </fieldset>

    <fieldset class="group">
      <legend class="eyebrow">Widoczność</legend>

      <div class="checks">
        <label class="check">
          <input v-model="form.listed" type="checkbox"> Na publicznej liście <span class="faint">(z domeną)</span>
        </label>

      </div>
    </fieldset>

    <fieldset class="group">
      <legend class="eyebrow">Todo</legend>

      <label class="field">
        <span>Powiązany projekt w Todo – jego otwarte zadania widać na liście</span>

        <select v-model="form.todoProject" class="input">
          <option :value="null">— brak —</option>
          <option v-for="todo in projects.todoProjects" :key="todo.id" :value="todo.id">{{ todo.name }}</option>
        </select>
      </label>

      <p v-if="form.todoProject && form.todoProject !== project?.todoProject" class="faint">Zadania pokażą się po zapisaniu.</p>

      <template v-else-if="project?.todo">
        <p v-if="tasksLoading" class="faint">Wczytuję zadania…</p>
        <p v-else-if="tasks.length === 0" class="faint">Brak otwartych zadań.</p>

        <ul v-else class="tasks">
          <li v-for="task in tasks" :key="task.id" class="task" :class="`p-${task.priority}`">
            <span class="task__check" :class="{ 'task__check--doing': task.status === 'doing' }" />
            <span class="task__title">{{ task.title }}</span>

            <span v-if="task.due" class="task__due mono" :class="{ 'task__due--late': task.due < today }">
              {{ formatDay(task.due) }}<template v-if="task.time"> {{ task.time }}</template>
            </span>
          </li>
        </ul>

        <a class="btn btn--sm btn--outline tasks__open" :href="project.todo.url" target="_blank">
          <ListChecks /> Otwórz w Todo
        </a>
      </template>
    </fieldset>

    <label class="field">
      <span>Notatki</span>
      <textarea v-model="form.notes" class="input" rows="3" />
    </label>

    <fieldset v-if="project" class="group report">
      <legend class="eyebrow">Raport strony</legend>

      <p class="muted report__state">
        <template v-if="project.reportedAt">
          Ostatni: <strong class="mono">{{ formatDateTime(project.reportedAt) }}</strong> <span class="faint">{{ ago(project.reportedAt) }}</span>
        </template>

        <template v-else>Strona jeszcze nic nie wysłała.</template>
      </p>

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
                  <span class="plugin__name">{{ plugin.name }}</span>
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

      <template v-if="project.token">
        <p class="muted">W <code>.env</code> strony (moduł <code>report</code> MK Core):</p>
        <pre class="env mono">{{ envLines }}</pre>
      </template>

      <div class="report__actions">
        <button v-if="project.token" class="btn btn--sm btn--outline" type="button" @click="copyEnv">
          <Copy /> Kopiuj
        </button>

        <button class="btn btn--sm" :disabled="busy" type="button" @click="newToken">
          <KeyRound /> {{ project.token ? 'Nowy token' : 'Utwórz token' }}
        </button>
      </div>
    </fieldset>

    <div v-if="confirmDelete" class="alert">
      <div>Usunąć „{{ project?.name }}”? Trafi do kosza WordPressa (projekt w Todo zostaje bez zmian).</div>
    </div>

    <template #actions>
      <template v-if="project">
        <button v-if="!confirmDelete" class="btn btn--danger btn--sm" type="button" @click="confirmDelete = true">Usuń</button>

        <button
          v-else
          class="btn btn--danger-solid btn--sm"
          :disabled="busy"
          type="button"
          @click="remove"
        >Tak, usuń</button>
      </template>

      <span style="flex: 1" />
      <button class="btn btn--sm" type="button" @click="open = false">Anuluj</button>
      <button class="btn btn--primary btn--sm" :disabled="busy" type="submit">{{ project ? 'Zapisz' : 'Utwórz' }}</button>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
  import type { Flag, Project, ProjectInput, ReportPlugin, SiteReport, Status, TodoTask } from '@/types'
  import { Copy, KeyRound, ListChecks, Plus, X } from 'lucide-vue-next'
  import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
  import { projectsApi } from '@/api/projects'
  import BaseDialog from '@/components/ui/BaseDialog.vue'
  import { config } from '@/config'
  import { useNotifyStore } from '@/stores/notify'
  import { useProjectsStore } from '@/stores/projects'
  import { FLAGS } from '@/types'
  import { ago, bareDomain, formatDateTime, formatDay, STATUS_LABELS } from '@/utils/projects'

  const projects = useProjectsStore()
  const notify = useNotifyStore()

  const FLAG_LABELS: Record<Flag, string> = {
    deploy: 'Deploy (skrypty)',
    dev: 'DEV (stage)',
    bedrock: 'Bedrock',
    security: 'Wordfence',
    acf: 'ACF',
    miModal: 'MI Modal',
  }

  type Form = Required<Omit<ProjectInput, 'status'>> & { status: Status | null }

  const TEXT_FIELDS = ['server', 'serverUrl', 'serverAccount', 'php', 'engine', 'version', 'theme', 'repo', 'localUrl', 'dbSync', 'notes'] as const

  function blank (): Form {
    return {
      name: '',
      domains: [''],
      status: null,
      categoryId: null,
      todoProject: null,
      listed: true,
      ...Object.fromEntries(TEXT_FIELDS.map(field => [field, ''])),
      ...Object.fromEntries(FLAGS.map(flag => [flag, false])),
    } as Form
  }

  function fromProject (project: Project): Form {
    const form = blank()

    for (const key of Object.keys(form) as Array<keyof Form>) {
      const value = project[key as keyof Project]
      ;(form as Record<string, unknown>)[key] = value ?? (typeof form[key] === 'string' ? '' : form[key])
    }

    form.domains = project.domains.length > 0 ? [...project.domains] : ['']

    return form
  }

  const open = computed({
    get: () => projects.editing !== null,
    set: value => {
      if (!value) {
        projects.editing = null
      }
    },
  })

  const project = computed(() => projects.editing === 'new' || projects.editing === null ? null : projects.editing)

  const form = ref<Form>(blank())
  const initial = ref('')
  const nameError = ref('')
  const confirmDelete = ref(false)
  const busy = ref(false)
  const nameInput = useTemplateRef<HTMLInputElement>('nameInput')

  // a different project (or a new one) fills the form – a fresh token for the same one doesn't touch it
  watch(() => projects.editing === 'new' ? 'new' : projects.editing?.id ?? null, () => {
    const editing = projects.editing

    if (editing === null) {
      return
    }

    form.value = editing === 'new' ? blank() : fromProject(editing)
    initial.value = JSON.stringify(form.value)
    nameError.value = ''
    confirmDelete.value = false

    if (editing === 'new') {
      void nextTick(() => nameInput.value?.focus())
    } else {
      void loadTasks(editing)
      void loadReport(editing)
    }
  })

  const siteReport = ref<SiteReport | null>(null)

  /** users and plugins from the site's last report – fetched when the dialog opens */
  async function loadReport (project: Project): Promise<void> {
    siteReport.value = null

    if (project.reportedAt) {
      siteReport.value = (await projectsApi.report(project.id).catch(() => null))?.report ?? null
    }
  }

  const activePlugins = computed(() => siteReport.value?.plugins?.filter(plugin => plugin.active).length ?? 0)
  const pluginUpdates = computed(() => siteReport.value?.plugins?.filter(plugin => plugin.update) ?? [])

  /** waiting for an update first, then the active ones, the inactive last – by name within each */
  const sortedPlugins = computed(() => {
    const rank = (plugin: ReportPlugin) => plugin.update ? 0 : (plugin.active ? 1 : 2)

    return (siteReport.value?.plugins ?? []).toSorted((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'pl'))
  })

  const tasks = ref<TodoTask[]>([])
  const tasksLoading = ref(false)
  const today = new Date().toLocaleDateString('sv')

  /** open tasks of the linked Todo project – fetched when the dialog opens */
  async function loadTasks (project: Project): Promise<void> {
    tasks.value = []

    if (!project.todo) {
      return
    }

    tasksLoading.value = true
    tasks.value = (await projectsApi.tasks(project.id).catch(() => null))?.tasks ?? []
    tasksLoading.value = false
  }

  /** unsaved changes – ask before they are thrown away */
  function canClose (): boolean {
    return JSON.stringify(form.value) === initial.value || window.confirm('Odrzucić niezapisane zmiany?')
  }

  /** a domain is kept bare (no https://, no path); the main one names a new project, until a name is typed */
  function onDomainBlur (index: number): void {
    const domain = bareDomain(form.value.domains[index] ?? '')
    form.value.domains[index] = domain

    if (index === 0 && !form.value.name && domain) {
      form.value.name = domain
    }
  }

  async function addDomain (): Promise<void> {
    form.value.domains.push('')
    await nextTick()
    // the new, last field
    ;[...document.querySelectorAll<HTMLInputElement>('.domains__row input')].at(-1)?.focus()
  }

  function payload (): ProjectInput & { name: string } {
    const data: Record<string, unknown> = { ...form.value }

    // empty text clears the field
    for (const field of TEXT_FIELDS) {
      data[field] = (data[field] as string).trim() || null
    }

    data.domains = [...new Set(form.value.domains.map(domain => bareDomain(domain)).filter(Boolean))]

    return data as ProjectInput & { name: string }
  }

  async function save (): Promise<void> {
    if (!form.value.name) {
      nameError.value = 'Podaj nazwę.'

      return
    }

    busy.value = true
    const saved = project.value ? await projects.update(project.value.id, payload()) : await projects.add(payload())
    busy.value = false

    if (saved) {
      initial.value = JSON.stringify(form.value)
      projects.editing = null
    }
  }

  async function remove (): Promise<void> {
    if (!project.value) {
      return
    }

    busy.value = true

    if (await projects.remove(project.value.id)) {
      initial.value = JSON.stringify(form.value)
      projects.editing = null
    }

    busy.value = false
  }

  const envLines = computed(() => `PROJECTS_REPORT_URL=${new URL(config.reportUrl, window.location.origin).href}\nPROJECTS_REPORT_TOKEN=${project.value?.token ?? ''}`)

  async function copyEnv (): Promise<void> {
    try {
      await navigator.clipboard.writeText(envLines.value)
      notify.show('Skopiowano – wklej do .env strony.')
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
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.grid--4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.group {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 14px 0 0;
  border: 0;
  border-top: 1px solid var(--line);
}

.group legend {
  float: left;
  width: 100%;
  margin-bottom: 2px;
}

.group__hint {
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
}

.checks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
}

.check input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--accent);
}

.report__state strong {
  color: var(--text);
}

.env {
  margin: 0;
  padding: 10px 12px;
  overflow-x: auto;
  border-radius: var(--radius);
  background: var(--panel);
  font-size: 12px;
  white-space: pre;
}

code {
  font-family: var(--mono);
  font-size: .92em;
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

.domains {
  display: grid;
  gap: 6px;
}

.domains__row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.domains__add {
  justify-self: start;
}

/* open tasks of the linked Todo project – the circle in the priority colour, as in Todo */
.tasks {
  display: grid;
  margin: 0;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  list-style: none;
}

.task {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}

.task:last-child {
  border-bottom: 0;
}

.task__check {
  flex: none;
  width: 14px;
  height: 14px;
  border: 1.5px solid var(--p);
  border-radius: 50%;
}

/* in progress – half filled */
.task__check--doing {
  background: linear-gradient(90deg, var(--p) 50%, transparent 50%);
}

.task__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task__due {
  flex: none;
  color: var(--text-2);
  font-size: 12px;
}

.task__due--late {
  color: var(--danger);
}

.tasks__open {
  justify-self: start;
}

@media (max-width: 640px) {
  .grid,
  .grid--3,
  .grid--4 {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
