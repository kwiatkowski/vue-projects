import type { ColumnKey } from '@/utils/columns'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { columnsApi } from '@/api/projects'
import { config } from '@/config'
import { COLUMN_KEYS } from '@/utils/columns'
import { useNotifyStore } from './notify'

/**
 * Which columns the list shows – the owner's own choice (kept on their account) or, for everyone else, the public
 * list's. The "Wyświetl" dialog sets both.
 */
export const useColumnsStore = defineStore('columns', () => {
  const notify = useNotifyStore()

  /** null – never chosen, every column */
  const mine = ref<ColumnKey[] | null>(config.columns.mine)
  const publicColumns = ref<ColumnKey[]>(config.columns.public)
  const dialogOpen = ref(false)

  /** what this list shows */
  const visible = computed(() => new Set<ColumnKey>(config.canManage ? (mine.value ?? COLUMN_KEYS) : publicColumns.value))

  /** Resolves to whether they were saved (an error – a toast). */
  async function save (nextMine: ColumnKey[] | null, nextPublic: ColumnKey[]): Promise<boolean> {
    try {
      const saved = await columnsApi.save(nextMine, nextPublic)
      mine.value = saved.mine
      publicColumns.value = saved.public
      notify.show('Widoczne kolumny zapisane.')

      return true
    } catch (error) {
      notify.error(error)

      return false
    }
  }

  return { mine, publicColumns, dialogOpen, visible, save }
})
