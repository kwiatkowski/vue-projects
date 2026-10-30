import type { Category, PasswordKind, Project, ProjectInput, TodoProject, UpdateScope } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { categoriesApi, projectsApi, todoApi } from '@/api/projects'
import { config } from '@/config'
import { compareManual, groupProjects, moveId, newestReporters, newestWordpress, updateScope } from '@/utils/projects'
import { useNotifyStore } from './notify'

/**
 * The list of projects – full for the owner, the public part for everyone else (the server decides) –
 * its categories and, for the owner, the Todo projects one can link.
 */
export const useProjectsStore = defineStore('projects', () => {
  const notify = useNotifyStore()

  const items = ref<Project[]>([])
  const categories = ref<Category[]>([])
  const todoProjects = ref<TodoProject[]>([])
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const loadError = ref<string | null>(null)

  /** the project in the edit dialog; 'new' – a new one */
  const editing = ref<Project | 'new' | null>(null)
  /** the category in its dialog; 'new' – a new one */
  const editingCategory = ref<Category | 'new' | null>(null)

  const sortedCategories = computed(() => categories.value.toSorted(compareManual))

  /** the newest WordPress – wordpress.org's, or a newer one a site already reports */
  const latestWordpress = computed(() => newestWordpress(config.latestWordpress, items.value))
  /** the newest plugin_meden and MK Core – the sites on an older one are marked */
  const latestReporters = computed(() => newestReporters(items.value, config.mkCoreVersion))

  /**
   * Projects a refresh found changed (or new) → the fields that changed ('*' – a new project). The table highlights
   * the row and blurs those cells under a spinner for SHOW_MS, then the row is `fading` for the fade-out.
   */
  const changed = ref<Map<number, Set<string>>>(new Map())
  const fading = ref<Set<number>>(new Set())
  const settleTimers = new Map<number, ReturnType<typeof setTimeout>>()

  const SHOW_MS = 1000
  const FADE_MS = 1000
  /** the next changed row comes in this much later – one under another, not the whole list at once */
  const STEP_MS = 1000

  function highlight (id: number, fields: Set<string>): void {
    changed.value = new Map(changed.value).set(id, new Set([...changed.value.get(id) ?? [], ...fields]))
    fading.value = new Set([...fading.value].filter(item => item !== id))
    clearTimeout(settleTimers.get(id))
    settleTimers.set(id, setTimeout(() => {
      const rest = new Map(changed.value)
      rest.delete(id)
      changed.value = rest
      fading.value = new Set(fading.value).add(id)
      settleTimers.set(id, setTimeout(() => {
        fading.value = new Set([...fading.value].filter(item => item !== id))
        settleTimers.delete(id)
      }, FADE_MS))
    }, SHOW_MS))
  }

  /**
   * The changed projects still waiting for their turn, in the list's order: the row keeps what it showed until then.
   * One comes in every STEP_MS while the tab is visible (a change that came in a background tab waits for it).
   */
  let queue: Array<{ project: Project, fields: Set<string> }> = []
  let stepTimer: ReturnType<typeof setTimeout> | undefined
  /** a list a step made → the one before it: a refresh on the way still counts after the steps alone */
  const steppedFrom = new WeakMap<Project[], Project[]>()

  function step (): void {
    stepTimer = undefined
    document.removeEventListener('visibilitychange', step)

    if (document.hidden) {
      if (queue.length > 0) {
        document.addEventListener('visibilitychange', step, { once: true })
      }

      return
    }

    const [entry, ...rest] = queue
    queue = rest

    if (!entry) {
      return
    }

    const before = items.value
    const shown = before.some(item => item.id === entry.project.id)

    // a project removed meanwhile stays removed
    if (shown || entry.fields.has('*')) {
      items.value = shown ? before.map(item => item.id === entry.project.id ? entry.project : item) : [...before, entry.project]
      steppedFrom.set(items.value, before)
      highlight(entry.project.id, entry.fields)
    }

    stepTimer = setTimeout(step, STEP_MS)
  }

  /** whether only the queue's steps changed the list since `before` – no edit of the user's */
  function onlySteps (before: Project[]): boolean {
    let list: Project[] | undefined = items.value

    while (list && list !== before) {
      list = steppedFrom.get(list)
    }

    return list === before
  }

  /** when the server's list last changed (GET /changed) – as of the data shown */
  let changedAt: string | null = null

  async function load (): Promise<void> {
    status.value = 'loading'

    try {
      changedAt = await projectsApi.changed().then(result => result.changedAt).catch(() => null)
      ;[items.value, categories.value] = await Promise.all([projectsApi.list(), categoriesApi.list()])
      status.value = 'ready'
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : 'Nie udało się wczytać projektów.'
      status.value = 'error'
    }

    if (config.canManage) {
      // without them the list still works – only linking to Todo doesn't
      todoProjects.value = await todoApi.projects().catch(() => [])
    }
  }

  /**
   * Asks the server whether the list changed since it was fetched (a tiny request, every few seconds) and refreshes
   * it only then – a site's report shows up at once.
   */
  async function checkChanged (): Promise<void> {
    if (status.value !== 'ready') {
      return
    }

    const now = await projectsApi.changed().then(result => result.changedAt).catch(() => null)

    if (now !== null && now !== changedAt && await refresh()) {
      changedAt = now
    }
  }

  /**
   * Fetches the list again without any loading state; only what really changed is replaced (and flashed). Skipped
   * when the list isn't loaded yet, and dropped when the user changed something while it was on the way.
   * Resolves to whether the list is now the server's (false – failed or dropped, try again later).
   */
  async function refresh (): Promise<boolean> {
    if (status.value !== 'ready') {
      return false
    }

    const itemsBefore = items.value
    const categoriesBefore = categories.value
    let fresh: [Project[], Category[]]

    try {
      fresh = await Promise.all([projectsApi.list(), categoriesApi.list()])
    } catch {
      // the next check tries again – no toast for a background one
      return false
    }

    if (!onlySteps(itemsBefore) || categories.value !== categoriesBefore) {
      return false
    }

    const [freshItems, freshCategories] = fresh

    if (JSON.stringify(freshCategories) !== JSON.stringify(categoriesBefore)) {
      categories.value = freshCategories
    }

    // compared with the list as it will be once the waiting rows come in
    const waiting = new Map(queue.map(entry => [entry.project.id, entry]))
    const shown = new Map(items.value.map(item => [item.id, item]))
    const known = new Map([...shown, ...[...waiting].map(([id, entry]) => [id, entry.project] as const)])
    const found = new Map<number, Set<string>>()
    let anyChange = false

    for (const item of freshItems) {
      const fields = changedFields(known.get(item.id), item)
      anyChange ||= fields.size > 0

      // a project without a token (the report not configured) changes only by the list's own checks (the certificate,
      // the staging) – it comes in quietly, without a highlight and without taking a turn; a new one is shown anyway
      if (fields.size > 0 && (!unconfigured(item) || fields.has('*'))) {
        found.set(item.id, fields)
      }
    }

    if (!anyChange && freshItems.length === known.size) {
      return true
    }

    // the waiting ones and the new changes – the fresh version, every changed field, in the list's order
    const freshById = new Map(freshItems.map(item => [item.id, item]))
    const order = groupProjects(freshItems, categories.value).flatMap(group => group.projects.map(project => project.id))

    for (const [id, fields] of found) {
      waiting.set(id, { project: freshById.get(id)!, fields: new Set([...waiting.get(id)?.fields ?? [], ...fields]) })
    }

    queue = [...waiting.values()]
      .filter(entry => freshById.has(entry.project.id))
      .map(entry => ({ project: freshById.get(entry.project.id)!, fields: entry.fields }))
      .toSorted((a, b) => order.indexOf(a.project.id) - order.indexOf(b.project.id))

    // a waiting row keeps what it shows now; a new project comes in on its turn
    const queued = new Set(queue.map(entry => entry.project.id))

    items.value = freshItems
      .filter(item => !queued.has(item.id) || shown.has(item.id))
      .map(item => queued.has(item.id) ? shown.get(item.id)! : item)

    if (stepTimer === undefined) {
      step()
    }

    return true
  }

  /** the owner's list without the project's token – the public one has no `token` at all */
  function unconfigured (project: Project): boolean {
    return 'token' in project && !project.token
  }

  /** The fields of `before` and `after` that differ; '*' when there was no `before` (a new project). */
  function changedFields (before: Project | undefined, after: Project): Set<string> {
    if (!before) {
      return new Set(['*'])
    }

    const keys = new Set([...Object.keys(before), ...Object.keys(after)]) as Set<keyof Project>

    return new Set([...keys].filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key])))
  }

  function replace (project: Project): void {
    items.value = items.value.some(item => item.id === project.id)
      ? items.value.map(item => item.id === project.id ? project : item)
      : [...items.value, project]
  }

  /** Resolves to the saved project, or null on error (shown as a toast). */
  async function add (input: ProjectInput & { name: string }): Promise<Project | null> {
    try {
      const project = await projectsApi.create(input)
      replace(project)
      notify.show(`Dodano „${project.name}”.`)

      return project
    } catch (error) {
      notify.error(error)

      return null
    }
  }

  async function update (id: number, changes: ProjectInput): Promise<Project | null> {
    try {
      const project = await projectsApi.update(id, changes)
      replace(project)

      return project
    } catch (error) {
      notify.error(error)

      return null
    }
  }

  async function remove (id: number): Promise<boolean> {
    try {
      const name = items.value.find(item => item.id === id)?.name ?? ''
      await projectsApi.remove(id)
      items.value = items.value.filter(item => item.id !== id)
      notify.show(`„${name}” w koszu – przywrócisz go w panelu WordPressa.`)

      return true
    } catch (error) {
      notify.error(error)

      return false
    }
  }

  /** The panel password, saved apart from the other fields (encrypted on the server). */
  async function setPassword (id: number, password: string | null, kind: PasswordKind = 'panel'): Promise<Project | null> {
    try {
      const project = await projectsApi.setPassword(id, password, kind)
      replace(project)

      return project
    } catch (error) {
      notify.error(error)

      return null
    }
  }

  /** sites whose report is being fetched – their report mark spins (in the table, its popup, the dialog) */
  const pulling = ref<Set<number>>(new Set())

  /** a fetch shows its spinning at least this long – the list's own site answers in a fifth of a second */
  const PULL_SHOWN_MS = 700

  /** Fetches the site's report now; resolves to the project after it and why the report didn't come (null – it did). */
  async function pullReport (id: number): Promise<{ project: Project, error: string | null } | null> {
    pulling.value = new Set(pulling.value).add(id)
    const started = Date.now()

    try {
      const result = await projectsApi.pullReport(id)
      replace(result.project)

      return { project: result.project, error: result.ok === false ? (result.error ?? 'brak raportu') : null }
    } catch (error) {
      notify.error(error)

      return null
    } finally {
      await new Promise(resolve => setTimeout(resolve, Math.max(0, PULL_SHOWN_MS - (Date.now() - started))))
      const next = new Set(pulling.value)
      next.delete(id)
      pulling.value = next
    }
  }

  async function regenerateToken (id: number): Promise<Project | null> {
    try {
      const project = await projectsApi.token(id)
      replace(project)

      return project
    } catch (error) {
      notify.error(error)

      return null
    }
  }

  async function removeToken (id: number): Promise<Project | null> {
    try {
      const project = await projectsApi.removeToken(id)
      replace(project)

      return project
    } catch (error) {
      notify.error(error)

      return null
    }
  }

  /**
   * Drops project `id` into `categoryId` (null = none), next to `targetId` (before, or after with `after`; null – at
   * the end). The list changes at once; the server gets the new category, then the order of that category.
   */
  async function moveProject (id: number, categoryId: number | null, targetId: number | null, after = false): Promise<void> {
    const project = items.value.find(item => item.id === id)

    if (!project || targetId === id) {
      return
    }

    const before = items.value.map(item => ({ ...item }))
    const changesCategory = (project.categoryId ?? null) !== categoryId
    const siblings = items.value.filter(item => (item.categoryId ?? null) === categoryId).toSorted(compareManual).map(item => item.id)
    const order = moveId(siblings, id, targetId, after)

    items.value = items.value.map(item => {
      const position = order.indexOf(item.id)

      return position === -1 ? item : { ...item, categoryId, position }
    })

    try {
      if (changesCategory) {
        await projectsApi.update(id, { categoryId })
      }

      items.value = await projectsApi.reorder(order)
    } catch (error) {
      items.value = before
      notify.error(error)
    }
  }

  async function addCategory (name: string): Promise<Category | null> {
    try {
      const category = await categoriesApi.create(name)
      categories.value = await categoriesApi.list().catch(() => [...categories.value, category])

      return category
    } catch (error) {
      notify.error(error)

      return null
    }
  }

  async function renameCategory (id: number, name: string): Promise<boolean> {
    try {
      const category = await categoriesApi.rename(id, name)
      categories.value = categories.value.map(item => item.id === id ? category : item)

      return true
    } catch (error) {
      notify.error(error)

      return false
    }
  }

  async function removeCategory (id: number): Promise<boolean> {
    try {
      await categoriesApi.remove(id)
      categories.value = categories.value.filter(item => item.id !== id)
      items.value = items.value.map(item => item.categoryId === id ? { ...item, categoryId: null } : item)
      notify.show('Kategoria usunięta – jej projekty są teraz bez kategorii.')

      return true
    } catch (error) {
      notify.error(error)

      return false
    }
  }

  /** Category `id` next to `targetId` (before, or after with `after`) – at once, then on the server. */
  async function moveCategory (id: number, targetId: number, after = false): Promise<void> {
    if (id === targetId) {
      return
    }

    const before = categories.value
    const order = moveId(sortedCategories.value.map(category => category.id), id, targetId, after)

    categories.value = categories.value.map(category => ({ ...category, position: order.indexOf(category.id) }))

    try {
      categories.value = await categoriesApi.reorder(order)
    } catch (error) {
      categories.value = before
      notify.error(error)
    }
  }

  /** One step up (-1) or down (1) – the menu of a category, also on touch screens. */
  function shiftCategory (id: number, step: -1 | 1): void {
    const ids = sortedCategories.value.map(category => category.id)
    const target = ids[ids.indexOf(id) + step]

    if (target !== undefined) {
      void moveCategory(id, target, step === 1)
    }
  }

  /** sites updating themselves (Composer / the plugins), started from the table – their dot spins until it ends */
  const updating = ref<Set<number>>(new Set())

  /** `quiet` – no toasts of its own (a batch says it at the end); resolves to how it ended: done, nothing, failed */
  async function runUpdate (id: number, scope: UpdateScope = 'all', quiet = false): Promise<'done' | 'nothing' | 'failed'> {
    const name = items.value.find(item => item.id === id)?.name ?? ''
    let result: 'done' | 'nothing' | 'failed' = 'failed'

    try {
      let state = await projectsApi.startUpdate(id, scope)
      updating.value = new Set(updating.value).add(id)

      if (!quiet) {
        notify.show(`${name}: aktualizacja uruchomiona.`)
      }

      while (state.state === 'running') {
        await new Promise(resolve => setTimeout(resolve, 4000))
        state = await projectsApi.updateState(id)
      }

      result = state.state === 'nothing' ? 'nothing' : (state.state === 'failed' ? 'failed' : 'done')

      if (state.state === 'failed') {
        notify.show(`${name}: aktualizacja się nie udała – log w oknie projektu (Raport strony).`, { tone: 'error' })
      } else if (!quiet) {
        notify.show(state.state === 'nothing' ? `${name}: nic nowego do zainstalowania.` : `${name}: zaktualizowano.`)
      }

      // the site's new report, fetched now – the site sends one itself, but not always (the list's own site: its
      // `wp projects-report` is the list's); the mark and the list of updates follow
      if (state.state !== 'failed') {
        const pulled = await projectsApi.pullReport(id).catch(() => null)

        if (pulled) {
          replace(pulled.project)
        }
      }

      await refresh()
    } catch (error) {
      notify.error(error)
    } finally {
      const next = new Set(updating.value)
      next.delete(id)
      updating.value = next
    }

    return result
  }

  // ---- several projects at once: the ones ticked in the table, or "Aktualizuj wszystkie"

  /** the projects ticked in the table (the owner's) */
  const selected = ref<Set<number>>(new Set())

  function toggleSelected (id: number, on = !selected.value.has(id)): void {
    const next = new Set(selected.value)

    if (on) {
      next.add(id)
    } else {
      next.delete(id)
    }

    selected.value = next
  }

  function setSelected (ids: number[]): void {
    selected.value = new Set(ids)
  }

  /** runs `task` for every id, `limit` at a time */
  async function inTurn<T> (ids: number[], limit: number, task: (id: number) => Promise<T>): Promise<T[]> {
    const results: T[] = []
    const queue = [...ids]

    await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, async () => {
      while (queue.length > 0) {
        results.push(await task(queue.shift() as number))
      }
    }))

    return results
  }

  /** a batch running – its name and how far it got, for the bar above the table */
  const batch = ref<{ label: string, done: number, total: number } | null>(null)

  /** the sites' reports, now – 4 at a time; one toast at the end */
  async function pullReports (ids: number[]): Promise<void> {
    batch.value = { label: 'Aktualizuję raporty', done: 0, total: ids.length }

    const results = await inTurn(ids, 4, async id => {
      const result = await projectsApi.pullReport(id).catch(() => null)

      if (result) {
        replace(result.project)
      }

      batch.value = batch.value && { ...batch.value, done: batch.value.done + 1 }

      return result?.ok !== false && result !== null
    })

    batch.value = null
    const failed = results.filter(ok => !ok).length
    notify.show(failed ? `Raporty: ${results.length - failed} pobrane, ${failed} nie przyszło.` : `Raporty pobrane: ${results.length}.`, failed ? { tone: 'error' } : undefined)
  }

  /**
   * The sites' updates – each with what it waits for (everything, or the translations alone); 2 at a time (Composer
   * is heavy, several sites share a server). One toast at the end, the failed ones by name.
   */
  async function runUpdates (ids: number[]): Promise<void> {
    const todo = ids.filter(id => {
      const project = items.value.find(item => item.id === id)

      return project && updateScope(project, latestWordpress.value) !== null && !updating.value.has(id)
    })

    if (todo.length === 0) {
      return
    }

    batch.value = { label: 'Aktualizuję strony', done: 0, total: todo.length }

    const results = await inTurn(todo, 2, async id => {
      const project = items.value.find(item => item.id === id)
      const result = await runUpdate(id, project ? updateScope(project, latestWordpress.value) ?? 'all' : 'all', true)
      batch.value = batch.value && { ...batch.value, done: batch.value.done + 1 }

      return result
    })

    batch.value = null
    const done = results.filter(result => result === 'done').length
    const failed = results.filter(result => result === 'failed').length
    notify.show(`Aktualizacje: ${done} zaktualizowane${failed ? `, ${failed} nieudane` : ''}${results.length - done - failed ? `, ${results.length - done - failed} bez zmian` : ''}.`, failed ? { tone: 'error' } : undefined)
  }

  return {
    items,
    latestWordpress,
    latestReporters,
    updating,
    runUpdate,
    selected,
    toggleSelected,
    setSelected,
    batch,
    pullReports,
    runUpdates,
    categories,
    sortedCategories,
    changed,
    fading,
    todoProjects,
    status,
    loadError,
    editing,
    editingCategory,
    load,
    refresh,
    checkChanged,
    add,
    update,
    remove,
    regenerateToken,
    pulling,
    pullReport,
    removeToken,
    setPassword,
    moveProject,
    addCategory,
    renameCategory,
    removeCategory,
    moveCategory,
    shiftCategory,
  }
})
