import type { Project } from '@/types'
import { describe, expect, it } from 'vitest'
import { ago, formatDay, matches, repoHost, reportStale, siteUrl, sortProjects } from './projects'

const p = (name: string, extra: Partial<Project> = {}): Partial<Project> => ({ name, domain: name, status: 'online', ...extra })

describe('matches', () => {
  it('filters by status and by having no domain', () => {
    expect(matches(p('a.pl'), 'online', '')).toBe(true)
    expect(matches(p('a.pl', { status: 'suspended' }), 'online', '')).toBe(false)
    expect(matches(p('HOME', { domain: null, status: null }), 'other', '')).toBe(true)
    expect(matches(p('a.pl'), 'other', '')).toBe(false)
  })

  it('searches the name, domain, theme and server, ignoring case', () => {
    expect(matches(p('rakprostaty.com.pl', { theme: 'Betheme Child' }), 'all', 'betheme')).toBe(true)
    expect(matches(p('ckmed.pl', { server: 'hostido.pl' }), 'all', 'HOSTIDO')).toBe(true)
    expect(matches(p('ckmed.pl'), 'all', 'meden.com')).toBe(false)
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

describe('helpers', () => {
  it('tells the repository host', () => {
    expect(repoHost('https://github.com/medeninmed/ckmed')).toBe('GH')
    expect(repoHost('https://bitbucket.org/kwiatkowski/www-kwiatkowski')).toBe('BB')
    expect(repoHost(null)).toBeNull()
  })

  it('formats days and links', () => {
    expect(formatDay('2026-07-24')).toBe('24.07.2026')
    expect(formatDay(null)).toBe('')
    expect(siteUrl('ckmed.pl')).toBe('https://ckmed.pl/')
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
