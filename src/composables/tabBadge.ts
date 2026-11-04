import { watchEffect } from 'vue'

/**
 * The browser tab tells when sites are down – as Todo's does with what's due: "(1) Projekty", and the favicon turns
 * into the number on red. While the tab is in the background it gently blinks back to the app's mark.
 */

const BLINK_MS = 1500

/** the app's mark – same as public/favicon.svg */
const MARK = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#7a9a3a"/><g fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" transform="translate(13 13) scale(1.583)"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/></g></svg>'

const markUrl = `data:image/svg+xml,${encodeURIComponent(MARK)}`

const icons = new Map<string, string>()

/**
 * The number instead of the mark: white on a red rounded square, "9+" from ten on. Drawn on a canvas so the digits'
 * real ink box can be measured and put dead centre – SVG text baselines differ between browsers and fonts.
 */
function countIcon (count: number): string {
  const text = count > 9 ? '9+' : String(count)
  const cached = icons.get(text)

  if (cached) {
    return cached
  }

  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')

  if (!context) {
    return markUrl
  }

  context.fillStyle = '#c2412d'
  context.beginPath()
  context.roundRect(0, 0, size, size, 16)
  context.fill()

  context.fillStyle = '#fff'
  context.font = `400 ${text.length > 1 ? 32 : 38}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'

  // centre the ink, not the font's line box
  const box = context.measureText(text)
  const width = box.actualBoundingBoxLeft + box.actualBoundingBoxRight
  const height = box.actualBoundingBoxAscent + box.actualBoundingBoxDescent
  const x = (size - width) / 2 + box.actualBoundingBoxLeft
  const y = (size - height) / 2 + box.actualBoundingBoxAscent
  context.fillText(text, x, y)

  const url = canvas.toDataURL('image/png')
  icons.set(text, url)

  return url
}

function iconLink (): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')

  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.append(link)
  }

  return link
}

/** Keeps the tab's title and icon in step with how many sites are down. */
export function useTabBadge (down: () => number): void {
  const title = document.title || 'Projekty'
  let timer: ReturnType<typeof setInterval> | undefined
  let showBadge = true

  function paint (): void {
    const count = down()
    const link = iconLink()
    const href = count > 0 && showBadge ? countIcon(count) : markUrl
    link.type = href.startsWith('data:image/png') ? 'image/png' : 'image/svg+xml'
    link.href = href
  }

  // blinking only while the tab is out of sight – in front it would just distract
  function syncBlink (): void {
    clearInterval(timer)
    showBadge = true

    if (document.hidden && down() > 0) {
      timer = setInterval(() => {
        showBadge = !showBadge
        paint()
      }, BLINK_MS)
    }

    paint()
  }

  watchEffect(() => {
    const count = down()
    document.title = count > 0 ? `(${count}) ${title}` : title
    syncBlink()
  })

  document.addEventListener('visibilitychange', syncBlink)
}
