<template>
  <BaseDialog
    v-model="columns.dialogOpen"
    :can-close="() => !dirty"
    title="Widoczne kolumny"
    :width="560"
    @submit="save"
  >
    <table class="cols">
      <thead>
        <tr>
          <th scope="col"><span class="visually-hidden">Kolumna</span></th>
          <th class="cols__who" scope="col">Dla mnie</th>
          <th class="cols__who" scope="col">Publicznie</th>
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
                v-model="mine"
                :aria-label="`${column.label} – dla mnie`"
                :disabled="column.key === 'name'"
                type="checkbox"
                :value="column.key"
              >

              <Lock v-if="column.key === 'name'" aria-hidden="true" class="cols__lock" />
            </span>
          </td>

          <td class="cols__who">
            <HoverTip v-if="column.private" text="Tylko dla zalogowanych – dane dostępowe">
              <span class="cols__check">
                <input :aria-label="`${column.label} – publicznie (tylko dla zalogowanych)`" disabled type="checkbox">
                <Lock aria-hidden="true" class="cols__lock" />
              </span>
            </HoverTip>

            <span v-else class="cols__check">
              <input
                v-model="publicColumns"
                :aria-label="`${column.label} – publicznie`"
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
        <span>Niezalogowani widzą tylko kolumny z „Publicznie” – serwer wysyła im wyłącznie te dane.</span>
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
          <RotateCcw /> Przywróć domyślne
        </button>

        <span style="flex: 1" />

        <button class="btn btn--sm" type="button" @click="columns.dialogOpen = false">
          <X /> Anuluj
        </button>
      </template>

      <button class="btn btn--accent btn--sm" :disabled="!dirty || busy" type="submit">
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
  import { useColumnsStore } from '@/stores/columns'
  import { COLUMN_KEYS, COLUMNS, PUBLIC_DEFAULT } from '@/utils/columns'

  /**
   * "Wyświetl": which columns the list shows – for the owner (kept on their account) and for everyone else (the server
   * sends them only those columns' data). The private ones can't go public; the project's name is always there.
   */
  const columns = useColumnsStore()

  const SECTIONS = [...new Set(COLUMNS.map(column => column.section))]
    .map(name => ({ name, columns: COLUMNS.filter(column => column.section === name) as ColumnDef[] }))

  const mine = ref<ColumnKey[]>([])
  const publicColumns = ref<ColumnKey[]>([])
  const busy = ref(false)

  /** in the list's order – so "the same set" compares equal however it was ticked */
  const ordered = (keys: ColumnKey[]) => COLUMN_KEYS.filter(key => keys.includes(key))
  const saved = () => JSON.stringify([ordered(columns.mine ?? [...COLUMN_KEYS]), ordered(columns.publicColumns)])

  const dirty = computed(() => JSON.stringify([ordered(mine.value), ordered(publicColumns.value)]) !== saved())
  const isDefault = computed(() => ordered(mine.value).length === COLUMN_KEYS.length && JSON.stringify(ordered(publicColumns.value)) === JSON.stringify(PUBLIC_DEFAULT))

  // every opening starts from what is saved
  watch(() => columns.dialogOpen, open => {
    if (open) {
      mine.value = [...(columns.mine ?? COLUMN_KEYS)]
      publicColumns.value = [...columns.publicColumns]
    }
  })

  /** every column for me, the public list as it always was – still to be saved */
  function reset (): void {
    mine.value = [...COLUMN_KEYS]
    publicColumns.value = [...PUBLIC_DEFAULT]
  }

  async function save (): Promise<void> {
    if (!dirty.value) {
      return
    }

    busy.value = true
    const all = ordered(mine.value).length === COLUMN_KEYS.length

    // all of them is no choice at all – a column added later shows up by itself
    if (await columns.save(all ? null : ordered(mine.value), ordered(publicColumns.value))) {
      columns.dialogOpen = false
    }

    busy.value = false
  }
</script>

<style scoped>
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

/* the lock beside a box that can't change – the name always, the private columns never public */
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
