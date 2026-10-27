<template>
  <BaseDialog
    ref="dialog"
    v-model="open"
    :can-close="canClose"
    :title="project ? 'Edycja projektu' : 'Nowy projekt'"
    :width="1100"
    @submit="save"
  >
    <!-- two columns: the name and what defines the project on the left, always in view; the details on the right, in
         tabs that start level with the name -->
    <div class="cols">
      <div class="col">
        <div class="name">
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
        </div>

        <label class="field">
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
        </label>

        <label class="field">
          <span>Kategoria</span>
          <SelectField v-model="form.categoryId" label="Kategoria" :options="categoryOptions" />
        </label>

        <label class="field">
          <span>Status <span class="reported-mark">*</span></span>

          <SelectField
            v-model="form.status"
            :disabled="locked('status')"
            label="Status"
            :options="statusOptions"
          >
            <template #option="{ option }"><StatusChip :status="option.value" /></template>
          </SelectField>
        </label>

        <label class="field">
          <span>Repozytorium <span class="reported-mark">*</span></span>

          <CopyInput
            v-model="form.repo"
            :disabled="locked('repo')"
            placeholder="https://github.com/…"
            tip="Kopiuj adres repozytorium"
            type="url"
            what="Adres repozytorium"
          />
        </label>

        <fieldset class="group">
          <legend class="eyebrow">Konfiguracja</legend>

          <div class="checks checks--column">
            <label v-for="flag in FLAGS" :key="flag" class="check">
              <input v-model="form[flag]" :disabled="REPORTED_FLAGS.has(flag) && locked(flag)" type="checkbox"> {{ FLAG_LABELS[flag] }}
              <span v-if="REPORTED_FLAGS.has(flag)" class="reported-mark">*</span>
            </label>
          </div>
        </fieldset>
      </div>

      <div class="col">
        <div class="tabs" role="tablist">
          <button
            v-for="item in TABS"
            :key="item.key"
            :aria-selected="tab === item.key"
            class="tabs__tab"
            role="tab"
            type="button"
            @click="tab = item.key"
          >
            <component :is="item.icon" /> {{ item.label }}
            <PenLine v-if="tabChanged(item.key)" aria-label="zmienione" class="tabs__changed" />
          </button>
        </div>

        <div v-show="tab === 'report'" class="tab-panel" role="tabpanel">
          <template v-if="project">

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
                  :aria-label="`Kopiuj linie do ${envFile}`"
                  class="btn btn--icon btn--sm env__copy"
                  title="Kopiuj"
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
                v-if="project.token"
                class="btn btn--sm btn--danger"
                :disabled="busy"
                type="button"
                @click="deleteToken"
              >
                <Trash2 /> Usuń token
              </button>
            </div>
          </template>

          <p v-else class="faint">Token raportu pojawi się po utworzeniu projektu.</p>
        </div>

        <div v-show="tab === 'server'" class="tab-panel" role="tabpanel">

          <div class="stack">
            <label class="field">
              <span>Hosting</span>

              <CopyInput
                v-model="form.server"
                placeholder="hostido.pl"
                tip="Kopiuj hosting"
                type="text"
                what="Hosting"
              />
            </label>

            <label class="field">
              <span>Adres panelu</span>

              <CopyInput
                v-model="form.serverUrl"
                placeholder="https://…"
                tip="Kopiuj adres panelu"
                type="url"
                what="Adres panelu"
              />
            </label>

            <label class="field">
              <span>Nazwa konta</span>

              <CopyInput
                v-model="form.serverAccount"
                class="mono"
                tip="Kopiuj nazwę konta"
                type="text"
                what="Nazwa konta"
              />
            </label>
          </div>
        </div>

        <div v-show="tab === 'tech'" class="tab-panel" role="tabpanel">
          <div class="stack">
            <label class="field">
              <span>Silnik <span class="reported-mark">*</span></span>

              <SelectField
                :disabled="locked('engine')"
                label="Silnik"
                :model-value="form.engine || null"
                :options="engineOptions"
                @update:model-value="form.engine = $event ?? ''"
              />
            </label>

            <label class="field">
              <span>Wersja <span class="reported-mark">*</span></span>

              <SelectField
                custom
                :disabled="locked('version')"
                label="Wersja"
                :model-value="form.version || null"
                :options="versionOptions"
                searchable
                @update:model-value="form.version = $event ?? ''"
              >
                <template #option="{ option }"><span class="mono">{{ option.label }}</span></template>
              </SelectField>
            </label>

            <label class="field">
              <span>Motyw <span class="reported-mark">*</span></span>
              <input v-model.trim="form.theme" class="input" :disabled="locked('theme')" type="text">
            </label>

            <label class="field">
              <span>PHP <span class="reported-mark">*</span></span>

              <SelectField
                custom
                :disabled="locked('php')"
                label="PHP"
                :model-value="form.php || null"
                :options="phpOptions"
                searchable
                @update:model-value="form.php = $event ?? ''"
              >
                <template #option="{ option }"><span class="mono">{{ option.label }}</span></template>
              </SelectField>
            </label>
          </div>
        </div>

        <div v-show="tab === 'access'" class="tab-panel" role="tabpanel">

          <div class="stack">
            <label v-for="link in ACCESS_LINKS" :key="link.field" class="field">
              <span>{{ link.label }}</span>

              <span class="input-row input-row--inside input-row--two">
                <input v-model.trim="form[link.field]" class="input" :placeholder="link.placeholder" type="url">

                <template v-if="form[link.field]">
                  <HoverTip anchor-class="field-icon field-icon--second" text="Otwórz w nowej karcie">
                    <a
                      :aria-label="`Otwórz: ${link.label}`"
                      class="btn btn--icon btn--sm input-copy"
                      :href="form[link.field] ?? undefined"
                      rel="noopener"
                      target="_blank"
                    ><ArrowUpRight /></a>
                  </HoverTip>

                  <HoverTip anchor-class="field-icon" text="Kopiuj adres">
                    <button
                      :aria-label="`Kopiuj: ${link.label}`"
                      class="btn btn--icon btn--sm input-copy"
                      type="button"
                      @click="copy(form[link.field], link.label)"
                    ><Copy /></button>
                  </HoverTip>
                </template>
              </span>
            </label>

            <!-- the panel's login and password side by side -->
            <div class="grid">
              <label class="field">
                <span>Login</span>

                <CopyInput
                  v-model="form.login"
                  autocomplete="off"
                  class="mono"
                  tip="Kopiuj login"
                  type="text"
                  what="Login"
                />
              </label>

              <label class="field">
                <span>Hasło</span>
                <PasswordInput v-model="password" v-model:shown="showPassword" :loading="passwordLoading" what="Hasło" />
              </label>
            </div>

            <!-- a site behind HTTP Basic Auth: the list fetches its report with these -->
            <div class="grid">
              <label class="field">
                <span>Basic Auth – login</span>

                <CopyInput
                  v-model="form.authUser"
                  autocomplete="off"
                  class="mono"
                  tip="Kopiuj login Basic Auth"
                  type="text"
                  what="Login Basic Auth"
                />
              </label>

              <label class="field">
                <span>Basic Auth – hasło</span>
                <PasswordInput v-model="authPassword" v-model:shown="showAuthPassword" :loading="authPasswordLoading" what="Hasło Basic Auth" />
              </label>
            </div>
          </div>
        </div>

        <div v-show="tab === 'todo'" class="tab-panel" role="tabpanel">

          <label class="field">
            <span>Powiązany projekt w Todo – jego otwarte zadania widać na liście</span>

            <SelectField v-model="form.todoProject" label="Projekt w Todo" :options="todoOptions">
              <template #option="{ option }">
                <span class="todo-option"><span class="todo-option__dot" :style="{ background: todoColor(option.value) }" />{{ option.label }}</span>
              </template>
            </SelectField>
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

            <a class="btn btn--sm btn--outline tasks__open" :href="project.todo.url" :target="TODO_TAB">
              <ListChecks /> Otwórz w Todo
            </a>
          </template>
        </div>
      </div>
    </div>

    <div v-if="confirmDelete" class="alert">
      <div>Usunąć „{{ project?.name }}”? Trafi do kosza WordPressa (projekt w Todo zostaje bez zmian).</div>
    </div>

    <template #note>
      <p class="reported-note">
        <Activity />
        <span v-if="reporting">Pola oznaczone <span class="reported-mark">*</span> uzupełnia automatycznie raport strony.</span>
        <span v-else-if="project?.token">Pola oznaczone <span class="reported-mark">*</span> uzupełni automatycznie pierwszy raport strony – token jest, strona jeszcze nic nie wysłała.</span>
        <span v-else>Pola oznaczone <span class="reported-mark">*</span> wypełni automatycznie raport strony, gdy go włączysz (zakładka „Raport strony”) – do tego czasu wpisz je ręcznie.</span>
      </p>
    </template>

    <template #actions>
      <!-- as in Todo: with changes made the only ways out are saving or dropping them -->
      <template v-if="dirty">
        <span class="unsaved"><AlertTriangle /> Niezapisane zmiany</span>
        <span style="flex: 1" />
        <button class="btn btn--danger btn--sm" type="button" @click="open = false">Zamknij bez zapisywania</button>

        <button class="btn btn--accent btn--sm" :disabled="!canSave" type="submit">
          <component :is="project ? Check : Plus" /> {{ project ? 'Zapisz' : 'Utwórz' }}
        </button>
      </template>

      <template v-else>
        <template v-if="project">
          <button v-if="!confirmDelete" class="btn btn--danger btn--sm" type="button" @click="confirmDelete = true">
            <Trash2 /> Usuń
          </button>

          <button
            v-else
            class="btn btn--danger-solid btn--sm"
            :disabled="busy"
            type="button"
            @click="remove"
          >
            <Trash2 /> Tak, usuń
          </button>
        </template>

        <span style="flex: 1" />

        <button class="btn btn--sm" type="button" @click="dialog?.requestClose()">
          <X /> Anuluj
        </button>

        <button class="btn btn--accent btn--sm" :disabled="!canSave" type="submit">
          <component :is="project ? Check : Plus" /> {{ project ? 'Zapisz' : 'Utwórz' }}
        </button>
      </template>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
  import type { Flag, Project, ProjectInput, ReportPlugin, SiteReport, Status, TodoTask } from '@/types'
  import { Activity, AlertTriangle, ArrowUpRight, Check, Copy, Cpu, KeyRound, ListChecks, PenLine, Plus, Server, Trash2, X } from 'lucide-vue-next'
  import { type Component, computed, nextTick, ref, useTemplateRef, watch } from 'vue'
  import { projectsApi } from '@/api/projects'
  import StatusChip from '@/components/StatusChip.vue'
  import BaseDialog from '@/components/ui/BaseDialog.vue'
  import CopyInput from '@/components/ui/CopyInput.vue'
  import HoverTip from '@/components/ui/HoverTip.vue'
  import PasswordInput from '@/components/ui/PasswordInput.vue'
  import SelectField from '@/components/ui/SelectField.vue'
  import { config, TODO_TAB } from '@/config'
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

  /** the flags a site's report sets – a star by them */
  const REPORTED_FLAGS = new Set<Flag>(['bedrock', 'security', 'acf', 'miModal'])

  type Form = Required<Omit<ProjectInput, 'status'>> & { status: Status | null }

  const TEXT_FIELDS = [
    'server', 'serverUrl', 'serverAccount', 'php', 'engine', 'version', 'theme', 'repo', 'notes',
    'adminUrl', 'stagingUrl', 'stagingAdminUrl', 'localUrl', 'localAdminUrl', 'login', 'authUser',
  ] as const

  // ---- the dropdowns' options

  const statusOptions = (Object.keys(STATUS_LABELS) as Status[]).map(value => ({ value, label: STATUS_LABELS[value] }))
  const categoryOptions = computed(() => projects.sortedCategories.map(category => ({ value: category.id, label: category.name })))
  const todoOptions = computed(() => projects.todoProjects.map(todo => ({ value: todo.id, label: todo.name })))
  const todoColor = (id: number) => projects.todoProjects.find(todo => todo.id === id)?.color ?? 'transparent'

  /** what's known, newest first – with the project's own value, even an unusual one, so it isn't lost */
  function versions (...values: Array<string | null | undefined>): Array<{ value: string, label: string }> {
    return [...new Set(values.filter((value): value is string => typeof value === 'string' && value !== ''))]
      .toSorted((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      .map(value => ({ value, label: value }))
  }

  const engineOptions = computed(() => versions('wordpress', form.value.engine).toSorted((a, b) => a.value === 'wordpress' ? -1 : (b.value === 'wordpress' ? 1 : 0)))
  // every WordPress since 5.0, plus what the projects run (an older one isn't lost)
  const versionOptions = computed(() => versions(config.latestWordpress, ...config.wordpressVersions, form.value.version, ...projects.items.map(item => item.version)))
  const phpOptions = computed(() => versions('7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5', form.value.php, ...projects.items.map(item => item.php)))

  type Tab = 'report' | 'server' | 'tech' | 'access' | 'todo'

  /** the right column's tabs; `fields` – what a change there marks the tab with */
  const TABS: Array<{ key: Tab, label: string, icon: Component, fields: string[] }> = [
    { key: 'report', label: 'Raport strony', icon: Activity, fields: [] },
    { key: 'server', label: 'Serwer', icon: Server, fields: ['server', 'serverUrl', 'serverAccount'] },
    { key: 'tech', label: 'Technologia', icon: Cpu, fields: ['engine', 'version', 'theme', 'php'] },
    { key: 'access', label: 'Dostęp', icon: KeyRound, fields: ['adminUrl', 'stagingUrl', 'stagingAdminUrl', 'localUrl', 'localAdminUrl', 'login', 'authUser'] },
    { key: 'todo', label: 'Todo', icon: ListChecks, fields: ['todoProject'] },
  ]

  const tab = ref<Tab>('report')

  /** a tab with unsaved changes in its fields (the passwords count for "Dostęp") */
  function tabChanged (key: Tab): boolean {
    const before = JSON.parse(initial.value || '{}') as Record<string, unknown>
    const fields = TABS.find(item => item.key === key)?.fields ?? []
    const changed = fields.some(field => JSON.stringify((form.value as Record<string, unknown>)[field]) !== JSON.stringify(before[field]))

    return changed || (key === 'access' && passwordsChanged.value)
  }

  /** the addresses under "Dostęp" – each with a button that opens it */
  const ACCESS_LINKS: Array<{ field: 'adminUrl' | 'stagingUrl' | 'stagingAdminUrl' | 'localUrl' | 'localAdminUrl', label: string, placeholder: string }> = [
    { field: 'adminUrl', label: 'Panel – produkcja', placeholder: 'https://…/wp/wp-login.php' },
    { field: 'stagingUrl', label: 'Staging – adres', placeholder: 'https://….medendev.eu/' },
    { field: 'stagingAdminUrl', label: 'Staging – panel', placeholder: 'https://…/wp/wp-login.php' },
    { field: 'localUrl', label: 'Lokalnie – adres', placeholder: 'https://….local/' },
    { field: 'localAdminUrl', label: 'Lokalnie – panel', placeholder: 'https://….local/wp/wp-login.php' },
  ]

  function blank (): Form {
    return {
      name: '',
      domains: [''],
      status: null,
      categoryId: null,
      todoProject: null,
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
  const dialog = useTemplateRef<InstanceType<typeof BaseDialog>>('dialog')

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
    showPassword.value = showAuthPassword.value = false
    // a new project has no report yet – it starts on the server
    tab.value = editing === 'new' ? 'server' : 'report'
    envTarget.value = editing !== 'new' && !editing.bedrock ? 'wordpress' : 'bedrock'

    if (editing === 'new') {
      password.value = savedPassword.value = authPassword.value = savedAuthPassword.value = ''
      void nextTick(() => nameInput.value?.focus())
    } else {
      void loadTasks(editing)
      void loadReport(editing)
      void loadPassword(editing)
    }
  })

  /**
   * The passwords – the panel's and Basic Auth's – apart from the form: kept encrypted, fetched only when the dialog
   * opens, saved on their own.
   */
  const password = ref('')
  const savedPassword = ref('')
  const passwordLoading = ref(false)
  const showPassword = ref(false)
  const authPassword = ref('')
  const savedAuthPassword = ref('')
  const authPasswordLoading = ref(false)
  const showAuthPassword = ref(false)

  const passwordsChanged = computed(() => password.value !== savedPassword.value || authPassword.value !== savedAuthPassword.value)

  async function loadPassword (project: Project): Promise<void> {
    password.value = savedPassword.value = authPassword.value = savedAuthPassword.value = ''
    passwordLoading.value = !!project.hasPassword
    authPasswordLoading.value = !!project.hasAuthPassword

    const [panel, auth] = await Promise.all([
      project.hasPassword ? projectsApi.password(project.id).catch(() => null) : null,
      project.hasAuthPassword ? projectsApi.password(project.id, 'auth').catch(() => null) : null,
    ])

    password.value = savedPassword.value = panel?.password ?? ''
    authPassword.value = savedAuthPassword.value = auth?.password ?? ''
    passwordLoading.value = authPasswordLoading.value = false
  }

  async function copy (text: string | null | undefined, what: string): Promise<void> {
    if (!text) {
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      notify.show(`${what} skopiowane do schowka.`)
    } catch {
      notify.show('Nie udało się skopiować.', { tone: 'error' })
    }
  }

  const siteReport = ref<SiteReport | null>(null)

  /** users and plugins from the site's last report – fetched when the dialog opens */
  async function loadReport (project: Project): Promise<void> {
    siteReport.value = null

    if (project.reportedAt) {
      siteReport.value = (await projectsApi.report(project.id).catch(() => null))?.report ?? null
    }
  }

  /** the site reports – the fields it fills are read-only (the status too: online / offline from its home page);
   * the repository only when the report brings one (git) */
  const reporting = computed(() => Boolean(project.value?.token && project.value?.reportedAt))

  function locked (field: 'status' | 'repo' | 'php' | 'engine' | 'version' | 'theme' | Flag): boolean {
    return reporting.value && (field !== 'repo' || Boolean(siteReport.value?.repo))
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
  /** something typed since it opened (or since the last save) – the passwords too */
  const dirty = computed(() => JSON.stringify(form.value) !== initial.value || passwordsChanged.value)

  /** "Zapisz" only with changes to save */
  const canSave = computed(() => dirty.value && !busy.value)

  /** as in Todo: ×, Esc and the backdrop close only an untouched form – changes are saved or dropped in the footer */
  function canClose (): boolean {
    return !dirty.value
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
    let saved = project.value ? await projects.update(project.value.id, payload()) : await projects.add(payload())

    if (saved && password.value !== savedPassword.value) {
      saved = await projects.setPassword(saved.id, password.value || null)
      savedPassword.value = saved ? password.value : savedPassword.value
    }

    if (saved && authPassword.value !== savedAuthPassword.value) {
      saved = await projects.setPassword(saved.id, authPassword.value || null, 'auth')
      savedAuthPassword.value = saved ? authPassword.value : savedAuthPassword.value
    }

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
    if (!project.value || !window.confirm('Usunąć token? Strona przestanie wysyłać raport, ostatni raport zostaje, a pola z raportu znów da się edytować.')) {
      return
    }

    busy.value = true
    const updated = await projects.removeToken(project.value.id)
    busy.value = false

    if (updated) {
      projects.editing = updated
      notify.show('Token usunięty.')
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

/* the fields a site's report also fills: a green star by the name and a note over them */
.reported-mark {
  color: var(--accent);
  font-weight: 600;
}

.reported-note {
  display: flex;
  margin: 0;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent-text);
  font-size: 13px;
}

.reported-note svg {
  flex: none;
  width: 16px;
  height: 16px;
}

.checks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
}

/* one under the other – Deploy, DEV, Bedrock, Wordfence, ACF, MI Modal */
.unsaved {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--warn);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.unsaved svg {
  width: 16px;
  height: 16px;
}

.checks--column {
  flex-direction: column;
  align-items: flex-start;
}

.cols {
  display: grid;
  /* the fixed part a third, the tabs two thirds */
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 16px 32px;
  align-items: start;
}

.col {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.name {
  display: grid;
  gap: 4px;
}

/* the right column's tabs – an icon and a name each; a pen when something in the tab was changed and not saved */
.tabs {
  display: flex;
  gap: 0;
  overflow-x: auto;
  border-bottom: 1px solid var(--line);
  scrollbar-width: none;
}

.tabs__tab {
  display: inline-flex;
  /* the tabs share the whole width */
  flex: 1 0 auto;
  justify-content: center;
  align-items: center;
  gap: 6px;
  margin-bottom: -1px;
  padding: 8px 9px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--text-2);
  font: inherit;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
}

.tabs__tab svg {
  width: 15px;
  height: 15px;
}

.tabs__tab:hover {
  color: var(--text);
}

.tabs__tab[aria-selected='true'] {
  border-bottom-color: var(--accent);
  color: var(--text);
}

.tabs__tab .tabs__changed {
  width: 13px;
  height: 13px;
  color: var(--warn);
}

.tab-panel {
  display: grid;
  gap: 12px;
}

.tab-panel > p {
  margin: 0;
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
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

.todo-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.todo-option__dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 3px;
}

/* fields one under the other */
.stack {
  display: grid;
  gap: 12px;
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

@media (max-width: 860px) {
  .cols {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .grid,
  .grid--3,
  .grid--4 {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
