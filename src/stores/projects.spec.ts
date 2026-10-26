import type { Category, Project } from '@/types'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  projects: [] as Array<Partial<Project>>,
  categories: [] as Category[],
}))

vi.mock('@/api/projects', () => ({
  projectsApi: { list: async () => structuredClone(api.projects) },
  categoriesApi: { list: async () => structuredClone(api.categories) },
  todoApi: { projects: async () => [] },
}))

const { useProjectsStore } = await import('./projects')

// the window behind the terminal or in front – what document.hasFocus() answers
let focused = true
const focusListeners = new Set<() => void>()

function focusWindow (): void {
  focused = true
  for (const listener of focusListeners) {
    listener()
  }
  focusListeners.clear()
}

describe('refresh', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    focused = true
    focusListeners.clear()
    vi.stubGlobal('document', { hasFocus: () => focused })
    vi.stubGlobal('window', {
      addEventListener: (_: string, listener: () => void) => focusListeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => focusListeners.delete(listener),
    })
    setActivePinia(createPinia())
    api.projects = [{ id: 1, name: 'a.pl', php: '8.2' }, { id: 2, name: 'b.pl', php: '8.3' }]
    api.categories = []
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

  it('highlights the changed row and its changed fields for 10 s, then fades it out', async () => {
    const store = useProjectsStore()
    await store.load()
    api.projects[1]!.php = '8.4'

    await store.refresh()

    expect(store.items.find(item => item.id === 2)?.php).toBe('8.4')
    expect([...store.changed.keys()]).toEqual([2])
    expect([...store.changed.get(2)!]).toEqual(['php'])

    vi.advanceTimersByTime(9999)
    expect(store.changed.size).toBe(1)

    vi.advanceTimersByTime(1)
    expect(store.changed.size).toBe(0)
    expect([...store.fading]).toEqual([2])

    vi.advanceTimersByTime(1000)
    expect(store.fading.size).toBe(0)
  })

  it('keeps the highlight while the window is in the background, until it gets focus', async () => {
    const store = useProjectsStore()
    await store.load()
    focused = false
    api.projects[0]!.php = '8.3'

    await store.refresh()
    vi.advanceTimersByTime(60_000)
    expect([...store.changed.keys()]).toEqual([1])

    focusWindow()
    vi.advanceTimersByTime(10_000)
    expect(store.changed.size).toBe(0)
  })

  it('collects every changed field, a new project as \'*\'', async () => {
    const store = useProjectsStore()
    await store.load()
    api.projects[0] = { ...api.projects[0], php: '8.4', theme: 'Betheme' }
    api.projects.push({ id: 3, name: 'c.pl' })

    await store.refresh()

    expect([...store.changed.get(1)!].toSorted()).toEqual(['php', 'theme'])
    expect([...store.changed.get(3)!]).toEqual(['*'])
  })
})
