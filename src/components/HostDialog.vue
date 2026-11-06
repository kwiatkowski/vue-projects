<template>
  <BaseDialog v-model="open" :title="host ? 'Konto hostingowe' : 'Nowe konto hostingowe'" :width="640" @submit="save">
    <label class="field">
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
        <span>Login</span>

        <CopyInput
          v-model="form.serverAccount"
          autocomplete="off"
          tip="Kopiuj login"
          type="text"
          what="Login do panelu hostingu"
        />
      </label>

      <label class="field">
        <span>Hasło</span>
        <PasswordInput v-model="password" v-model:shown="shown" :loading="loading" what="Hasło do panelu hostingu" />
      </label>

      <label class="field">
        <span>Opłacone do</span>
        <input v-model="form.paidUntil" class="input" type="date">
      </label>

      <label class="field">
        <span>Kwota odnowienia</span>
        <input v-model.trim="form.renewalPrice" class="input" placeholder="np. 299 zł brutto / rok" type="text">
      </label>
    </div>

    <!-- SSH: the project's tab builds the command from these (and the project's path) -->
    <div class="ssh">
      <label class="field">
        <span>SSH – host</span>

        <CopyInput
          v-model="form.sshHost"
          placeholder="np. hostido.pl"
          tip="Kopiuj host SSH"
          type="text"
          what="Host SSH"
        />
      </label>

      <label class="field">
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

      <label class="field">
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

    <!-- the projects on it – a change here is theirs too -->
    <p v-if="host" class="faint used">
      <template v-if="used.length > 0">Projekty na tym koncie ({{ used.length }}): {{ used.join(', ') }}</template>
      <template v-else>Żaden projekt nie używa tego konta.</template>
    </p>

    <div v-if="confirmDelete" class="alert">
      <div>Usunąć konto „{{ host?.name }}”? Jego projekty zostaną – bez konta hostingowego.</div>
    </div>

    <template #actions>
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

      <button class="btn btn--sm" type="button" @click="open = false">
        <X /> Anuluj
      </button>

      <button class="btn btn--accent btn--sm" :disabled="busy" type="submit">
        <component :is="host ? Check : Plus" /> {{ host ? 'Zapisz' : 'Utwórz' }}
      </button>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
  import type { HostInput } from '@/types'
  import { Check, Plus, Trash2, X } from 'lucide-vue-next'
  import { computed, nextTick, reactive, ref, useTemplateRef, watch } from 'vue'
  import BaseDialog from '@/components/ui/BaseDialog.vue'
  import CopyInput from '@/components/ui/CopyInput.vue'
  import PasswordInput from '@/components/ui/PasswordInput.vue'
  import { useHostsStore } from '@/stores/hosts'
  import { useProjectsStore } from '@/stores/projects'

  /** A hosting account: its hosting, panel, login and password, paid until, SSH – shared by its projects. */
  const hosts = useHostsStore()
  const projects = useProjectsStore()

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

  /** the names of the account's projects */
  const used = computed(() => (host.value?.projects ?? []).map(id => projects.items.find(project => project.id === id)?.name).filter(name => name !== undefined))

  watch(() => hosts.editing, async editing => {
    if (editing === null) {
      return
    }

    Object.assign(form, empty(), editing === 'new' ? {} : Object.fromEntries(Object.keys(empty()).map(key => [key, editing[key as keyof HostInput] ?? (key === 'sshPort' ? null : '')])))
    password.value = savedPassword.value = ''
    shown.value = false
    error.value = ''
    confirmDelete.value = false
    void nextTick(() => input.value?.focus())

    if (editing !== 'new' && editing.hasPassword) {
      loading.value = true
      password.value = savedPassword.value = await hosts.password(editing.id) ?? ''
      loading.value = false
    }
  })

  async function save (): Promise<void> {
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
      open.value = false
    }
  }

  async function remove (): Promise<void> {
    if (!host.value) {
      return
    }

    busy.value = true

    if (await hosts.remove(host.value.id)) {
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

.used {
  margin: 0;
  font-size: 13px;
}

@media (max-width: 640px) {
  .grid,
  .ssh {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
