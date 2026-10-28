import type { ColumnKey } from '@/utils/columns'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { columnsApi, viewerApi } from '@/api/projects'
import { config } from '@/config'
import { COLUMN_KEYS, PUBLIC_DEFAULT } from '@/utils/columns'
import { useNotifyStore } from './notify'

/** the columns this browser hides – its own choice under "Wyświetl" */
const HIDDEN_KEY = 'projects.hiddenColumns'

function readHidden (): ColumnKey[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]')

    return Array.isArray(saved) ? COLUMN_KEYS.filter(key => key !== 'name' && saved.includes(key)) : []
  } catch {
    return []
  }
}

/**
 * Which columns the list shows. What one may see: the owner – all; a viewer (the list's own account) and a guest – what
 * the owner chose for each under "Ustawienia" (the server sends only those columns' data). Of that, "Wyświetl" hides
 * what this browser doesn't want to see.
 */
export const useColumnsStore = defineStore('columns', () => {
  const notify = useNotifyStore()

  const viewerColumns = ref<ColumnKey[]>(config.columns.viewer ?? PUBLIC_DEFAULT)
  const guestColumns = ref<ColumnKey[]>(config.columns.guest ?? PUBLIC_DEFAULT)
  /** the viewer account's login; null – none */
  const viewerLogin = ref<string | null>(config.viewerLogin)
  const hidden = ref<ColumnKey[]>(readHidden())
  /** "Wyświetl" – this browser's columns */
  const viewOpen = ref(false)
  /** "Ustawienia" – the owner's: the account and who may see which columns */
  const settingsOpen = ref(false)

  /** what this list may show */
  const available = computed<ColumnKey[]>(() => config.canManage ? [...COLUMN_KEYS] : config.columns.visible)
  /** what it shows – the name always */
  const visible = computed(() => new Set<ColumnKey>(available.value.filter(key => key === 'name' || !hidden.value.includes(key))))

  /** Hides or shows a column in this browser. */
  function setHidden (key: ColumnKey, hide: boolean): void {
    hidden.value = hide ? [...new Set([...hidden.value, key])] : hidden.value.filter(item => item !== key)

    try {
      localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden.value))
    } catch {
      // a private window or blocked storage – the choice lasts until the page reloads
    }
  }

  function showAll (): void {
    for (const key of hidden.value) {
      setHidden(key, false)
    }
  }

  /**
   * Saves the viewers' and the guests' columns, and the account when it changed (`account` – undefined: untouched).
   * Resolves to whether all of it was saved (an error – a toast).
   */
  async function save (viewer: ColumnKey[], guest: ColumnKey[], account?: { login: string, password: string | null }): Promise<boolean> {
    try {
      const saved = await columnsApi.save(viewer, guest)
      viewerColumns.value = saved.viewer
      guestColumns.value = saved.guest

      if (account) {
        viewerLogin.value = (await viewerApi.account(account.login, account.password)).login
      }

      notify.show('Ustawienia zapisane.')

      return true
    } catch (error) {
      notify.error(error)

      return false
    }
  }

  return { viewerColumns, guestColumns, viewerLogin, hidden, viewOpen, settingsOpen, available, visible, setHidden, showAll, save }
})
