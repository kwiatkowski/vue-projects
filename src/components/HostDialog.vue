<template>
  <BaseDialog
    ref="dialog"
    v-model="open"
    :title="host ? 'Konto hostingowe' : 'Nowe konto hostingowe'"
    :width="720"
    @submit="save()"
  >
    <!-- another account in the same dialog – searched by name; a pencil by the ones with changes kept -->
    <template v-if="host" #head>
      <SelectField
        :clearable="false"
        label="Przełącz na inne konto"
        :model-value="host.id"
        :options="switchOptions"
        searchable
        @update:model-value="switchTo"
      >
        <template #option="{ option }">{{ option.label }} <PenLine v-if="hosts.drafts.has(option.value)" class="draft-mark" /></template>
      </SelectField>
    </template>

    <label class="field" :class="{ 'field--changed': changed('name') }">
      <span>Nazwa</span>

      <input
        ref="input"
        v-model.trim="form.name"
        :aria-invalid="error ? 'true' : undefined"
        class="input"
        placeholder="np. hostido – medenn"
        type="text"
      >
    </label>

    <span v-if="error" class="error-text">{{ error }}</span>

    <div class="grid">
      <label class="field" :class="{ 'field--changed': changed('server') }">
        <span>Hosting</span>

        <CopyInput
          v-model="form.server"
          open
          placeholder="hostido.pl"
          tip="Kopiuj hosting"
          type="text"
          what="Hosting"
        />
      </label>

      <label class="field" :class="{ 'field--changed': changed('serverUrl') }">
        <span>Adres panelu</span>

        <CopyInput
          v-model="form.serverUrl"
          open
          placeholder="https://…"
          tip="Kopiuj adres panelu"
          type="url"
          what="Adres panelu"
        />
      </label>

      <label class="field" :class="{ 'field--changed': changed('serverAccount') }">
        <span>Login</span>

        <CopyInput
          v-model="form.serverAccount"
          autocomplete="off"
          tip="Kopiuj login"
          type="text"
          what="Login do panelu hostingu"
        />
      </label>

      <label class="field" :class="{ 'field--changed': changed('password') }">
        <span>Hasło</span>
        <PasswordInput v-model="password" v-model:shown="shown" :loading="loading" what="Hasło do panelu hostingu" />
      </label>

      <label class="field" :class="{ 'field--changed': changed('paidUntil') }">
        <span>Opłacone do</span>
        <DateField v-model="form.paidUntil" />
      </label>

      <label class="field" :class="{ 'field--changed': changed('renewalPrice') }">
        <span>Kwota odnowienia</span>
        <input v-model.trim="form.renewalPrice" class="input" placeholder="np. 299 zł brutto / rok" type="text">
      </label>
    </div>

    <!-- SSH: the project's tab builds the command from these (and the project's path) -->
    <div class="ssh">
      <label class="field" :class="{ 'field--changed': changed('sshHost') }">
        <span>SSH – host</span>

        <CopyInput
          v-model="form.sshHost"
          placeholder="np. hostido.pl"
          tip="Kopiuj host SSH"
          type="text"
          what="Host SSH"
        />
      </label>

      <label class="field" :class="{ 'field--changed': changed('sshPort') }">
        <span>Port</span>

        <input
          v-model.number="form.sshPort"
          class="input"
          inputmode="numeric"
          max="65535"
          min="1"
          placeholder="22"
          type="number"
        >
      </label>

      <label class="field" :class="{ 'field--changed': changed('sshUser') }">
        <span>Użytkownik</span>

        <CopyInput
          v-model="form.sshUser"
          autocomplete="off"
          tip="Kopiuj użytkownika SSH"
          type="text"
          what="Użytkownik SSH"
        />
      </label>
    </div>

    <!-- the projects on it, one under another with their status – a change here is theirs too -->
    <div v-if="host" class="used">
      <div class="eyebrow">Projekty na tym koncie <span class="mono faint">{{ used.length }}</span></div>

      <ul v-if="used.length > 0" class="used__list">
        <li v-for="project in used" :key="project.id">
          <span>{{ project.name }}</span>
          <StatusChip :status="project.status" />
        </li>
      </ul>

      <p v-else class="faint">Żaden projekt nie używa tego konta.</p>
    </div>

    <div v-if="confirmDelete" class="alert">
      <div>Usunąć konto „{{ host?.name }}”? Jego projekty zostaną – bez konta hostingowego.</div>
    </div>

    <template #actions>
      <!-- switching to another one while this one has changes: the footer asks – stay, switch keeping them, save first -->
      <template v-if="pending">
        <span v-tip="`Na „${pending.name}”`" class="unsaved switch-ask"><AlertTriangle /> <span>Przełączyć?</span></span>
        <span style="flex: 1" />

        <button class="btn btn--sm" type="button" @click="pending = null">Zostań</button>

        <button class="btn btn--danger btn--sm" type="button" @click="confirmSwitch('drop')">
          <X /> Odrzuć i przełącz
        </button>

        <button v-tip="'Zmiany zostaną zachowane – będą w formularzu po powrocie'" class="btn btn--sm" type="button" @click="confirmSwitch('keep')">
          Zachowaj i przełącz
        </button>

        <button class="btn btn--accent btn--sm" type="button" @click="confirmSwitch('save')">
          <Check /> Zapisz i przełącz
        </button>
      </template>

      <!-- with changes: drop them, or close and keep them for later (the form has them when it opens again), or save -->
      <template v-else-if="dirty">
        <span class="unsaved"><AlertTriangle /> Niezapisane zmiany</span>
        <span style="flex: 1" />

        <button class="btn btn--danger btn--sm" type="button" @click="discard">
          <X /> Zamknij bez zapisywania
        </button>

        <button v-tip="'Zmiany zostaną zachowane – będą w formularzu po ponownym otwarciu'" class="btn btn--sm" type="button" @click="open = false">
          Zamknij
        </button>

        <button class="btn btn--accent btn--sm" :disabled="busy" type="submit">
          <component :is="host ? Check : Plus" /> {{ host ? 'Zapisz' : 'Utwórz' }}
        </button>
      </template>

      <template v-else>
        <template v-if="host">
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

        <button class="btn btn--accent btn--sm" :disabled="busy || (host !== null && !dirty)" type="submit">
          <component :is="host ? Check : Plus" /> {{ host ? 'Zapisz' : 'Utwórz' }}
        </button>
      </template>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
  import type { HostInput } from '@/types'
  import { AlertTriangle, Check, PenLine, Plus, Trash2, X } from 'lucide-vue-next'
  import { computed, nextTick, reactive, ref, useTemplateRef, watch } from 'vue'
  import StatusChip from '@/components/StatusChip.vue'
  import BaseDialog from '@/components/ui/BaseDialog.vue'
  import CopyInput from '@/components/ui/CopyInput.vue'
  import DateField from '@/components/ui/DateField.vue'
  import PasswordInput from '@/components/ui/PasswordInput.vue'
  import SelectField from '@/components/ui/SelectField.vue'
  import { vTip } from '@/directives/tip'
  import { useHostsStore } from '@/stores/hosts'
  import { useNotifyStore } from '@/stores/notify'
  import { useProjectsStore } from '@/stores/projects'

  /** A hosting account: its hosting, panel, login and password, paid until, SSH – shared by its projects. */
  const hosts = useHostsStore()
  const projects = useProjectsStore()
  const notify = useNotifyStore()

  const open = computed({
    get: () => hosts.editing !== null,
    set: value => {
      if (!value) {
        hosts.editing = null
      }
    },
  })

  const host = computed(() => hosts.editing === 'new' ? null : hosts.editing)

  const empty = (): Required<HostInput> => ({ name: '', server: '', serverUrl: '', serverAccount: '', paidUntil: '', renewalPrice: '', sshHost: '', sshPort: null, sshUser: '' })
  const form = reactive(empty())
  const password = ref('')
  const savedPassword = ref('')
  const shown = ref(false)
  const loading = ref(false)
  const error = ref('')
  const confirmDelete = ref(false)
  const busy = ref(false)
  const input = useTemplateRef<HTMLInputElement>('input')
  const dialog = useTemplateRef<InstanceType<typeof BaseDialog>>('dialog')

  /** the account's projects, by name */
  const used = computed(() => (host.value?.projects ?? [])
    .map(id => projects.items.find(project => project.id === id))
    .filter(project => project !== undefined)
    .toSorted((a, b) => a.name.localeCompare(b.name, 'pl')))

  /** the form as opened – an empty field and a cleared port count as the same */
  const initial = ref<Record<string, unknown>>({})
  const snapshot = () => Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value === '' ? null : value]))

  /** a field changed since opened – its pencil, as in the project's dialog */
  function changed (key: string): boolean {
    return key === 'password'
      ? password.value !== savedPassword.value
      : JSON.stringify(snapshot()[key] ?? null) !== JSON.stringify(initial.value[key] ?? null)
  }

  /** something typed since it opened – kept as a draft when the dialog closes (or switches) without saving */
  const modified = computed(() => password.value !== savedPassword.value || Object.keys(form).some(key => changed(key)))
  const dirty = computed(() => open.value && modified.value)

  const keyOf = (editing: typeof hosts.editing) => editing === null ? null : (editing === 'new' ? 'new' : editing.id)

  /** the other accounts to switch to, by name */
  const switchOptions = computed(() => hosts.sorted.map(item => ({ value: item.id, label: item.name })))
  /** the account asked for while this one has changes – the note asks what to do */
  const pending = ref<NonNullable<typeof host.value> | null>(null)

  function switchTo (id: number | null): void {
    const target = hosts.byId(id)

    if (!target || target.id === host.value?.id) {
      return
    }

    if (dirty.value) {
      pending.value = target
    } else {
      hosts.editing = target
    }
  }

  /** the answer to switching with changes: keep them as a draft, drop them, or save them first */
  function confirmSwitch (how: 'keep' | 'drop' | 'save'): void {
    const target = pending.value
    pending.value = null

    if (!target) {
      return
    }

    if (how === 'save') {
      void save(target)
    } else {
      if (how === 'drop') {
        revert()
      }

      hosts.editing = target
    }
  }

  /** the changes dropped – the form as opened, the password as saved */
  function revert (): void {
    for (const key of Object.keys(form) as Array<keyof typeof form>) {
      ;(form as Record<string, unknown>)[key] = initial.value[key] ?? (key === 'sshPort' ? null : '')
    }

    password.value = savedPassword.value
  }

  /** the changes dropped and the dialog closed */
  function discard (): void {
    revert()
    open.value = false
  }

  watch(() => hosts.editing, async (editing, previous) => {
    // the one left: its changes kept for later, or its draft gone when there is none
    const left = keyOf(previous ?? null)

    if (left !== null && left !== keyOf(editing)) {
      if (modified.value) {
        hosts.drafts.set(left, { form: { ...form }, password: password.value })
      } else {
        hosts.drafts.delete(left)
      }
    }

    pending.value = null

    if (editing === null) {
      return
    }

    Object.assign(form, empty(), editing === 'new' ? {} : Object.fromEntries(Object.keys(empty()).map(key => [key, editing[key as keyof HostInput] ?? (key === 'sshPort' ? null : '')])))
    password.value = savedPassword.value = ''
    initial.value = snapshot()
    shown.value = false
    error.value = ''
    confirmDelete.value = false
    void nextTick(() => input.value?.focus())

    // its draft from before – the changes back, over the saved values
    const draft = hosts.drafts.get(keyOf(editing) ?? 'new')

    if (draft) {
      Object.assign(form, draft.form)
      notify.show('Przywrócono niezapisane zmiany.')
    }

    if (editing !== 'new' && editing.hasPassword) {
      loading.value = true
      password.value = savedPassword.value = await hosts.password(editing.id) ?? ''
      loading.value = false
    }

    if (draft && keyOf(hosts.editing) === keyOf(editing)) {
      password.value = draft.password
    }
  })

  /** saves; then closes – or opens `next` (switching after saving) */
  async function save (next?: NonNullable<typeof host.value>): Promise<void> {
    if (!form.name) {
      error.value = 'Podaj nazwę.'

      return
    }

    busy.value = true
    // empty fields cleared – null on the server; the password sent only when changed
    const data = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value === '' ? null : value])) as HostInput
    const saved = await hosts.save(host.value?.id ?? null, data, password.value === savedPassword.value ? undefined : password.value)
    busy.value = false

    if (saved) {
      // saved – nothing left to keep as a draft
      initial.value = snapshot()
      savedPassword.value = password.value
      hosts.editing = next ?? null
    }
  }

  async function remove (): Promise<void> {
    if (!host.value) {
      return
    }

    busy.value = true

    if (await hosts.remove(host.value.id)) {
      initial.value = snapshot()
      savedPassword.value = password.value
      open.value = false
    }

    busy.value = false
  }
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

/* host, port, user – the port narrow */
.ssh {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px minmax(0, 1fr);
  gap: 12px;
}

/* the account's projects – one per line, each with its status */
.used {
  display: grid;
  gap: 8px;
}

.used__list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  font-size: 13px;
  list-style: none;
}

.used__list li {
  display: flex;
  align-items: center;
  gap: 10px;
}

.used p {
  margin: 0;
  font-size: 13px;
}

.draft-mark {
  width: 13px;
  height: 13px;
  color: var(--warn);
  vertical-align: -2px;
}

/* the footer's "unsaved" – as in the project's dialog */
/* the question about switching – short, never cut (where to: its tooltip) */
.switch-ask {
  flex: none;
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

@media (max-width: 640px) {
  .grid,
  .ssh {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
