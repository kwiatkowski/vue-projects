import { request } from '@/api/client'
import { config } from '@/config'
import { useProjectsStore } from '@/stores/projects'

/** at most this many reports from one page – a broken loop mustn't flood the server */
const LIMIT = 10
const sent = new Set<string>()

/**
 * Sends an error the app met to the server (ClientErrors – `wp projects-errors` reads them): what, where in the code,
 * the open project, the version, the browser. Once per kind; never throws – a report that fails is let go.
 */
export function reportError (error: unknown, info = ''): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? (error.stack ?? '') : ''
  const key = `${message}\n${stack.split('\n', 2)[1] ?? ''}`

  if (sent.has(key) || sent.size >= LIMIT || config.view === 'guest') {
    return
  }

  sent.add(key)

  let project = ''

  try {
    const editing = useProjectsStore().editing
    project = editing === 'new' ? 'nowy' : (editing ? `${editing.id} ${editing.name}` : '')
  } catch {
    // no store yet
  }

  void request('POST', '/client-errors', {
    message,
    stack,
    info,
    url: window.location.href,
    project,
    version: config.version ?? '',
    agent: navigator.userAgent,
  }).catch(() => {})
}
