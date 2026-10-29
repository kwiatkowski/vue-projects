import type { HistoryCheck, HistoryEvent, Status } from '@/types'
import { STATUS_LABELS } from '@/utils/projects'

/** a half-hour of checks in the response-time chart */
export interface Bucket {
  from: Date
  /** the mean response time of the checks that were up; null – none were */
  ms: number | null
  /** how many checks failed, of how many */
  down: number
  total: number
}

/**
 * The last `count` periods of `minutes`, oldest first – the checks grouped into them (a day of 5-minute checks is too
 * many bars to read, 48 half-hours aren't).
 */
export function buckets (checks: HistoryCheck[], now: Date = new Date(), count = 48, minutes = 30): Bucket[] {
  const size = minutes * 60_000
  const end = Math.ceil(now.getTime() / size) * size
  const start = end - count * size
  const result: Bucket[] = Array.from({ length: count }, (_, index) => ({ from: new Date(start + index * size), ms: null, down: 0, total: 0 }))
  const sums = Array.from({ length: count }, () => ({ ms: 0, n: 0 }))

  for (const check of checks) {
    const index = Math.floor((new Date(check.at).getTime() - start) / size)
    const bucket = result[index]
    const sum = sums[index]

    if (!bucket || !sum) {
      continue
    }

    bucket.total++

    if (!check.up) {
      bucket.down++
    } else if (check.ms !== null) {
      sum.ms += check.ms
      sum.n++
    }
  }

  for (const [index, bucket] of result.entries()) {
    const sum = sums[index]
    bucket.ms = sum && sum.n > 0 ? Math.round(sum.ms / sum.n) : null
  }

  return result
}

/** "99,95 %" – "–" when never checked */
export function formatUptime (value: number | null | undefined): string {
  return value === null || value === undefined ? '–' : `${value.toLocaleString('pl', { maximumFractionDigits: 2 })} %`
}

/** "640 ms", "1,2 s" */
export function formatMs (value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '–'
  }

  return value < 1000 ? `${value} ms` : `${(value / 1000).toLocaleString('pl', { maximumFractionDigits: 1 })} s`
}

/** "45 min", "2 h 15 min", "3 dni 4 h" */
export function formatDuration (minutes: number): string {
  if (minutes < 60) {
    return `${Math.max(minutes, 1)} min`
  }

  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const rest = minutes % 60

  return days > 0 ? `${days} ${days === 1 ? 'dzień' : 'dni'}${hours ? ` ${hours} h` : ''}` : `${hours} h${rest ? ` ${rest} min` : ''}`
}

/** what a report's change is about – as in MK Core's `wp projects-report` */
const FIELD_LABELS: Record<string, string> = {
  php: 'PHP',
  engine: 'Silnik',
  version: 'WordPress',
  theme: 'Motyw',
  bedrock: 'Bedrock',
  security: 'Wordfence',
  acf: 'ACF',
  miModal: 'MI Modal',
  deploy: 'Deploy (git na produkcji)',
  repo: 'Repozytorium',
  users: 'Użytkownicy',
  status: 'Status',
}

function value (raw: unknown): string {
  if ([null, undefined, ''].includes(raw as string | null | undefined)) {
    return '–'
  }

  if (typeof raw === 'boolean') {
    return raw ? 'tak' : 'nie'
  }

  return STATUS_LABELS[raw as Status] ?? String(raw)
}

/** one event in words, e.g. "Contact Form 7: 5.9 → 6.0", "Administrator: 1 → 2", "Status: online → offline" */
export function describeEvent (event: HistoryEvent): string {
  const data = event.data
  const what = String(data.what ?? '')

  if (what === 'plugin') {
    const name = String(data.name ?? '')

    if (data.from === null) {
      return `Wtyczka ${name}: nowa (${value(data.to)})`
    }

    return data.to === null ? `Wtyczka ${name}: usunięta` : `Wtyczka ${name}: ${value(data.from)} → ${value(data.to)}`
  }

  if (what === 'role') {
    return `${String(data.name ?? data.role ?? '')}: ${value(data.from)} → ${value(data.to)}`
  }

  if (event.type === 'change' || event.type === 'status') {
    return `${FIELD_LABELS[what] ?? what}: ${value(data.from)} → ${value(data.to)}`
  }

  return String(data.text ?? event.type)
}
