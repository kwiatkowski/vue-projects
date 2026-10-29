import type { HistoryCheck } from '@/types'
import { describe, expect, it } from 'vitest'
import { buckets, describeEvent, formatDuration, formatMs, formatUptime } from './history'

describe('buckets', () => {
  const now = new Date('2026-10-29T12:00:00Z')
  const check = (at: string, up: boolean, ms: number | null): HistoryCheck => ({ at, up, code: up ? 200 : 0, ms })

  it('groups the checks into half-hours, the up ones averaged, the failed ones counted', () => {
    const result = buckets([
      check('2026-10-29T11:35:00Z', true, 400),
      check('2026-10-29T11:40:00Z', true, 600),
      check('2026-10-29T11:45:00Z', false, null),
      check('2026-10-28T09:00:00Z', true, 100),
    ], now)

    expect(result).toHaveLength(48)
    expect(result.at(-1)).toMatchObject({ ms: 500, down: 1, total: 3 })
    expect(result[0]).toMatchObject({ ms: null, down: 0, total: 0 })
  })
})

describe('formats', () => {
  it('uptime, times, durations', () => {
    expect(formatUptime(99.95)).toBe('99,95 %')
    expect(formatUptime(null)).toBe('–')
    expect(formatMs(640)).toBe('640 ms')
    expect(formatMs(1250)).toBe('1,3 s')
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(135)).toBe('2 h 15 min')
    expect(formatDuration(1500)).toBe('1 dzień 1 h')
  })
})

describe('describeEvent', () => {
  const event = (type: string, data: Record<string, unknown>) => ({ type, at: '2026-10-29T12:00:00Z', data })

  it('plugins, roles, fields, the status', () => {
    expect(describeEvent(event('change', { what: 'plugin', name: 'CF7', from: '5.9', to: '6.0' }))).toBe('Wtyczka CF7: 5.9 → 6.0')
    expect(describeEvent(event('change', { what: 'plugin', name: 'CF7', from: null, to: '6.0' }))).toBe('Wtyczka CF7: nowa (6.0)')
    expect(describeEvent(event('change', { what: 'plugin', name: 'CF7', from: '6.0', to: null }))).toBe('Wtyczka CF7: usunięta')
    expect(describeEvent(event('change', { what: 'role', name: 'Administrator', role: 'administrator', from: 1, to: 2 }))).toBe('Administrator: 1 → 2')
    expect(describeEvent(event('change', { what: 'version', from: '6.8', to: '6.9' }))).toBe('WordPress: 6.8 → 6.9')
    expect(describeEvent(event('status', { what: 'status', from: 'online', to: 'offline' }))).toBe('Status: online → offline')
  })
})
