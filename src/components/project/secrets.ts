import type { PasswordKind, Project } from '@/types'
import { computed, reactive } from 'vue'
import { projectsApi } from '@/api/projects'
import { useProjectsStore } from '@/stores/projects'

const KINDS: PasswordKind[] = ['panel', 'auth', 'staging', 'recaptcha']

/** which "has…" flag of the project says the secret is kept */
const KEPT: Record<PasswordKind, keyof Project> = {
  panel: 'hasPassword',
  auth: 'hasAuthPassword',
  staging: 'hasStagingAuthPassword',
  recaptcha: 'hasRecaptchaSecret',
}

const each = <T>(value: () => T) => Object.fromEntries(KINDS.map(kind => [kind, value()])) as Record<PasswordKind, T>

/**
 * The project's secrets – the panel's password, Basic Auth's of production and staging, reCAPTCHA's secret key – apart
 * from the form: kept encrypted, fetched only when the dialog opens, saved on their own.
 */
export function useSecrets () {
  const projects = useProjectsStore()

  const values = reactive(each(() => ''))
  const saved = reactive(each(() => ''))
  const loading = reactive(each(() => false))
  const shown = reactive(each(() => false))

  const changed = (kind: PasswordKind) => values[kind] !== saved[kind]
  /** the Access tab's – the panel's and Basic Auth's */
  const accessChanged = computed(() => changed('panel') || changed('auth') || changed('staging'))
  const anyChanged = computed(() => KINDS.some(kind => changed(kind)))

  /** empty, hidden – a new project, or before loading */
  function reset (): void {
    for (const kind of KINDS) {
      values[kind] = saved[kind] = ''
      loading[kind] = shown[kind] = false
    }
  }

  async function load (project: Project): Promise<void> {
    reset()

    for (const kind of KINDS) {
      loading[kind] = Boolean(project[KEPT[kind]])
    }

    const fetched = await Promise.all(KINDS.map(kind => loading[kind] ? projectsApi.password(project.id, kind).catch(() => null) : null))

    for (const [index, kind] of KINDS.entries()) {
      values[kind] = saved[kind] = fetched[index]?.password ?? ''
      loading[kind] = false
    }
  }

  /** the changed ones, one after another; the project after the last one – null when one failed */
  async function save (project: Project): Promise<Project | null> {
    let current: Project | null = project

    for (const kind of KINDS) {
      if (current && changed(kind)) {
        current = await projects.setPassword(current.id, values[kind] || null, kind)
        saved[kind] = current ? values[kind] : saved[kind]
      }
    }

    return current
  }

  return { values, loading, shown, changed, accessChanged, anyChanged, reset, load, save }
}

export type Secrets = ReturnType<typeof useSecrets>
