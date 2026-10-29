import type { Project } from '@/types'
import { describe, expect, it } from 'vitest'
import { ago, bareDomain, compareManual, compareVersions, formatDateTime, formatDay, groupProjects, latestWordpress, matches, moveId, newestReporters, newestWordpress, ownTheme, parseReporter, pendingUpdates, repoHost, reporterUpdate, reportStale, reportState, siteUrl, sortProjects, stagingCheck, vulnerabilityTone } from './projects'

const p = (name: string, extra: Partial<Project> = {}): Partial<Project> => ({ name, domains: [name], status: 'online', ...extra })

describe('matches', () => {
  it('filters by status and by having no domain', () => {
    expect(matches(p('a.pl'), 'online', '')).toBe(true)
    expect(matches(p('a.pl', { status: 'suspended' }), 'online', '')).toBe(false)
    expect(matches(p('HOME', { domains: [], status: null }), 'other', '')).toBe(true)
    expect(matches(p('a.pl'), 'other', '')).toBe(false)
  })

  it('searches the name, domain, theme and server, ignoring case', () => {
    expect(matches(p('rakprostaty.com.pl', { theme: 'Betheme Child' }), 'all', 'betheme')).toBe(true)
    expect(matches(p('ckmed.pl', { server: 'hostido.pl' }), 'all', 'HOSTIDO')).toBe(true)
    expect(matches(p('ckmed.pl'), 'all', 'meden.com')).toBe(false)
    expect(matches(p('edgemedical', { domains: ['edgemedical.eu', 'edgemedical.bg'] }), 'all', '.bg')).toBe(true)
  })
})

describe('sortProjects', () => {
  it('sorts by name naturally', () => {
    expect(sortProjects([p('b.pl'), p('a10.pl'), p('a2.pl')], 'name').map(x => x.name)).toEqual(['a2.pl', 'a10.pl', 'b.pl'])
  })

  it('puts empty values last, also when descending', () => {
    const list = [p('a', { php: null }), p('b', { php: '7.4' }), p('c', { php: '8.3' })]

    expect(sortProjects(list, 'php').map(x => x.name)).toEqual(['b', 'c', 'a'])
    expect(sortProjects(list, 'php', true).map(x => x.name)).toEqual(['c', 'b', 'a'])
  })

  it('orders statuses from working to gone', () => {
    const list = [p('a', { status: 'suspended' }), p('b', { status: null }), p('c', { status: 'online' }), p('d', { status: 'dev' })]

    expect(sortProjects(list, 'status').map(x => x.name)).toEqual(['c', 'd', 'a', 'b'])
  })
})

describe('manual order', () => {
  const a = { id: 1, name: 'A', slug: 'a', position: 1 }
  const b = { id: 2, name: 'B', slug: 'b', position: 0 }

  it('groups projects under their categories, the uncategorized last', () => {
    const list = [
      p('x.pl', { id: 1, categoryId: 2, position: 1 }),
      p('y.pl', { id: 2, categoryId: 2, position: 0 }),
      p('z.pl', { id: 3, categoryId: null }),
      p('w.pl', { id: 4, categoryId: 99 }),
    ]
    const groups = groupProjects(list, [a, b])

    expect(groups.map(group => group.category?.name ?? '-')).toEqual(['B', '-'])
    expect(groups[0]!.projects.map(x => x.name)).toEqual(['y.pl', 'x.pl'])
    expect(groups[1]!.projects.map(x => x.name)).toEqual(['w.pl', 'z.pl'])
    expect(groupProjects(list, [a, b], true).map(group => group.category?.name ?? '-')).toEqual(['B', 'A', '-'])
  })

  it('puts never placed items last, by name', () => {
    expect([{ name: 'b', position: null }, { name: 'a', position: null }, { name: 'c', position: 3 }].toSorted(compareManual).map(x => x.name))
      .toEqual(['c', 'a', 'b'])
  })

  it('moves an id next to another', () => {
    expect(moveId([1, 2, 3, 4], 4, 2)).toEqual([1, 4, 2, 3])
    expect(moveId([1, 2, 3, 4], 1, 3, true)).toEqual([2, 3, 1, 4])
    expect(moveId([1, 2, 3], 5, null)).toEqual([1, 2, 3, 5])
  })
})

describe('helpers', () => {
  it('tells the repository host', () => {
    expect(repoHost('https://github.com/medeninmed/ckmed')).toBe('GH')
    expect(repoHost('https://bitbucket.org/kwiatkowski/www-kwiatkowski')).toBe('BB')
    expect(repoHost(null)).toBeNull()
  })

  it('marks WordPress sites on the newest release', () => {
    expect(latestWordpress(p('a', { engine: 'wordpress', version: '7.1.3' }), '7.1.3')).toBe(true)
    expect(latestWordpress(p('a', { engine: 'wordpress', version: '7.1.2' }), '7.1.3')).toBe(false)
    expect(latestWordpress(p('a', { engine: 'vue', version: '7.1.3' }), '7.1.3')).toBe(false)
    expect(latestWordpress(p('a', { engine: 'wordpress', version: '7.1.3' }), null)).toBe(false)
    // a site already past what the page knows as the newest is on it, not outdated
    expect(latestWordpress(p('a', { engine: 'wordpress', version: '7.1.4' }), '7.1.3')).toBe(true)
  })

  it('formats days and links', () => {
    expect(formatDay('2026-07-24')).toBe('2026.07.24')
    expect(formatDay(null)).toBe('')
  })

  it('formats a moment in the local time zone', () => {
    const iso = '2026-10-26T15:05:00Z'
    const local = new Date(iso)
    const pad = (value: number) => String(value).padStart(2, '0')

    expect(formatDateTime(iso)).toBe(`2026.10.${pad(local.getDate())} ${pad(local.getHours())}:${pad(local.getMinutes())}`)
    expect(formatDateTime('2026-01-02T03:04:00')).toBe('2026.01.02 03:04')
    expect(formatDateTime(null)).toBe('')
    expect(formatDateTime('nonsense')).toBe('')
    expect(siteUrl('ckmed.pl')).toBe('https://ckmed.pl/')
    expect(bareDomain(' HTTPS://Edgemedical.EU/bg/ ')).toBe('edgemedical.eu')
  })

  it('tells how old a report is', () => {
    const now = new Date('2026-10-26T12:00:00Z')

    expect(ago('2026-10-26T08:00:00Z', now)).toBe('dziś')
    expect(ago('2026-10-25T08:00:00Z', now)).toBe('wczoraj')
    expect(ago('2026-10-20T08:00:00Z', now)).toBe('6 dni temu')
    expect(reportStale('2026-10-25T08:00:00Z', now)).toBe(false)
    expect(reportStale('2026-10-20T08:00:00Z', now)).toBe(true)
    expect(reportStale(null, now)).toBe(true)
  })

  it('tells whether a site reports, failed to or is not set up', () => {
    const now = new Date('2026-10-26T12:00:00Z')

    expect(reportState({ token: 'x', reportedAt: '2026-10-26T11:55:00Z' }, now)).toBe('ok')
    expect(reportState({ token: 'x', reportedAt: '2026-10-20T08:00:00Z' }, now)).toBe('failed')
    expect(reportState({ token: 'x', reportedAt: null }, now)).toBe('failed')
    expect(reportState({ token: null, reportedAt: '2026-10-26T11:55:00Z' }, now)).toBe('off')
  })
})

describe('WordPress versions', () => {
  it('compares them as numbers', () => {
    expect(compareVersions('7.1.10', '7.1.4')).toBeGreaterThan(0)
    expect(compareVersions('7.1.3', '7.1.4')).toBeLessThan(0)
    expect(compareVersions('7.1', '7.1')).toBe(0)
  })

  it('takes a newer stable release a site runs for the newest – not a beta', () => {
    const sites = [p('a', { engine: 'wordpress', version: '7.1.4' }), p('b', { engine: 'wordpress', version: '7.2-RC1' }), p('c', { engine: 'vue', version: '9.0' })]

    expect(newestWordpress('7.1.3', sites)).toBe('7.1.4')
    expect(newestWordpress('7.1.5', sites)).toBe('7.1.5')
    expect(newestWordpress(null, sites)).toBe('7.1.4')
  })

  it('counts WordPress as an update only when the site is behind', () => {
    const site = (version: string) => ({ ...p('a', { engine: 'wordpress', version }), updates: [] }) as unknown as Project

    expect(pendingUpdates(site('7.1.3'), '7.1.4')).toEqual([{ name: 'WordPress', version: '7.1.3', update: '7.1.4' }])
    expect(pendingUpdates(site('7.1.4'), '7.1.3')).toEqual([])
  })
})

describe('stagingCheck', () => {
  const at = '2026-10-29T09:14:00Z'

  it('answers 200 – ok', () => {
    expect(stagingCheck({ code: 200, checkedAt: at })).toEqual({ text: 'odpowiada (200)', tone: 'ok' })
  })

  it('no answer – why, from the plugin; down', () => {
    expect(stagingCheck({ code: 0, checkedAt: at, error: 'dns' })).toEqual({ text: 'nie ma takiej domeny (DNS)', tone: 'down' })
    expect(stagingCheck({ code: 0, checkedAt: at })).toEqual({ text: 'brak połączenia', tone: 'down' })
  })

  it('the login or a block – warn; a missing page or a server error – down', () => {
    expect(stagingCheck({ code: 401, checkedAt: at }).tone).toBe('warn')
    expect(stagingCheck({ code: 403, checkedAt: at }).tone).toBe('warn')
    expect(stagingCheck({ code: 503, checkedAt: at })).toEqual({ text: 'tryb konserwacji lub przeciążenie (HTTP 503)', tone: 'down' })
    expect(stagingCheck({ code: 418, checkedAt: at })).toEqual({ text: 'HTTP 418', tone: 'down' })
  })
})

describe('ownTheme', () => {
  const theme = (authorUri: string | null, parentAuthorUri: string | null = null) => ({ themeDetails: { version: null, author: null, authorUri, parentVersion: null, parentAuthor: null, parentAuthorUri } })

  it('meden.com.pl or kwiatkowski.co – the theme\'s or its parent\'s Author URI', () => {
    expect(ownTheme(theme('https://meden.com.pl'))).toBe(true)
    expect(ownTheme(theme('https://kwiatkowski.co/'))).toBe(true)
    expect(ownTheme(theme('www.meden.com.pl'))).toBe(true)
    expect(ownTheme(theme(null, 'https://meden.com.pl'))).toBe(true)
    expect(ownTheme(theme('https://notmeden.com.pl'))).toBe(false)
    expect(ownTheme(theme('https://wordpress.org'))).toBe(false)
    expect(ownTheme({ themeDetails: null })).toBe(false)
  })
})

describe('vulnerabilityTone', () => {
  it('red with a high or critical one, else orange', () => {
    expect(vulnerabilityTone([{ severity: 'm' }, { severity: null }])).toBe('warn')
    expect(vulnerabilityTone([{ severity: 'm' }, { severity: 'h' }])).toBe('bad')
  })
})

describe('reporters', () => {
  const sites = [{ reporter: 'plugin_meden 1.16.0' }, { reporter: 'plugin_meden 1.18.0' }, { reporter: 'mk-core 2026.10.28' }, { reporter: null }]

  it('the newest of each – plugin_meden from the sites, MK Core at least the list\'s own', () => {
    expect(parseReporter('plugin_meden 1.17.0')).toEqual({ name: 'plugin_meden', version: '1.17.0' })
    expect(newestReporters(sites, '2026.10.29')).toEqual({ 'mk-core': '2026.10.29', 'plugin_meden': '1.18.0' })
  })

  it('an older one gets the newer version, the newest none', () => {
    const newest = newestReporters(sites, '2026.10.29')
    expect(reporterUpdate({ reporter: 'plugin_meden 1.16.0' }, newest)).toBe('1.18.0')
    expect(reporterUpdate({ reporter: 'plugin_meden 1.18.0' }, newest)).toBeNull()
    expect(reporterUpdate({ reporter: 'mk-core 2026.10.28' }, newest)).toBe('2026.10.29')
    expect(reporterUpdate({ reporter: null }, newest)).toBeNull()
  })
})
