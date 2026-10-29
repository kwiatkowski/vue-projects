import type { Secrets } from './secrets'
import type { Flag, Project, ProjectInput, SiteReport, Status } from '@/types'
import type { ComputedRef, InjectionKey, Ref } from 'vue'
import { inject } from 'vue'
import { FLAGS } from '@/types'

/** The project dialog's form, its tabs (components/project/*Tab.vue) and what they share. */

export type Form = Required<Omit<ProjectInput, 'status'>> & { status: Status | null }

export const TEXT_FIELDS = [
  'server', 'serverUrl', 'serverAccount', 'php', 'engine', 'version', 'theme', 'repo', 'notes',
  'adminUrl', 'stagingUrl', 'stagingAdminUrl', 'localUrl', 'localAdminUrl', 'login', 'authUser', 'stagingAuthUser', 'recaptchaSiteKey',
] as const

export const FLAG_LABELS: Record<Flag, string> = {
  deploy: 'Deploy (git na produkcji)',
  bedrock: 'Bedrock',
  security: 'Wordfence',
  acf: 'ACF',
  miModal: 'MI Modal',
}

/** the flags a site's report sets – a star by them */
export const REPORTED_FLAGS = new Set<Flag>(['deploy', 'bedrock', 'security', 'acf', 'miModal'])

/** the reported fields – a fetched report brings them in, unless they were typed over in the form */
export const REPORTED_FIELDS = ['status', 'repo', 'php', 'engine', 'version', 'theme', ...REPORTED_FLAGS] as const

export type LockedField = 'status' | 'repo' | 'php' | 'engine' | 'version' | 'theme' | Flag

export function blank (): Form {
  return {
    name: '',
    domains: [''],
    status: null,
    categoryId: null,
    todoProject: null,
    ...Object.fromEntries(TEXT_FIELDS.map(field => [field, ''])),
    ...Object.fromEntries(FLAGS.map(flag => [flag, false])),
  } as Form
}

export function fromProject (project: Project): Form {
  const form = blank()

  for (const key of Object.keys(form) as Array<keyof Form>) {
    const value = project[key as keyof Project]
    ;(form as Record<string, unknown>)[key] = value ?? (typeof form[key] === 'string' ? '' : form[key])
  }

  form.domains = project.domains.length > 0 ? [...project.domains] : ['']

  return form
}

/** what the dialog gives its tabs */
export interface ProjectForm {
  form: Ref<Form>
  /** the form as it was opened (or last saved), JSON – what "changed" compares with */
  initial: Ref<string>
  /** the project being edited; null – a new one */
  project: ComputedRef<Project | null>
  busy: Ref<boolean>
  /** the site's last report (users, plugins) – fetched when the dialog opens */
  siteReport: Ref<SiteReport | null>
  loadReport: (project: Project) => Promise<void>
  /** a field the site's report fills – read-only then */
  locked: (field: LockedField) => boolean
  /** the passwords and reCAPTCHA's secret – apart from the form */
  secrets: Secrets
  /** copies a text, says so in a toast */
  copy: (text: string | null | undefined, what: string) => Promise<void>
}

export const projectFormKey: InjectionKey<ProjectForm> = Symbol('projectForm')

export function useProjectForm (): ProjectForm {
  const context = inject(projectFormKey)

  if (!context) {
    throw new Error('useProjectForm() outside ProjectDialog')
  }

  return context
}
