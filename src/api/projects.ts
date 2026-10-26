import type { Project, ProjectInput } from '@/types'
import { request } from './client'

export const projectsApi = {
  list: () => request<Project[]>('GET', 'projects'),
  create: (input: ProjectInput & { name: string }) => request<Project>('POST', 'projects', input),
  update: (id: number, input: ProjectInput) => request<Project>('PATCH', `projects/${id}`, input),
  remove: (id: number) => request<{ deleted: boolean }>('DELETE', `projects/${id}`),
  /** a new reporter token – the old one stops working at once */
  token: (id: number) => request<Project>('POST', `projects/${id}/token`),
}
