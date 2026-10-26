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

    <div class="grid">
      <label class="field">
        <span>Domena</span>

        <input
          v-model.trim="form.domain"
          class="input"
          placeholder="przyklad.pl"
          type="text"
          @blur="nameFromDomain"
        >
      </label>

      <label class="field">
        <span>Status</span>

        <select v-model="form.status" class="input">
          <option :value="null">—</option>
          <option v-for="(label, value) in STATUS_LABELS" :key="value" :value="value">{{ label }}</option>
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

        <label class="check">
          <input v-model="form.inTodo" type="checkbox"> Pokaż w Todo
        </label>
      </div>
    </fieldset>

    <label class="field">
      <span>Notatki</span>
      <textarea v-model="form.notes" class="input" rows="3" />
    </label>

    <fieldset v-if="project" class="group report">
      <legend class="eyebrow">Raport strony</legend>

      <p class="muted report__state">
        <template v-if="project.reportedAt">
          Ostatni: <strong>{{ ago(project.reportedAt) }}</strong> <span class="mono faint">{{ project.reportedAt.slice(0, 16).replace('T', ' ') }} UTC</span>
        </template>

        <template v-else>Strona jeszcze nic nie wysłała.</template>
      </p>

      <template v-if="project.token">
        <p class="muted">W <code>.env</code> strony (wtyczka <code>reporter/</code> z wp-plugin-projects):</p>
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
      <div>Usunąć „{{ project?.name }}”? Trafi do kosza WordPressa{{ project?.inTodo ? ', a jego zadania w Todo – do „Do posortowania”' : '' }}.</div>
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
  import type { Flag, Project, ProjectInput, Status } from '@/types'
  import { Copy, KeyRound } from 'lucide-vue-next'
  import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
  import BaseDialog from '@/components/ui/BaseDialog.vue'
  import { config } from '@/config'
  import { useNotifyStore } from '@/stores/notify'
  import { useProjectsStore } from '@/stores/projects'
  import { FLAGS } from '@/types'
  import { ago, STATUS_LABELS } from '@/utils/projects'

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

  const TEXT_FIELDS = ['domain', 'server', 'serverUrl', 'serverAccount', 'php', 'engine', 'version', 'theme', 'repo', 'localUrl', 'dbSync', 'notes'] as const

  function blank (): Form {
    return {
      name: '',
      status: null,
      listed: true,
      inTodo: false,
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
    }
  })

  /** unsaved changes – ask before they are thrown away */
  function canClose (): boolean {
    return JSON.stringify(form.value) === initial.value || window.confirm('Odrzucić niezapisane zmiany?')
  }

  /** a new site: the domain is the name, until a name is typed */
  function nameFromDomain (): void {
    if (!form.value.name && form.value.domain) {
      form.value.name = form.value.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    }
  }

  function payload (): ProjectInput & { name: string } {
    const data: Record<string, unknown> = { ...form.value }

    // empty text clears the field
    for (const field of TEXT_FIELDS) {
      data[field] = (data[field] as string).trim() || null
    }

    data.domain = (data.domain as string | null)?.replace(/^https?:\/\//, '').replace(/\/$/, '') ?? null

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

@media (max-width: 640px) {
  .grid,
  .grid--3,
  .grid--4 {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
