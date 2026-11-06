import type { Host, PhpBranch, Project } from '@/types'
import { recaptchaUses } from '@/components/project/recaptcha'
import { domainChecks, envStatus, formatDay, formsState, paidState, phpStatus, reportState, sslState, updateScope, vulnerabilityTone } from '@/utils/projects'

/**
 * A tab's dot in the project's dialog: all there and fine (green), something to look at (orange), something wrong
 * (red) – with what it means, for the tooltip and screen readers. None when there is nothing to say.
 */
export interface TabState {
  tone: 'ok' | 'warn' | 'bad'
  label: string
}

const ORDER = { ok: 0, warn: 1, bad: 2 } as const

/** the worst of a tab's findings – its label; none of them, none */
function worst (states: Array<TabState | null>): TabState | null {
  return states.filter(state => state !== null).reduce<TabState | null>((top, state) => !top || ORDER[state.tone] > ORDER[top.tone] ? state : top, null)
}

/** Raport: none without a token; red – no report for two days or a serious vulnerability; orange – something to update */
export function reportTabState (project: Project | null, latest: string | null, now: Date = new Date()): TabState | null {
  if (!project || reportState(project, now) === 'off') {
    return null
  }

  if (reportState(project, now) === 'failed') {
    return { tone: 'bad', label: 'brak raportu od 2 dni' }
  }

  const vulnerabilities = project.vulnerabilities ?? []
  const vulnerable: TabState | null = vulnerabilities.length > 0 ? { tone: vulnerabilityTone(vulnerabilities), label: 'znane podatności we wtyczkach' } : null
  // WordPress, plugins, translations – and themes, as the list's Raport column counts them
  const waiting = updateScope(project, latest) !== null || (project.themeUpdates?.length ?? 0) > 0
  const updates: TabState | null = waiting ? { tone: 'warn', label: 'są aktualizacje' } : null

  return worst([{ tone: 'ok', label: 'raport aktualny, wszystko aktualne' }, vulnerable, updates])
}

/** Technologia: WordPress the newest (orange – older), PHP as the list's PHP column (orange – support ending, red – unpatched or unsupported) */
export function techTabState (project: Project | null, latest: string | null, branches: Record<string, PhpBranch>, now: Date = new Date()): TabState | null {
  if (!project) {
    return null
  }

  let wordpress: TabState | null = null

  if (latest && project.engine === 'wordpress' && project.version) {
    wordpress = updateScope({ ...project, updates: [], translationUpdates: [] }, latest) === null
      ? { tone: 'ok', label: 'WordPress i PHP aktualne' }
      : { tone: 'warn', label: 'nowszy WordPress' }
  }

  const php = phpStatus(project, branches, now).tone
  const phpState: Record<typeof php, TabState | null> = {
    ok: { tone: 'ok', label: 'WordPress i PHP aktualne' },
    ending: { tone: 'warn', label: 'wsparcie PHP kończy się wkrótce' },
    outdated: { tone: 'bad', label: 'PHP bez poprawek' },
    eol: { tone: 'bad', label: 'PHP bez wsparcia' },
    unknown: null,
  }

  return worst([wordpress, phpState[php]])
}

/**
 * Serwer: the hosting account paid for (orange – 30 days or less left, red – past) and the certificates – the main
 * domain's and the others' (orange – ending soon, red – not valid or not answering)
 */
export function serverTabState (project: Project | null, host: Host | null = null, now: Date = new Date()): TabState | null {
  // the domains – until when paid, as the hosting
  const domains = (project?.domainInfo ?? []).map(info => {
    const state = paidState(info.expires?.slice(0, 10), now)

    return state && state.tone !== 'ok' ? { tone: state.tone === 'bad' ? 'bad' : 'warn', label: `domena ${info.domain} opłacona do ${formatDay(info.expires?.slice(0, 10))}` } as const : null
  })
  const paid = paidState(host?.paidUntil, now)
  const hosting: TabState | null = paid && paid.tone !== 'ok'
    ? { tone: paid.tone === 'bad' ? 'bad' : 'warn', label: `hosting opłacony do ${formatDay(host?.paidUntil)}` }
    : null

  if (!project?.ssl) {
    return worst([hosting, ...domains])
  }

  const SSL: Record<'ok' | 'soon' | 'bad', TabState> = {
    ok: { tone: 'ok', label: 'certyfikat SSL ważny' },
    soon: { tone: 'warn', label: 'certyfikat SSL wkrótce wygasa' },
    bad: { tone: 'bad', label: 'certyfikat SSL nieprawidłowy' },
  }
  const main = sslState(project, now)
  const others = domainChecks(project, now).map(row => {
    if (row.tone === 'down') {
      return { tone: 'bad', label: `${row.domain}: ${row.text}` } as const
    }

    return row.tone === 'warn' ? { tone: 'warn', label: `${row.domain}: ${row.text}` } as const : null
  })

  return worst([main ? SSL[main] : null, ...others, hosting, ...domains])
}

/** Formularze: as the table's cell – red: failed sends, orange: setup errors or no reCAPTCHA, green: fine */
export function formsTabState (project: Project | null): TabState | null {
  const state = formsState(project?.forms)

  return state ? { tone: state.tone, label: state.label } : null
}

/** Dostęp: production and staging as last checked – red when one is down, green when the checked ones work */
export function accessTabState (project: Project | null): TabState | null {
  const states = (['production', 'staging'] as const).map(env => envStatus(project, env)).filter(state => state !== null)

  if (states.includes('offline')) {
    return { tone: 'bad', label: 'środowisko nie działa' }
  }

  return states.length > 0 ? { tone: 'ok', label: 'środowiska działają' } : null
}

/** Integracje: reCAPTCHA on the site with other keys – red; with the ones typed here – green */
export function integrationsTabState (project: Project | null, siteKey: string | null | undefined, secretHash: string): TabState | null {
  const uses = recaptchaUses(project?.recaptcha, siteKey, secretHash)

  if (uses.some(use => use.tone === 'bad')) {
    return { tone: 'bad', label: 'klucze reCAPTCHA niezgodne' }
  }

  return uses.some(use => use.tone === 'ok') ? { tone: 'ok', label: 'klucze reCAPTCHA zgodne' } : null
}
