import type { Project } from '@/types'
/** The dialog and the table render without errors (server-side, no DOM) – a guard for refactors. */
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import ProjectDialog from '@/components/ProjectDialog.vue'
import ProjectTable from '@/components/ProjectTable.vue'
import { useProjectsStore } from '@/stores/projects'

const project = {
  id: 1, name: 'ckmed.pl', domains: ['ckmed.pl'], status: 'online', categoryId: null, position: 1, todoProject: null,
  server: 'hostido', serverUrl: 'https://x', serverAccount: 'acc', php: '8.2', engine: 'wordpress', version: '6.8.2', theme: 'meden',
  repo: null, deploy: true, bedrock: true, security: true, acf: false, miModal: false, localUrl: 'https://ckmed.local', adminUrl: null,
  stagingUrl: 'https://s.ckmed.pl', stagingAdminUrl: null, localAdminUrl: null, login: 'admin', notes: '', authUser: null, stagingAuthUser: 'u',
  recaptchaSiteKey: null, token: 'x', reportedAt: '2026-10-29T08:00:00Z', staging: { code: 401, checkedAt: '2026-10-29T08:00:00Z' },
  uptime: 98.5, responseMs: 640, updates: [{ name: 'CF7', version: '5', update: '6' }], hasStagingAuthPassword: true,
  ssl: { validTo: '2026-12-01', issuer: 'LE', checkedAt: '2026-10-29T08:00:00Z', error: null },
} as unknown as Project

async function render (component: object, props: Record<string, unknown>, setup?: () => void) {
  const app = createSSRApp({ render: () => h(component as never, props) })
  const pinia = createPinia()
  app.use(pinia)
  setActivePinia(pinia)
  setup?.()
  const errors: unknown[] = []
  app.config.errorHandler = error => {
    errors.push(error)
  }
  app.config.warnHandler = message => {
    if (!/Teleport|hydrat|Failed to resolve/i.test(message)) {
      errors.push(message)
    }
  }
  const html = await renderToString(app)
  return { html, errors }
}

describe('smoke', () => {
  it('renders the dialog with a project', async () => {
    const { html, errors } = await render(ProjectDialog, {}, () => {
      useProjectsStore().editing = project
    })
    expect(errors).toEqual([])
    expect(html).toContain('Historia')
    expect(html).toContain('Aktualizuj raport')
    expect(html).toContain('Basic Auth')
  })

  it('renders the table', async () => {
    const { html, errors } = await render(ProjectTable, { groups: [{ category: null, projects: [project] }], grouped: false, full: true, canDrag: true, sort: null, descending: false }, () => {
      useProjectsStore().items = [project]
    })
    expect(errors).toEqual([])
    expect(html).toContain('ckmed.pl')
    expect(html).toContain('6.8.2')
  })
})
