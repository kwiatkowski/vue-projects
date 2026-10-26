import type { Category, Project, SortKey, Status } from '@/types'

export const STATUS_LABELS: Record<Status, string> = {
  online: 'online',
  dev: 'w budowie',
  suspended: 'zawieszona',
  offline: 'nie działa',
}

/** The colour of a status – chip--{tone} in the table, the same in the filter; suspended – the dark dot, like an unset report. */
export const STATUS_TONES: Record<Status, 'accent' | 'info' | 'danger' | 'off'> = {
  online: 'accent',
  dev: 'info',
  suspended: 'off',
  offline: 'danger',
}

/** A filter of the list: by status, or the projects that are no site at all (no domain). */
export type Filter = 'all' | Status | 'other'

/** Status order: what works first, what's gone last. */
const STATUS_ORDER: Array<Status | null> = ['online', 'dev', 'offline', 'suspended', null]

const collator = new Intl.Collator('pl', { numeric: true, sensitivity: 'base' })

export function matches (project: Partial<Project>, filter: Filter, query: string): boolean {
  if (filter === 'other' ? (project.domains?.length ?? 0) > 0 : filter !== 'all' && project.status !== filter) {
    return false
  }

  const needle = query.trim().toLowerCase()

  if (!needle) {
    return true
  }

  return [project.name, ...(project.domains ?? []), project.theme, project.server, project.serverAccount, project.engine]
    .some(value => value?.toLowerCase().includes(needle))
}

/** Sorted copy; the name decides ties, so the order is stable. Empty values go last either way. */
export function sortProjects<T extends Partial<Project>> (projects: T[], key: SortKey, descending = false): T[] {
  const value = (project: T): string | number | null => {
    if (key === 'status') {
      return STATUS_ORDER.indexOf(project.status ?? null)
    }

    return (project[key] as string | null | undefined) || null
  }

  return projects.toSorted((a, b) => {
    const left = value(a)
    const right = value(b)

    if (left !== right) {
      if (left === null) {
        return 1
      }

      if (right === null) {
        return -1
      }

      const order = typeof left === 'number' && typeof right === 'number' ? left - right : collator.compare(String(left), String(right))

      if (order !== 0) {
        return descending ? -order : order
      }
    }

    return collator.compare(a.name ?? '', b.name ?? '')
  })
}

/** The user's order: placed items by position, never placed ones after them, by name. */
export function compareManual (a: { position?: number | null, name?: string }, b: { position?: number | null, name?: string }): number {
  return (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) || collator.compare(a.name ?? '', b.name ?? '')
}

export interface Group<T> {
  /** null – projects without a category (or the whole list when it is not grouped) */
  category: Category | null
  projects: T[]
}

/**
 * Projects under their categories in the user's order, the uncategorized last. Empty categories only with `keepEmpty`
 * (the owner wants to drop projects into a new one); a category that no longer exists counts as none.
 */
export function groupProjects<T extends Partial<Project>> (projects: T[], categories: Category[], keepEmpty = false): Array<Group<T>> {
  const known = new Set(categories.map(category => category.id))
  const groups: Array<Group<T>> = categories.toSorted(compareManual).map(category => ({
    category,
    projects: projects.filter(project => project.categoryId === category.id).toSorted(compareManual),
  }))
  const loose = projects.filter(project => !project.categoryId || !known.has(project.categoryId)).toSorted(compareManual)

  groups.push({ category: null, projects: loose })

  return groups.filter(group => group.projects.length > 0 || (keepEmpty && group.category !== null))
}

/** `ids` with `id` moved next to `targetId` (before, or after with `after`); without a target – at the end. */
export function moveId (ids: number[], id: number, targetId: number | null, after = false): number[] {
  const rest = ids.filter(item => item !== id)
  const index = targetId === null ? -1 : rest.indexOf(targetId)

  rest.splice(index === -1 ? rest.length : index + (after ? 1 : 0), 0, id)

  return rest
}

/** "GH" / "BB" – where the repository lives, as in the spreadsheet. */
export function repoHost (url: string | null | undefined): string | null {
  if (!url) {
    return null
  }

  if (url.includes('github.com')) {
    return 'GH'
  }

  if (url.includes('bitbucket.org')) {
    return 'BB'
  }

  return url.includes('gitlab') ? 'GL' : 'git'
}

/** A WordPress site on the newest release. */
export function latestWordpress (project: Partial<Project>, latest: string | null): boolean {
  return Boolean(latest) && project.engine === 'wordpress' && project.version === latest
}

/** "https://Example.pl/x" → "example.pl" – how domains are kept. */
export function bareDomain (value: string): string {
  return value.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase()
}

/** https:// in front of a bare domain. */
export function siteUrl (domain: string): string {
  return /^https?:\/\//.test(domain) ? domain : `https://${domain}/`
}

/** "2026-10-07" → "2026.10.07" */
export function formatDay (day: string | null | undefined): string {
  const match = day?.match(/^(\d{4})-(\d{2})-(\d{2})/)

  return match ? `${match[1]}.${match[2]}.${match[3]}` : ''
}

/** "2026-10-26T15:15:00+00:00" → "2026.10.26 16:15" – in the browser's time zone */
export function formatDateTime (iso: string | null | undefined): string {
  const date = iso ? new Date(iso) : null

  if (!date || Number.isNaN(date.getTime())) {
    return ''
  }

  const pad = (value: number) => String(value).padStart(2, '0')

  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** "dziś", "wczoraj", "3 dni temu" – how long since the site reported. */
export function ago (iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) {
    return ''
  }

  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000)

  if (days <= 0) {
    return 'dziś'
  }

  return days === 1 ? 'wczoraj' : `${days} dni temu`
}

/** A report older than two days – the site stopped reporting (daily cron) or was never set up. */
export function reportStale (iso: string | null | undefined, now: Date = new Date()): boolean {
  return !iso || now.getTime() - new Date(iso).getTime() > 2 * 86_400_000
}

/**
 * The report of a site at a glance: 'off' – not set up (no token); 'failed' – set up, but no report yet or none for
 * two days (WP-Cron sends one at least daily); 'ok' – it reports.
 */
export function reportState (project: Pick<Project, 'token' | 'reportedAt'>, now: Date = new Date()): 'ok' | 'failed' | 'off' {
  if (!project.token) {
    return 'off'
  }

  return reportStale(project.reportedAt, now) ? 'failed' : 'ok'
}
