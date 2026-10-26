export type Status = 'online' | 'dev' | 'suspended' | 'offline'

/** Yes/no fields of a project – the checkmark columns. */
export const FLAGS = ['deploy', 'dev', 'bedrock', 'security', 'acf', 'miModal'] as const

export type Flag = typeof FLAGS[number]

/**
 * A project as the owner sees it. The public list has only `id`, `name` and the public fields
 * (domain, status, engine, version, theme) – the rest is missing there, not null.
 */
export interface Project extends Record<Flag, boolean> {
  id: number
  name: string
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
  inTodo: boolean
  notes: string | null
  /** ISO 8601 – the last report the site sent about itself */
  reportedAt: string | null
  token: string | null
  updatedAt: string | null
}

/** What the API takes: any field, null clears it. */
export type ProjectInput = Partial<Omit<Project, 'id' | 'reportedAt' | 'token' | 'updatedAt'>>

export type SortKey = 'name' | 'status' | 'server' | 'php' | 'version' | 'theme' | 'dbSync' | 'reportedAt'
