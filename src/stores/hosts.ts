import type { Host, HostInput } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { hostsApi } from '@/api/projects'
import { useNotifyStore } from './notify'
import { useProjectsStore } from './projects'

/**
 * The hosting accounts – one holds several projects, its data (hosting, panel, login and password, paid until, SSH)
 * typed once. The owner's only.
 */
export const useHostsStore = defineStore('hosts', () => {
  const notify = useNotifyStore()
  const projects = useProjectsStore()

  const items = ref<Host[]>([])
  /** the account in its dialog; 'new' – a new one */
  const editing = ref<Host | 'new' | null>(null)
  /** loaded once – till then the accounts' list shows its skeleton */
  const ready = ref(false)
  /** the account just created – the project dialog that asked for it picks it */
  const created = ref<Host | null>(null)

  const collator = new Intl.Collator('pl', { numeric: true, sensitivity: 'base' })
  const sorted = computed(() => items.value.toSorted((a, b) => collator.compare(a.name, b.name)))

  const byId = (id: number | null | undefined): Host | null => items.value.find(host => host.id === id) ?? null

  async function load (): Promise<void> {
    try {
      items.value = await hostsApi.list()
      ready.value = true
    } catch (error) {
      notify.error(error)
    }
  }

  /** the account's projects show its hosting, panel and account at once – as the server does */
  function spread (host: Host): void {
    projects.items = projects.items.map(project => project.hostId === host.id
      ? { ...project, server: host.server, serverUrl: host.serverUrl, serverAccount: host.serverAccount }
      : project)
  }

  /** creates or saves an account; the password – undefined: kept, '' – removed */
  async function save (id: number | null, input: HostInput, password?: string): Promise<Host | null> {
    try {
      let host = id ? await hostsApi.update(id, input) : await hostsApi.create(input)

      if (password !== undefined) {
        host = await hostsApi.setPassword(host.id, password || null)
      }

      items.value = [...items.value.filter(item => item.id !== host.id), host]
      spread(host)

      if (!id) {
        created.value = host
      }

      return host
    } catch (error) {
      notify.error(error)

      return null
    }
  }

  async function remove (id: number): Promise<boolean> {
    try {
      await hostsApi.remove(id)
      items.value = items.value.filter(item => item.id !== id)
      projects.items = projects.items.map(project => project.hostId === id ? { ...project, hostId: null } : project)
      notify.show('Konto usunięte – jego projekty są teraz bez konta.')

      return true
    } catch (error) {
      notify.error(error)

      return false
    }
  }

  /** the account's panel password – kept encrypted, fetched only when asked */
  async function password (id: number): Promise<string | null> {
    try {
      return (await hostsApi.password(id)).password
    } catch (error) {
      notify.error(error)

      return null
    }
  }

  return { items, editing, ready, created, sorted, byId, load, save, remove, password }
})
