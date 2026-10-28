import type { ColumnKey } from '@/utils/columns'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { columnsApi, viewerApi } from '@/api/projects'
import { config } from '@/config'
import { COLUMN_KEYS, PUBLIC_DEFAULT } from '@/utils/columns'
import { useNotifyStore } from './notify'

/**
 * Which columns the list shows: the owner – all; a viewer (the list's own account) and a guest – what the owner chose
 * for each. The "Wyświetl" dialog sets both, and the viewer account's login and password.
 */
export const useColumnsStore = defineStore('columns', () => {
  const notify = useNotifyStore()

  const viewerColumns = ref<ColumnKey[]>(config.columns.viewer ?? PUBLIC_DEFAULT)
  const guestColumns = ref<ColumnKey[]>(config.columns.guest ?? PUBLIC_DEFAULT)
  /** the viewer account's login; null – none */
  const viewerLogin = ref<string | null>(config.viewerLogin)
  const dialogOpen = ref(false)

  /** what this list shows */
  const visible = computed(() => new Set<ColumnKey>(config.canManage ? COLUMN_KEYS : config.columns.visible))

  /**
   * Saves the columns, and the account when it changed (`account` – undefined: untouched). Resolves to whether all
   * of it was saved (an error – a toast).
   */
  async function save (viewer: ColumnKey[], guest: ColumnKey[], account?: { login: string, password: string | null }): Promise<boolean> {
    try {
      const saved = await columnsApi.save(viewer, guest)
      viewerColumns.value = saved.viewer
      guestColumns.value = saved.guest

      if (account) {
        viewerLogin.value = (await viewerApi.account(account.login, account.password)).login
      }

      notify.show('Ustawienia widoku zapisane.')

      return true
    } catch (error) {
      notify.error(error)

      return false
    }
  }

  return { viewerColumns, guestColumns, viewerLogin, dialogOpen, visible, save }
})
