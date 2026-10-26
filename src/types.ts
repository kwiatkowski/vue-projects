export type Status = 'online' | 'dev' | 'suspended' | 'offline'

/** Yes/no fields of a project – the checkmark columns. */
export const FLAGS = ['deploy', 'dev', 'bedrock', 'security', 'acf', 'miModal'] as const

export type Flag = typeof FLAGS[number]

/** A category of the list – the projects are grouped by it, in the user's order. */
export interface Category {
  id: number
  name: string
  position: number | null
}

/** A project of the Todo app – one can be linked to a project of the list. */
export interface TodoProject {
  id: number
  name: string
  color: string
  /** the project in the Todo app */
  url: string
}

/** The linked Todo project with how much is left there. */
export interface TodoSummary extends TodoProject {
  open: number
  overdue: number
}

export interface TodoTask {
  id: number
  title: string
  status: 'todo' | 'doing' | 'done'
  start: string | null
  due: string | null
  time: string | null
  priority: 'none' | 'low' | 'medium' | 'high'
}

/**
 * A project as the owner sees it. The public list has only `id`, `name`, `categoryId`, `position` and the public
 * fields (domain, status, engine, version, theme) – the rest is missing there, not null.
 */
export interface Project extends Record<Flag, boolean> {
  id: number
  name: string
  categoryId: number | null
  /** the user's order within the category; null – never placed (last, by name) */
  position: number | null
  domain: string | null
  status: Status | null
  server: string | null
  serverUrl: string | null
  serverAccount: string | null
  php: string | null
  engine: string | null
  version: string | null
  theme: string | null
  repo: string | null
  localUrl: string | null
  /** RRRR-MM-DD */
  dbSync: string | null
  listed: boolean
  /** id of the linked Todo project */
  todoProject: number | null
  todo?: TodoSummary | null
  notes: string | null
  /** ISO 8601 – the last report the site sent about itself */
  reportedAt: string | null
  token: string | null
  updatedAt: string | null
}

/** What the API takes: any field, null clears it. */
export type ProjectInput = Partial<Omit<Project, 'id' | 'position' | 'todo' | 'reportedAt' | 'token' | 'updatedAt'>>

export type SortKey = 'name' | 'status' | 'server' | 'php' | 'version' | 'theme' | 'dbSync' | 'reportedAt'
