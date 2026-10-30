<template>
  <BaseDialog
    ref="dialog"
    v-model="open"
    :can-close="canClose"
    :title="project ? 'Edycja projektu' : 'Nowy projekt'"
    :width="1360"
    @submit="save"
  >
    <!-- two columns: the name and what defines the project on the left, always in view; the details on the right, in
         tabs that start level with the name -->
    <div class="cols project-form">
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
                v-tip="'Usuń domenę'"
                aria-label="Usuń domenę"
                class="btn btn--icon btn--sm"
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

        <div v-show="tab === 'report'" class="tab-panel" role="tabpanel"><ReportTab /></div>
        <div v-show="tab === 'history'" class="tab-panel" role="tabpanel"><HistoryTab :active="tab === 'history'" /></div>
        <div v-show="tab === 'server'" class="tab-panel" role="tabpanel"><ServerTab /></div>
        <div v-show="tab === 'tech'" class="tab-panel" role="tabpanel"><TechTab /></div>
        <div v-show="tab === 'access'" class="tab-panel" role="tabpanel"><AccessTab /></div>
        <div v-show="tab === 'integrations'" class="tab-panel" role="tabpanel"><IntegrationsTab /></div>

        <div v-show="tab === 'notes'" class="tab-panel" role="tabpanel">
          <NotesEditor :max-length="5000" :model-value="form.notes ?? ''" placeholder="Notatki" @update:model-value="form.notes = $event" />
        </div>

        <div v-show="tab === 'todo'" class="tab-panel" role="tabpanel"><TodoTab /></div>
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

        <button class="btn btn--danger btn--sm" type="button" @click="open = false">
          <X /> Zamknij bez zapisywania
        </button>

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
  import type { Project, SiteReport, Status } from '@/types'
  import { Activity, AlertTriangle, Check, Cpu, History, KeyRound, ListChecks, NotebookPen, PenLine, Plus, Puzzle, Server, Trash2, X } from 'lucide-vue-next'
  import { type Component, computed, defineAsyncComponent, nextTick, provide, ref, useTemplateRef, watch } from 'vue'
  import { projectsApi } from '@/api/projects'
  import AccessTab from '@/components/project/AccessTab.vue'
  import { blank, FLAG_LABELS, type Form, fromProject, type LockedField, projectFormKey, REPORTED_FLAGS, TEXT_FIELDS } from '@/components/project/form'
  import HistoryTab from '@/components/project/HistoryTab.vue'
  import IntegrationsTab from '@/components/project/IntegrationsTab.vue'
  import ReportTab from '@/components/project/ReportTab.vue'
  import { useSecrets } from '@/components/project/secrets'
  import ServerTab from '@/components/project/ServerTab.vue'
  import TechTab from '@/components/project/TechTab.vue'
  import TodoTab from '@/components/project/TodoTab.vue'
  import StatusChip from '@/components/StatusChip.vue'
  import BaseDialog from '@/components/ui/BaseDialog.vue'
  import CopyInput from '@/components/ui/CopyInput.vue'
  import SelectField from '@/components/ui/SelectField.vue'
  import { vTip } from '@/directives/tip'
  import { useNotifyStore } from '@/stores/notify'
  import { useProjectsStore } from '@/stores/projects'
  import { FLAGS } from '@/types'
  import { bareDomain, STATUS_LABELS } from '@/utils/projects'
  import '@/components/project/project-form.css'

  /** The project's dialog: the name and what defines the project on the left, the tabs (components/project/) right. */
  const projects = useProjectsStore()
  const notify = useNotifyStore()

  // the notes' editor (Tiptap) comes in its own chunk – fetched a moment after the list, not with it
  const loadNotesEditor = () => import('@/components/ui/NotesEditor.vue')
  const NotesEditor = defineAsyncComponent(loadNotesEditor)
  setTimeout(() => void loadNotesEditor().catch(() => {}), 3000)

  const statusOptions = (Object.keys(STATUS_LABELS) as Status[]).map(value => ({ value, label: STATUS_LABELS[value] }))
  const categoryOptions = computed(() => projects.sortedCategories.map(category => ({ value: category.id, label: category.name })))

  type Tab = 'report' | 'history' | 'server' | 'tech' | 'access' | 'integrations' | 'notes' | 'todo'

  /** the right column's tabs; `fields` – what a change there marks the tab with */
  const TABS: Array<{ key: Tab, label: string, icon: Component, fields: string[] }> = [
    { key: 'report', label: 'Raport strony', icon: Activity, fields: [] },
    { key: 'history', label: 'Historia', icon: History, fields: [] },
    { key: 'server', label: 'Serwer', icon: Server, fields: ['server', 'serverUrl', 'serverAccount'] },
    { key: 'tech', label: 'Technologia', icon: Cpu, fields: ['engine', 'version', 'theme', 'php'] },
    { key: 'access', label: 'Dostęp', icon: KeyRound, fields: ['adminUrl', 'stagingUrl', 'stagingAdminUrl', 'localUrl', 'localAdminUrl', 'login', 'authUser', 'stagingAuthUser'] },
    { key: 'integrations', label: 'Integracje', icon: Puzzle, fields: ['recaptchaSiteKey', 'googleMapsKey'] },
    { key: 'notes', label: 'Notatki', icon: NotebookPen, fields: ['notes'] },
    { key: 'todo', label: 'Todo', icon: ListChecks, fields: ['todoProject'] },
  ]

  const tab = ref<Tab>('report')

  /** a tab with unsaved changes in its fields (the passwords count for "Dostęp", reCAPTCHA's secret for "Integracje") */
  function tabChanged (key: Tab): boolean {
    const before = JSON.parse(initial.value || '{}') as Record<string, unknown>
    const fields = TABS.find(item => item.key === key)?.fields ?? []
    const changed = fields.some(field => JSON.stringify((form.value as Record<string, unknown>)[field]) !== JSON.stringify(before[field]))

    return changed || (key === 'access' && secrets.accessChanged.value) || (key === 'integrations' && secrets.changed('recaptcha'))
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
  const secrets = useSecrets()
  const siteReport = ref<SiteReport | null>(null)

  /** users and plugins from the site's last report – fetched when the dialog opens */
  async function loadReport (target: Project): Promise<void> {
    siteReport.value = null

    if (target.reportedAt) {
      siteReport.value = (await projectsApi.report(target.id).catch(() => null))?.report ?? null
    }
  }

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
    // a new project has no report yet – it starts on the server
    tab.value = editing === 'new' ? 'server' : 'report'

    if (editing === 'new') {
      secrets.reset()
      siteReport.value = null
      void nextTick(() => nameInput.value?.focus())
    } else {
      void loadReport(editing)
      void secrets.load(editing)
    }
  })

  /** the site reports – the fields it fills are read-only (the status too: online / offline from its home page);
   * the repository only when the report brings one (git) */
  const reporting = computed(() => Boolean(project.value?.token && project.value?.reportedAt))

  function locked (field: LockedField): boolean {
    return reporting.value && (field !== 'repo' || Boolean(siteReport.value?.repo))
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

  provide(projectFormKey, { form, initial, project, busy, siteReport, loadReport, locked, secrets, copy })

  /** something typed since it opened (or since the last save) – the passwords too */
  const dirty = computed(() => JSON.stringify(form.value) !== initial.value || secrets.anyChanged.value)

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

  function payload () {
    const data: Record<string, unknown> = { ...form.value }

    // empty text clears the field
    for (const field of TEXT_FIELDS) {
      data[field] = (data[field] as string).trim() || null
    }

    data.domains = [...new Set(form.value.domains.map(domain => bareDomain(domain)).filter(Boolean))]

    return data as Parameters<typeof projects.add>[0]
  }

  async function save (): Promise<void> {
    if (!form.value.name) {
      nameError.value = 'Podaj nazwę.'

      return
    }

    busy.value = true
    let saved = project.value ? await projects.update(project.value.id, payload()) : await projects.add(payload())

    if (saved) {
      saved = await secrets.save(saved)
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
</script>

<style scoped>
/* the note under the form: the fields a site's report fills */
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
  /* the fixed part as wide as it was (a third of 1240px), the tabs get the rest */
  grid-template-columns: minmax(0, 390px) minmax(0, 1fr);
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

@media (max-width: 860px) {
  .cols {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
