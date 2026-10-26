import type { Project, SortKey, Status } from '@/types'

export const STATUS_LABELS: Record<Status, string> = {
  online: 'online',
  dev: 'w budowie',
  suspended: 'zawieszona',
  offline: 'nie działa',
}

/** A filter of the list: by status, or the projects that are no site at all (no domain). */
export type Filter = 'all' | Status | 'other'

/** Status order: what works first, what's gone last. */
const STATUS_ORDER: Array<Status | null> = ['online', 'dev', 'offline', 'suspended', null]

const collator = new Intl.Collator('pl', { numeric: true, sensitivity: 'base' })

export function matches (project: Partial<Project>, filter: Filter, query: string): boolean {
  if (filter === 'other' ? Boolean(project.domain) : filter !== 'all' && project.status !== filter) {
    return false
  }

  const needle = query.trim().toLowerCase()

  if (!needle) {
    return true
  }

  return [project.name, project.domain, project.theme, project.server, project.serverAccount, project.engine]
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

/** https:// in front of a bare domain. */
export function siteUrl (domain: string): string {
  return /^https?:\/\//.test(domain) ? domain : `https://${domain}/`
}

/** "2026-10-07" → "7.10.2026" */
export function formatDay (day: string | null | undefined): string {
  const match = day?.match(/^(\d{4})-(\d{2})-(\d{2})/)

  return match ? `${Number(match[3])}.${match[2]}.${match[1]}` : ''
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
