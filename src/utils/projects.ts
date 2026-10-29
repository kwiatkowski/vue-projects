import type { Category, MissingTranslation, PluginUpdate, Project, SortKey, StagingCheck, Status, UpdateScope } from '@/types'

/** in this order in the filters and the status select: online, offline, in progress, suspended */
export const STATUS_LABELS: Record<Status, string> = {
  online: 'online',
  offline: 'offline',
  dev: 'w budowie',
  suspended: 'zawieszony',
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

    if (key === 'uptime') {
      return project.uptime ?? null
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

/** Dotted versions compared as numbers: "7.1.10" is newer than "7.1.4" – negative, 0 or positive. */
export function compareVersions (a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true })
}

/** a release, not a beta or an RC – only such a site's version may stand for the newest */
const STABLE = /^\d+\.\d+(?:\.\d+)?$/

/**
 * The newest WordPress: wordpress.org's (as the page got it, cached on the server) or a newer stable one a site already
 * runs – a page opened before a release would otherwise take the sites already on it for outdated.
 */
export function newestWordpress (latest: string | null, projects: Array<Partial<Project>>): string | null {
  return projects
    .filter(project => project.engine === 'wordpress' && STABLE.test(project.version ?? ''))
    .reduce<string | null>((newest, project) => newest === null || compareVersions(project.version!, newest) > 0 ? project.version! : newest, latest)
}

/** A WordPress site on the newest release (or past it). */
export function latestWordpress (project: Partial<Project>, latest: string | null): boolean {
  return Boolean(latest) && project.engine === 'wordpress' && Boolean(project.version) && compareVersions(project.version!, latest!) >= 0
}

/** A WordPress site with a newer release out. */
export function outdatedWordpress (project: Partial<Project>, latest: string | null): boolean {
  return Boolean(latest) && project.engine === 'wordpress' && Boolean(project.version) && !latestWordpress(project, latest)
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

/** What the site should update: WordPress (older than the newest) and the plugins its report lists. */
export function pendingUpdates (project: Project, latest: string | null): PluginUpdate[] {
  const core = latest && project.engine === 'wordpress' && project.version && compareVersions(project.version, latest) < 0
    ? [{ name: 'WordPress', version: project.version, update: latest }]
    : []

  return [...core, ...(project.updates ?? [])]
}

/** "Aktualizuj" – WordPress or plugins wait (translations come along); "translations" – they are all there is; null – nothing */
export function updateScope (project: Project, latest: string | null): UpdateScope | null {
  if (pendingUpdates(project, latest).length > 0) {
    return 'all'
  }

  return (project.translationUpdates?.length ?? 0) > 0 ? 'translations' : null
}

export const UPDATE_LABELS: Record<UpdateScope, string> = {
  all: 'Aktualizuj stronę',
  translations: 'Aktualizuj tłumaczenia',
}

/** a certificate that runs out within this many days is shown as a warning */
export const SSL_WARN_DAYS = 14

/** The certificate at a glance: ok, soon (runs out within SSL_WARN_DAYS), bad (expired, foreign, untrusted, none), null – not checked. */
export function sslState (project: Pick<Project, 'ssl'>, now: Date = new Date()): 'ok' | 'soon' | 'bad' | null {
  const ssl = project.ssl

  if (!ssl) {
    return null
  }

  if (!ssl.ok) {
    return 'bad'
  }

  const days = ssl.validTo ? (new Date(ssl.validTo).getTime() - now.getTime()) / 86_400_000 : Infinity

  return days <= SSL_WARN_DAYS ? 'soon' : 'ok'
}

/** days left on the certificate (whole, not below 0) */
export function sslDaysLeft (project: Pick<Project, 'ssl'>, now: Date = new Date()): number | null {
  return project.ssl?.validTo ? Math.max(0, Math.floor((new Date(project.ssl.validTo).getTime() - now.getTime()) / 86_400_000)) : null
}

/** why the staging got no answer at all – the plugin's ReportPuller::failure() */
const STAGING_FAILURES: Record<NonNullable<StagingCheck['error']>, string> = {
  dns: 'nie ma takiej domeny (DNS)',
  refused: 'serwer odrzuca połączenie',
  timeout: 'brak odpowiedzi w 20 s',
  ssl: 'błąd certyfikatu SSL',
  redirects: 'pętla przekierowań',
  other: 'brak połączenia',
}

/** what an HTTP code usually means on a staging */
const STAGING_CODES: Record<number, string> = {
  401: 'zły lub brak loginu i hasła Basic Auth',
  403: 'dostęp zablokowany (IP, firewall)',
  404: 'nie ma takiej strony – zły adres?',
  500: 'błąd PHP lub WordPressa',
  502: 'błąd serwera lub proxy',
  503: 'tryb konserwacji lub przeciążenie',
  504: 'serwer nie zdążył odpowiedzieć',
}

/**
 * The staging's check in words, and its tone: ok – it answers 200; warn – it works, but the list can't get in (the
 * login, a block); down – it doesn't work (no answer, a missing page, a server error).
 */
export function stagingCheck (check: StagingCheck): { text: string, tone: 'ok' | 'warn' | 'down' } {
  if (check.code === 200) {
    return { text: 'odpowiada (200)', tone: 'ok' }
  }

  if (check.code === 0) {
    return { text: STAGING_FAILURES[check.error ?? 'other'] ?? STAGING_FAILURES.other, tone: 'down' }
  }

  const meaning = STAGING_CODES[check.code]

  return {
    text: meaning ? `${meaning} (HTTP ${check.code})` : `HTTP ${check.code}`,
    tone: check.code === 401 || check.code === 403 ? 'warn' : 'down',
  }
}

/** a vulnerability's CVSS severity in words */
export const SEVERITY_LABELS: Record<'l' | 'm' | 'h' | 'c', string> = { l: 'niska', m: 'średnia', h: 'wysoka', c: 'krytyczna' }

/** a vulnerability list's tone: red with a high or critical one, else (medium, low, unknown) orange */
export function vulnerabilityTone (items: Array<{ severity: 'l' | 'm' | 'h' | 'c' | null }>): 'bad' | 'warn' {
  return items.some(item => item.severity === 'h' || item.severity === 'c') ? 'bad' : 'warn'
}

/** the authors whose themes are made in-house – by the host of the theme's (or its parent's) Author URI */
const OWN_THEME_HOSTS = ['meden.com.pl', 'kwiatkowski.co']

/** the theme – or its parent – made in-house: its Author URI on meden.com.pl or kwiatkowski.co (or their subdomains) */
export function ownTheme (project: Pick<Project, 'themeDetails'>): boolean {
  const details = project.themeDetails

  return [details?.authorUri, details?.parentAuthorUri].some(uri => {
    const host = (() => {
      try {
        return uri ? new URL(/^https?:\/\//i.test(uri) ? uri : `https://${uri}`).hostname.toLowerCase() : ''
      } catch {
        return ''
      }
    })()

    return OWN_THEME_HOSTS.some(own => host === own || host.endsWith(`.${own}`))
  })
}

/**
 * What has no translation for the site's language – the theme left out when made in-house (written in that language,
 * nothing to translate).
 */
export function missingTranslations (project: Pick<Project, 'missingTranslations' | 'themeDetails'>): MissingTranslation[] {
  const own = ownTheme(project)

  return (project.missingTranslations?.items ?? []).filter(item => !(own && item.type === 'theme'))
}

/** "plugin_meden 1.17.0" / "mk-core 2026.10.29" – what sends the site's report, and its version */
export function parseReporter (reporter: string | null | undefined): { name: string, version: string } | null {
  const match = reporter?.trim().match(/^(\S+)\s+(\d[\w.-]*)$/)

  return match ? { name: match[1] as string, version: match[2] as string } : null
}

/**
 * The newest version of each reporter: the highest any site sends – and for MK Core at least the list's own (it runs
 * the newest). plugin_meden's repository is private, so the sites themselves tell.
 */
export function newestReporters (projects: Array<Pick<Project, 'reporter'>>, mkCore: string | null | undefined): Record<string, string> {
  const newest: Record<string, string> = mkCore ? { 'mk-core': mkCore } : {}

  for (const project of projects) {
    const reporter = parseReporter(project.reporter)

    if (reporter && (!newest[reporter.name] || compareVersions(reporter.version, newest[reporter.name] as string) > 0)) {
      newest[reporter.name] = reporter.version
    }
  }

  return newest
}

/** the newer version of the site's reporter (plugin_meden, MK Core) – null when it runs the newest */
export function reporterUpdate (project: Pick<Project, 'reporter'>, newest: Record<string, string>): string | null {
  const reporter = parseReporter(project.reporter)
  const latest = reporter ? newest[reporter.name] : undefined

  return reporter && latest && compareVersions(reporter.version, latest) < 0 ? latest : null
}
