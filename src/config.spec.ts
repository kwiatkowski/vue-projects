import { describe, expect, it } from 'vitest'

describe('config', () => {
  it('takes every field WordPress injects – a new one left out of the list would silently stay at its default', async () => {
    const injected = {
      latestWordpress: '7.1.4',
      phpBranches: { 8.3: { state: 'security', latest: '8.3.36', activeEnd: '2025-12-31', securityEnd: '2027-12-31' } },
      mkCoreVersion: '2026.10.29',
    }

    ;(globalThis as { window?: unknown }).window = { __PROJECTS__: injected }
    const { config } = await import('./config')

    for (const [key, value] of Object.entries(injected)) {
      expect(config[key as keyof typeof config]).toEqual(value)
    }

    delete (globalThis as { window?: unknown }).window
  })
})
