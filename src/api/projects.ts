import type { Category, Project, ProjectInput, TodoProject, TodoSummary, TodoTask } from '@/types'
import { request } from './client'

export const projectsApi = {
  list: () => request<Project[]>('GET', 'projects'),
  create: (input: ProjectInput & { name: string }) => request<Project>('POST', 'projects', input),
  update: (id: number, input: ProjectInput) => request<Project>('PATCH', `projects/${id}`, input),
  remove: (id: number) => request<{ deleted: boolean }>('DELETE', `projects/${id}`),
  /** these projects (one category) in this order; answers with all projects */
  reorder: (ids: number[]) => request<Project[]>('POST', 'projects/order', { ids }),
  /** a new reporter token – the old one stops working at once */
  token: (id: number) => request<Project>('POST', `projects/${id}/token`),
  /** open tasks of the linked Todo project */
  tasks: (id: number) => request<{ todo: TodoSummary | null, tasks: TodoTask[] }>('GET', `projects/${id}/tasks`),
}

export const categoriesApi = {
  list: () => request<Category[]>('GET', 'categories'),
  create: (name: string) => request<Category>('POST', 'categories', { name }),
  rename: (id: number, name: string) => request<Category>('PATCH', `categories/${id}`, { name }),
  remove: (id: number) => request<{ deleted: boolean }>('DELETE', `categories/${id}`),
  /** every category once, in the new order; answers with the list */
  reorder: (ids: number[]) => request<Category[]>('POST', 'categories/order', { ids }),
}

export const todoApi = {
  projects: () => request<TodoProject[]>('GET', 'todo-projects'),
}
