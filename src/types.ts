export type Status = 'online' | 'dev' | 'suspended' | 'offline'

/** Yes/no fields of a project – the checkmark columns. */
export const FLAGS = ['deploy', 'dev', 'bedrock', 'security', 'acf', 'miModal'] as const

export type Flag = typeof FLAGS[number]

/** A category of the list – the projects are grouped by it, in the user's order. */
export interface Category {
  id: number
  name: string
  /** the address of the category's own list – /projects/{slug} */
  slug: string
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

/** The linked Todo project with how much is left there: open tasks – overdue, due today, in the next 7 days, undated. */
export interface TodoSummary extends TodoProject {
  open: number
  overdue: number
  today?: number
  soon?: number
  undated?: number
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
 * fields (domains, status, engine, version, theme) – the rest is missing there, not null.
 */
export interface Project extends Record<Flag, boolean> {
  id: number
  name: string
  categoryId: number | null
  /** the user's order within the category; null – never placed (last, by name) */
  position: number | null
  /** the site's addresses without https://, the first is the main one; [] – not a site */
  domains: string[]
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
  /** access: the WordPress panels of production, staging and the local copy, staging's address, the login */
  adminUrl: string | null
  stagingUrl: string | null
  stagingAdminUrl: string | null
  localAdminUrl: string | null
  login: string | null
  /** HTTP Basic Auth in front of the site – the list fetches the report with it (the password apart, like the panel's) */
  authUser: string | null
  /** RRRR-MM-DD */
  /** id of the linked Todo project */
  todoProject: number | null
  todo?: TodoSummary | null
  notes: string | null
  /** ISO 8601 – the last report the site sent about itself */
  reportedAt: string | null
  token: string | null
  /** whether a panel password is kept – the password itself only through projectsApi.password() */
  hasPassword?: boolean
  /** whether a Basic Auth password is kept */
  hasAuthPassword?: boolean
  updatedAt: string | null
}

/** A plugin of a reported site; update – the version waiting for it, null when up to date. */
export interface ReportPlugin {
  name: string
  version: string
  file: string
  active: boolean
  update: string | null
  mu?: boolean
}

/** What a site last sent about itself (MK Core's `report` module) – older reports lack users and update info. */
export interface SiteReport {
  users?: {
    total: number
    /** null – the site doesn't track activity */
    online: number | null
    roles: Array<{ role: string, name: string, count: number }>
  }
  plugins?: ReportPlugin[]
  pluginUpdates?: number
  environment?: string
  reporter?: string
}

/** What the API takes: any field, null clears it. */
export type ProjectInput = Partial<Omit<Project, 'id' | 'position' | 'todo' | 'reportedAt' | 'token' | 'hasPassword' | 'hasAuthPassword' | 'updatedAt'>>

/** the passwords kept encrypted: the panel's and HTTP Basic Auth's */
export type PasswordKind = 'panel' | 'auth'

export type SortKey = 'name' | 'status' | 'server' | 'php' | 'version' | 'theme' | 'reportedAt'
