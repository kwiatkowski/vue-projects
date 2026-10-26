import type { Project } from '@/types'
import { describe, expect, it } from 'vitest'
import { ago, bareDomain, compareManual, formatDay, groupProjects, latestWordpress, matches, moveId, repoHost, reportStale, siteUrl, sortProjects } from './projects'

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
  })

  it('formats days and links', () => {
    expect(formatDay('2026-07-24')).toBe('24.07.2026')
    expect(formatDay(null)).toBe('')
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
})
