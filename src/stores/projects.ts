import type { Category, Project, ProjectInput, TodoProject } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { categoriesApi, projectsApi, todoApi } from '@/api/projects'
import { config } from '@/config'
import { compareManual, moveId } from '@/utils/projects'
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

  async function load (): Promise<void> {
    status.value = 'loading'

    try {
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

  return {
    items,
    categories,
    sortedCategories,
    todoProjects,
    status,
    loadError,
    editing,
    editingCategory,
    load,
    add,
    update,
    remove,
    regenerateToken,
    moveProject,
    addCategory,
    renameCategory,
    removeCategory,
    moveCategory,
    shiftCategory,
  }
})
