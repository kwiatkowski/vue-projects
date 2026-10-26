import type { Project, ProjectInput } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { projectsApi } from '@/api/projects'
import { useNotifyStore } from './notify'

/** The list of projects – full for the owner, the public part for everyone else (the server decides). */
export const useProjectsStore = defineStore('projects', () => {
  const notify = useNotifyStore()

  const items = ref<Project[]>([])
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const loadError = ref<string | null>(null)

  /** the project in the edit dialog; 'new' – a new one */
  const editing = ref<Project | 'new' | null>(null)

  async function load (): Promise<void> {
    status.value = 'loading'

    try {
      items.value = await projectsApi.list()
      status.value = 'ready'
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : 'Nie udało się wczytać projektów.'
      status.value = 'error'
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

  return { items, status, loadError, editing, load, add, update, remove, regenerateToken }
})
