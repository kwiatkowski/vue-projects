<template>
  <div class="server">
    <!-- the hosting account – shared by its projects, typed once (HostDialog); here chosen, shown, and SSH built from it -->
    <SectionCard :icon="Server" :note="host ? sharedNote : undefined" title="Hosting">
      <div class="host-row">
        <label class="field host-row__select" :class="{ 'field--changed': fieldChanged('hostId') }">
          <span>Konto hostingowe</span>

          <SelectField
            v-model="form.hostId"
            label="Konto hostingowe"
            :options="hostOptions"
            placeholder="Wybierz konto"
            searchable
          />
        </label>

        <HoverTip text="Nowe konto hostingowe">
          <button aria-label="Nowe konto hostingowe" class="btn btn--outline btn--icon field-action" type="button" @click="newHost"><Plus /></button>
        </HoverTip>

        <HoverTip v-if="host" text="Edytuj konto – zmiana dotyczy wszystkich jego projektów">
          <button aria-label="Edytuj konto hostingowe" class="btn btn--outline btn--icon field-action" type="button" @click="hosts.editing = host"><Pencil /></button>
        </HoverTip>
      </div>

      <template v-if="host">
        <div class="grid">
          <label class="field">
            <span>Hosting</span>

            <CopyInput
              disabled
              :model-value="host.server ?? ''"
              open
              tip="Kopiuj hosting"
              type="text"
              what="Hosting"
            />
          </label>

          <label class="field">
            <span>Adres panelu</span>

            <CopyInput
              disabled
              :model-value="host.serverUrl ?? ''"
              open
              tip="Kopiuj adres panelu"
              type="url"
              what="Adres panelu"
            />
          </label>

          <label class="field">
            <span>Login</span>

            <CopyInput
              disabled
              :model-value="host.serverAccount ?? ''"
              tip="Kopiuj login"
              type="text"
              what="Login do panelu hostingu"
            />
          </label>

          <!-- the password only when asked – dots, the copy button copies it -->
          <label class="field">
            <span>Hasło</span>

            <CopyInput
              class="input--masked"
              disabled
              :model-value="hostPassword"
              :placeholder="host.hasPassword ? 'Wczytuję…' : '–'"
              tip="Kopiuj hasło"
              type="text"
              what="Hasło do panelu hostingu"
            />
          </label>

          <label class="field">
            <span>Opłacone do</span>

            <input
              class="input"
              :class="paid && `paid--${paid.tone}`"
              disabled
              type="text"
              :value="paid?.text ?? '–'"
            >
          </label>

          <label class="field">
            <span>Kwota odnowienia</span>
            <input class="input" disabled type="text" :value="host.renewalPrice ?? '–'">
          </label>
        </div>

        <!-- SSH – the command to log in, then the project's folder -->
        <label v-if="sshCommand" class="field">
          <span>SSH</span>

          <CopyInput
            disabled
            :model-value="sshCommand"
            tip="Kopiuj polecenie SSH"
            type="text"
            what="Polecenie SSH"
          />
        </label>
      </template>

      <!-- where the project lies on the server – the site's report says (a site with a token; an older reporter: not yet) -->
      <label v-if="project?.token" class="field">
        <span>Ścieżka projektu <span class="reported-mark">*</span></span>

        <CopyInput
          disabled
          :model-value="project.path ?? ''"
          placeholder="pojawi się z raportem strony (plugin_meden 1.22.0)"
          tip="Kopiuj ścieżkę"
          type="text"
          what="Ścieżka projektu"
        />
      </label>
    </SectionCard>

    <!-- the database – typed by the owner; the password encrypted like the others -->
    <SectionCard :icon="Database" title="Baza danych">
      <div class="grid">
        <label class="field" :class="{ 'field--changed': fieldChanged('dbHost') }">
          <span>Host</span>

          <CopyInput
            v-model="form.dbHost"
            placeholder="localhost"
            tip="Kopiuj host bazy"
            type="text"
            what="Host bazy"
          />
        </label>

        <label class="field" :class="{ 'field--changed': fieldChanged('dbName') }">
          <span>Nazwa bazy</span>

          <CopyInput
            v-model="form.dbName"
            autocomplete="off"
            tip="Kopiuj nazwę bazy"
            type="text"
            what="Nazwa bazy"
          />
        </label>

        <label class="field" :class="{ 'field--changed': fieldChanged('dbUser') }">
          <span>Użytkownik</span>

          <CopyInput
            v-model="form.dbUser"
            autocomplete="off"
            tip="Kopiuj użytkownika bazy"
            type="text"
            what="Użytkownik bazy"
          />
        </label>

        <label class="field" :class="{ 'field--changed': fieldChanged('secret:db') }">
          <span>Hasło</span>
          <PasswordInput v-model="secrets.values.db" v-model:shown="secrets.shown.db" :loading="secrets.loading.db" what="Hasło do bazy" />
        </label>
      </div>
    </SectionCard>

    <!-- the registered domains – their registries asked once a day (RDAP): who registered them, until when paid -->
    <SectionCard v-if="project?.domains.length" :icon="Globe" note="sprawdza lista raz dziennie w rejestrze domen" title="Domena">
      <dl v-if="domainRows.length > 0" class="domains">
        <template v-for="row in domainRows" :key="row.domain">
          <dt class="mono">{{ row.domain }}</dt>

          <dd>
            <span v-if="row.expires" :class="`paid--${row.tone}`">opłacona do {{ row.expires }}</span>
            <span v-else class="faint">{{ row.error ?? 'brak daty' }}</span>
            <span v-if="row.registrar" class="faint"> · {{ row.registrar }}</span>
          </dd>
        </template>
      </dl>

      <p v-else class="faint">Lista jeszcze nie pytała rejestru – zapyta przy najbliższym pełnym pobieraniu raportów.</p>
    </SectionCard>

    <!-- the TLS certificate as the list saw it at its last pull – read only -->
    <SectionCard v-if="project?.domains.length" :icon="ShieldCheck" note="sprawdza lista przy pobieraniu raportów" title="Certyfikat SSL">
      <div v-if="project.ssl" class="grid">
        <label class="field">
          <span>Stan <span class="reported-mark">*</span></span>

          <input
            class="input"
            :class="`ssl__state--${sslInfo?.state}`"
            disabled
            type="text"
            :value="sslInfo?.text"
          >
        </label>

        <label class="field">
          <span>Ważny do <span class="reported-mark">*</span></span>
          <input class="input" disabled type="text" :value="sslInfo?.validTo">
        </label>

        <label class="field">
          <span>Wystawca <span class="reported-mark">*</span></span>
          <input class="input" disabled type="text" :value="project.ssl.issuer ?? '–'">
        </label>

        <label class="field">
          <span>Sprawdzono <span class="reported-mark">*</span></span>
          <input class="input" disabled type="text" :value="formatDateTime(project.ssl.checkedAt)">
        </label>
      </div>

      <p v-else class="faint">Lista jeszcze nie sprawdzała certyfikatu – sprawdzi go przy najbliższym pobieraniu raportów.</p>

      <!-- the site's other domains – each its own certificate and answer -->
      <dl v-if="others.length > 0" class="ssl__others">
        <template v-for="row in others" :key="row.domain">
          <dt class="mono">{{ row.domain }}</dt>
          <dd><span :class="`ssl__tone--${row.tone}`">{{ row.text }}</span><span v-if="row.ssl" class="faint"> · {{ row.ssl }}</span></dd>
        </template>
      </dl>
    </SectionCard>
  </div>
</template>

<script lang="ts" setup>
  import { Database, Globe, Pencil, Plus, Server, ShieldCheck } from 'lucide-vue-next'
  import { computed, ref, watch } from 'vue'
  import { useProjectForm } from '@/components/project/form'
  import CopyInput from '@/components/ui/CopyInput.vue'
  import HoverTip from '@/components/ui/HoverTip.vue'
  import PasswordInput from '@/components/ui/PasswordInput.vue'
  import SectionCard from '@/components/ui/SectionCard.vue'
  import SelectField from '@/components/ui/SelectField.vue'
  import { useHostsStore } from '@/stores/hosts'
  import { domainChecks, formatDateTime, formatDay, paidState, sslDaysLeft, sslState } from '@/utils/projects'

  /** "Serwer": the hosting account (shared), SSH, the project's path, the database, the certificate */
  const { form, project, secrets, fieldChanged } = useProjectForm()
  const hosts = useHostsStore()

  const hostOptions = computed(() => hosts.sorted.map(host => ({ value: host.id, label: host.name })))
  const host = computed(() => hosts.byId(form.value.hostId))

  /** how many projects share it – a change in it is theirs too */
  const sharedNote = computed(() => {
    const count = host.value?.projects.length ?? 0

    return count > 1 ? `wspólne dla ${count} projektów` : 'jeden projekt'
  })

  const paid = computed(() => paidState(host.value?.paidUntil))

  /** ssh -p PORT user@host, then into the project's folder (the shell stays open there) */
  const sshCommand = computed(() => {
    const account = host.value

    if (!account?.sshHost) {
      return ''
    }

    const port = account.sshPort && account.sshPort !== 22 ? ` -p ${account.sshPort}` : ''
    const login = `${account.sshUser ? `${account.sshUser}@` : ''}${account.sshHost}`
    const path = project.value?.path

    return path ? `ssh -t${port} ${login} 'cd ${path} && exec $SHELL -l'` : `ssh${port} ${login}`
  })

  /** the account's password – fetched when an account with one is shown */
  const hostPassword = ref('')

  watch(host, async account => {
    hostPassword.value = ''

    if (account?.hasPassword) {
      const fetched = await hosts.password(account.id)

      if (host.value?.id === account.id) {
        hostPassword.value = fetched ?? ''
      }
    }
  }, { immediate: true })

  /** a new account – picked for this project once created (when its dialog closes after "Utwórz") */
  function newHost (): void {
    hosts.created = null
    hosts.editing = 'new'
    const stop = watch(() => hosts.editing, editing => {
      if (editing !== null) {
        return
      }

      if (hosts.created) {
        form.value.hostId = hosts.created.id
      }

      stop()
    })
  }

  /** the registered domains: until when paid (orange 30 days before, red past), the registrar; or why not known */
  const domainRows = computed(() => (project.value?.domainInfo ?? []).map(info => {
    const state = paidState(info.expires?.slice(0, 10))

    return { domain: info.domain, registrar: info.registrar, error: info.error, expires: state?.text ?? null, tone: state?.tone ?? 'ok' }
  }))

  /** the site's other domains: what they answer, their certificates */
  const others = computed(() => project.value ? domainChecks(project.value) : [])

  /** the certificate: fine, running out soon, or why not; until when and how long still */
  const sslInfo = computed(() => {
    const ssl = project.value?.ssl

    if (!project.value || !ssl) {
      return null
    }

    const state = sslState(project.value)
    const days = sslDaysLeft(project.value)

    return {
      state,
      text: state === 'bad' ? (ssl.error ?? 'błąd') : (state === 'soon' ? `ważny, wygasa za ${days} dni` : 'ważny'),
      validTo: ssl.validTo ? `${formatDay(ssl.validTo)}${days === null ? '' : ` (${days} dni)`}` : '–',
    }
  })
</script>

<style scoped>
.server {
  display: grid;
  gap: 12px;
}

/* the account's select, then its buttons – level with the field */
.host-row {
  display: flex;
  align-items: flex-end;
  gap: 4px;
}

.host-row__select {
  flex: 1;
  min-width: 0;
}

/* until when paid – in the colours of the certificate */
.input.paid--soon {
  color: var(--warn);
}

.input.paid--bad {
  color: var(--danger);
}

/* the registered domains – the domain, then until when paid and the registrar */
.domains {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 16px;
  margin: 0;
  font-size: 13px;
}

.domains dd {
  margin: 0;
}

.paid--soon {
  color: var(--warn);
}

.paid--bad {
  color: var(--danger);
}

/* the other domains under the home page's certificate – domain, then what it answers and its certificate */
.ssl__others {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 16px;
  margin: 0;
  font-size: 13px;
}

.ssl__others dd {
  margin: 0;
}

.ssl__tone--ok {
  color: var(--positive);
}

.ssl__tone--warn {
  color: var(--warn);
}

.ssl__tone--down {
  color: var(--danger);
}

.input.ssl__state--ok {
  color: var(--positive);
}

.input.ssl__state--soon {
  color: var(--warn);
}

.input.ssl__state--bad {
  color: var(--danger);
}
</style>
