<template>
  <BaseDialog
    v-model="columns.dialogOpen"
    :can-close="() => !dirty"
    title="Ustawienia widoku"
    :width="560"
    @submit="save"
  >
    <!-- the list's own account – not a WordPress one: whoever logs in with it sees the "Zalogowany" columns -->
    <fieldset class="account">
      <legend class="eyebrow">Konto dla zalogowanych <span class="account__note">– bez konta w WordPressie</span></legend>

      <div class="account__grid">
        <label class="field">
          <span>Login</span>

          <input
            v-model.trim="login"
            autocomplete="off"
            class="input"
            placeholder="np. klient"
            type="text"
          >
        </label>

        <label class="field">
          <span>{{ columns.viewerLogin ? 'Nowe hasło' : 'Hasło' }}</span>
          <PasswordInput v-model="password" v-model:shown="showPassword" what="Hasło zalogowanego" />
        </label>
      </div>

      <p class="faint account__hint">
        <template v-if="!login">Bez loginu nikt poza Tobą nie może się zalogować.</template>
        <template v-else-if="columns.viewerLogin">Hasło jest ustawione – wpisz nowe, żeby je zmienić (wyloguje to osoby zalogowane starym).</template>
        <template v-else>Ustaw hasło, żeby konto zadziałało.</template>
      </p>
    </fieldset>

    <table class="cols">
      <thead>
        <tr>
          <th scope="col"><span class="visually-hidden">Kolumna</span></th>
          <th class="cols__who" scope="col">Zalogowany</th>
          <th class="cols__who" scope="col">Gość</th>
        </tr>
      </thead>

      <tbody v-for="section in SECTIONS" :key="section.name">
        <tr>
          <th class="cols__section eyebrow" colspan="3" scope="colgroup">{{ section.name }}</th>
        </tr>

        <tr v-for="column in section.columns" :key="column.key">
          <th class="cols__name" scope="row">{{ column.label }}</th>

          <td class="cols__who">
            <span class="cols__check">
              <input
                v-model="viewer"
                :aria-label="`${column.label} – zalogowany`"
                :disabled="column.key === 'name'"
                type="checkbox"
                :value="column.key"
              >

              <Lock v-if="column.key === 'name'" aria-hidden="true" class="cols__lock" />
            </span>
          </td>

          <td class="cols__who">
            <HoverTip v-if="column.private" text="Nie dla gości – dane dostępowe">
              <span class="cols__check">
                <input :aria-label="`${column.label} – gość (niedostępne)`" disabled type="checkbox">
                <Lock aria-hidden="true" class="cols__lock" />
              </span>
            </HoverTip>

            <span v-else class="cols__check">
              <input
                v-model="guest"
                :aria-label="`${column.label} – gość`"
                :disabled="column.key === 'name'"
                type="checkbox"
                :value="column.key"
              >

              <Lock v-if="column.key === 'name'" aria-hidden="true" class="cols__lock" />
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <template #note>
      <p class="cols__note">
        <Info />
        <span>Ty jako admin widzisz zawsze wszystko. Zalogowani i goście dostają z serwera tylko dane swoich kolumn.</span>
      </p>
    </template>

    <template #actions>
      <!-- as the project's dialog: with changes made the only ways out are saving or dropping them -->
      <template v-if="dirty">
        <span class="unsaved"><AlertTriangle /> Niezapisane zmiany</span>
        <span style="flex: 1" />
        <button class="btn btn--danger btn--sm" type="button" @click="columns.dialogOpen = false">Zamknij bez zapisywania</button>
      </template>

      <template v-else>
        <button class="btn btn--sm" :disabled="isDefault" type="button" @click="reset">
          <RotateCcw /> Przywróć domyślne kolumny
        </button>

        <span style="flex: 1" />

        <button class="btn btn--sm" type="button" @click="columns.dialogOpen = false">
          <X /> Anuluj
        </button>
      </template>

      <button class="btn btn--accent btn--sm" :disabled="!dirty || busy || !accountReady" type="submit">
        <Check /> Zapisz
      </button>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
  import type { ColumnDef, ColumnKey } from '@/utils/columns'
  import { AlertTriangle, Check, Info, Lock, RotateCcw, X } from 'lucide-vue-next'
  import { computed, ref, watch } from 'vue'
  import BaseDialog from '@/components/ui/BaseDialog.vue'
  import HoverTip from '@/components/ui/HoverTip.vue'
  import PasswordInput from '@/components/ui/PasswordInput.vue'
  import { useColumnsStore } from '@/stores/columns'
  import { COLUMN_KEYS, COLUMNS, PUBLIC_DEFAULT } from '@/utils/columns'

  /**
   * "Wyświetl": the list's viewer account (login, password) and which columns a viewer and a guest see – the server
   * sends them only those columns' data. The private ones never go to guests; the project's name is always there.
   */
  const columns = useColumnsStore()

  const SECTIONS = [...new Set(COLUMNS.map(column => column.section))]
    .map(name => ({ name, columns: COLUMNS.filter(column => column.section === name) as ColumnDef[] }))

  const viewer = ref<ColumnKey[]>([])
  const guest = ref<ColumnKey[]>([])
  const login = ref('')
  const password = ref('')
  const showPassword = ref(false)
  const busy = ref(false)

  /** in the list's order – so "the same set" compares equal however it was ticked */
  const ordered = (keys: ColumnKey[]) => COLUMN_KEYS.filter(key => keys.includes(key))
  const same = (a: ColumnKey[], b: ColumnKey[]) => JSON.stringify(ordered(a)) === JSON.stringify(ordered(b))

  const accountChanged = computed(() => login.value !== (columns.viewerLogin ?? '') || password.value !== '')
  /** a new account needs a password */
  const accountReady = computed(() => !login.value || Boolean(columns.viewerLogin) || password.value !== '')
  const dirty = computed(() => !same(viewer.value, columns.viewerColumns) || !same(guest.value, columns.guestColumns) || accountChanged.value)
  const isDefault = computed(() => same(viewer.value, PUBLIC_DEFAULT) && same(guest.value, PUBLIC_DEFAULT))

  // every opening starts from what is saved
  watch(() => columns.dialogOpen, open => {
    if (open) {
      viewer.value = [...columns.viewerColumns]
      guest.value = [...columns.guestColumns]
      login.value = columns.viewerLogin ?? ''
      password.value = ''
      showPassword.value = false
    }
  })

  /** both as the public list always was – still to be saved */
  function reset (): void {
    viewer.value = [...PUBLIC_DEFAULT]
    guest.value = [...PUBLIC_DEFAULT]
  }

  async function save (): Promise<void> {
    if (!dirty.value || !accountReady.value) {
      return
    }

    busy.value = true
    const account = accountChanged.value ? { login: login.value, password: password.value || null } : undefined

    if (await columns.save(ordered(viewer.value), ordered(guest.value), account)) {
      columns.dialogOpen = false
    }

    busy.value = false
  }
</script>

<style scoped>
/* the account over the columns, as a section of the project's dialog */
.account {
  display: grid;
  gap: 10px;
  margin: 0 0 18px;
  padding: 0;
  border: 0;
}

.account legend {
  float: left;
  width: 100%;
  margin-bottom: 2px;
}

.account__note {
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
}

.account__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.account__hint {
  margin: 0;
  font-size: 12px;
}

@media (max-width: 520px) {
  .account__grid {
    grid-template-columns: 1fr;
  }
}

.cols {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.cols th,
.cols td {
  padding: 7px 0;
  font-weight: 400;
  text-align: left;
}

.cols thead th {
  padding-top: 0;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 500;
}

/* a section's heading as "Konfiguracja" in the project's dialog – with a line over it */
.cols .cols__section {
  padding: 14px 0 4px;
  border-top: 1px solid var(--line);
  font-weight: 600;
}

.cols tbody:first-of-type .cols__section {
  padding-top: 6px;
}

.cols__name {
  color: var(--text);
}

.cols .cols__who {
  width: 110px;
  text-align: center;
}

.cols__check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  vertical-align: middle;
}

/* the lock beside a box that can't change – the name always, the private columns never for guests */
.cols__lock {
  width: 13px;
  height: 13px;
  color: var(--text-3);
}

/* the lock sits on the right of the box – the boxes themselves stay in one line */
.cols__check:has(.cols__lock) {
  margin-right: -19px;
}

.cols__note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--text-2);
  font-size: 13px;
}

.cols__note svg {
  flex: none;
  width: 16px;
  height: 16px;
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
</style>
