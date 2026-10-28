import type { Category, Project } from '@/types'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  projects: [] as Array<Partial<Project>>,
  categories: [] as Category[],
  changedAt: '1',
}))

vi.mock('@/api/projects', () => ({
  projectsApi: { list: async () => structuredClone(api.projects), changed: async () => ({ changedAt: api.changedAt }) },
  categoriesApi: { list: async () => structuredClone(api.categories) },
  todoApi: { projects: async () => [] },
}))

const { useProjectsStore } = await import('./projects')

// a background tab or the visible one – what document.hidden says
let hidden = false
const visibilityListeners = new Set<() => void>()

function showTab (): void {
  hidden = false
  for (const listener of visibilityListeners) {
    listener()
  }
  visibilityListeners.clear()
}

describe('refresh', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    hidden = false
    visibilityListeners.clear()
    vi.stubGlobal('document', {
      get hidden () {
        return hidden
      },
      addEventListener: (_: string, listener: () => void) => visibilityListeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => visibilityListeners.delete(listener),
    })
    setActivePinia(createPinia())
    api.projects = [{ id: 1, name: 'a.pl', php: '8.2' }, { id: 2, name: 'b.pl', php: '8.3' }]
    api.categories = []
    api.changedAt = '1'
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('changes nothing when nothing changed', async () => {
    const store = useProjectsStore()
    await store.load()
    const before = store.items

    await store.refresh()

    expect(store.items).toBe(before)
    expect(store.changed.size).toBe(0)
  })

  it('highlights the changed row and its changed fields for 1 s, then fades it out', async () => {
    const store = useProjectsStore()
    await store.load()
    api.projects[1]!.php = '8.4'

    await store.refresh()

    expect(store.items.find(item => item.id === 2)?.php).toBe('8.4')
    expect([...store.changed.keys()]).toEqual([2])
    expect([...store.changed.get(2)!]).toEqual(['php'])

    vi.advanceTimersByTime(999)
    expect(store.changed.size).toBe(1)

    vi.advanceTimersByTime(1)
    expect(store.changed.size).toBe(0)
    expect([...store.fading]).toEqual([2])

    vi.advanceTimersByTime(1000)
    expect(store.fading.size).toBe(0)
  })

  it('brings the changed rows in one under another, a second apart', async () => {
    const store = useProjectsStore()
    api.projects = [{ id: 1, name: 'a.pl', php: '8.2', position: 2 }, { id: 2, name: 'b.pl', php: '8.2', position: 1 }]
    await store.load()
    api.projects[0]!.php = '8.4'
    api.projects[1]!.php = '8.4'

    await store.refresh()

    // b.pl is higher in the list – it comes first, a.pl still shows the old version
    expect([...store.changed.keys()]).toEqual([2])
    expect(store.items.find(item => item.id === 1)?.php).toBe('8.2')

    vi.advanceTimersByTime(1000)
    expect([...store.changed.keys()]).toEqual([1])
    expect(store.items.find(item => item.id === 1)?.php).toBe('8.4')
  })

  it('a refresh while the rows come in neither drops nor repeats them', async () => {
    const store = useProjectsStore()
    await store.load()
    api.projects[0]!.php = '8.4'
    api.projects[1]!.php = '8.4'

    await store.refresh()
    expect(await store.refresh()).toBe(true)
    expect([...store.changed.keys()]).toEqual([1])

    vi.advanceTimersByTime(1000)
    expect([...store.changed.keys()]).toEqual([2])
    expect(store.items.map(item => item.php)).toEqual(['8.4', '8.4'])

    vi.advanceTimersByTime(3000)
    expect(store.changed.size).toBe(0)
  })

  it('brings a project without a token in quietly – no highlight, no turn', async () => {
    const store = useProjectsStore()
    api.projects = [{ id: 1, name: 'a.pl', token: null, ssl: null }, { id: 2, name: 'b.pl', token: 'x', php: '8.2' }]
    await store.load()
    api.projects[0]!.ssl = { ok: true, error: null, validTo: null, issuer: null, checkedAt: '2026-10-28 12:00:00' }
    api.projects[1]!.php = '8.4'

    await store.refresh()

    expect([...store.changed.keys()]).toEqual([2])
    expect(store.items.find(item => item.id === 1)?.ssl?.ok).toBe(true)
  })

  it('keeps the changes while the tab is in the background, until it is shown', async () => {
    const store = useProjectsStore()
    await store.load()
    hidden = true
    api.projects[0]!.php = '8.3'

    await store.refresh()
    vi.advanceTimersByTime(60_000)
    expect(store.changed.size).toBe(0)
    expect(store.items[0]?.php).toBe('8.2')

    showTab()
    expect([...store.changed.keys()]).toEqual([1])
    expect(store.items[0]?.php).toBe('8.3')
    vi.advanceTimersByTime(1000)
    expect(store.changed.size).toBe(0)
  })

  it('refreshes only when the server says the list changed', async () => {
    const store = useProjectsStore()
    await store.load()
    api.projects[0]!.php = '8.4'

    await store.checkChanged()
    expect(store.items[0]?.php).toBe('8.2')

    api.changedAt = '2'
    await store.checkChanged()
    expect(store.items[0]?.php).toBe('8.4')
    expect([...store.changed.keys()]).toEqual([1])
  })

  it('collects every changed field, a new project as \'*\'', async () => {
    const store = useProjectsStore()
    await store.load()
    api.projects[0] = { ...api.projects[0], php: '8.4', theme: 'Betheme' }
    api.projects.push({ id: 3, name: 'c.pl' })

    await store.refresh()

    expect([...store.changed.get(1)!].toSorted()).toEqual(['php', 'theme'])

    vi.advanceTimersByTime(1000)
    expect([...store.changed.get(3)!]).toEqual(['*'])
    expect(store.items.map(item => item.id)).toEqual([1, 2, 3])
  })
})
