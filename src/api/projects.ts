import type { Category, PasswordKind, Project, ProjectInput, SiteReport, TodoProject, TodoSummary, TodoTask } from '@/types'
import { request } from './client'

export const projectsApi = {
  list: () => request<Project[]>('GET', 'projects'),
  /** when the list last changed on the server – polled to refresh it at once */
  changed: () => request<{ changedAt: string }>('GET', 'changed'),
  create: (input: ProjectInput & { name: string }) => request<Project>('POST', 'projects', input),
  update: (id: number, input: ProjectInput) => request<Project>('PATCH', `projects/${id}`, input),
  remove: (id: number) => request<{ deleted: boolean }>('DELETE', `projects/${id}`),
  /** these projects (one category) in this order; answers with all projects */
  reorder: (ids: number[]) => request<Project[]>('POST', 'projects/order', { ids }),
  /** a password – the panel's or Basic Auth's (kept encrypted, sent only on request) */
  password: (id: number, kind: PasswordKind = 'panel') => request<{ password: string | null }>('GET', `projects/${id}/password?kind=${kind}`),
  /** sets a password; empty or null removes it; answers with the project */
  setPassword: (id: number, password: string | null, kind: PasswordKind = 'panel') => request<Project>('POST', `projects/${id}/password`, { password, kind }),
  /** a new reporter token – the old one stops working at once */
  token: (id: number) => request<Project>('POST', `projects/${id}/token`),
  /** open tasks of the linked Todo project */
  tasks: (id: number) => request<{ todo: TodoSummary | null, tasks: TodoTask[] }>('GET', `projects/${id}/tasks`),
  /** the last report of the site, as it came */
  report: (id: number) => request<{ reportedAt: string | null, report: SiteReport | null }>('GET', `projects/${id}/report`),
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
