import { computed, ref } from 'vue'

const KEY = 'projects:theme'

/**
 * The themes: the list's own dark (the default) and light, and meden.com.pl's – its navy and turquoise – light and dark.
 * `bg` and `accent` draw the swatch in the list and colour the browser's bar (index.html applies the choice before the
 * first paint).
 */
export const THEMES = [
  { value: 'dark', label: 'Ciemny', bg: '#151513', accent: '#a6c46a' },
  { value: 'light', label: 'Jasny', bg: '#f6f5f1', accent: '#56731c' },
  { value: 'meden-light', label: 'Meden jasny', bg: '#f5f8fb', accent: '#113d89' },
  { value: 'meden-dark', label: 'Meden ciemny', bg: '#0e1a2b', accent: '#18aabf' },
] as const

export type Theme = typeof THEMES[number]['value']

const stored = typeof document === 'undefined' ? 'dark' : document.documentElement.dataset.theme
const theme = ref<Theme>(THEMES.find(item => item.value === stored)?.value ?? 'dark')

const dark = computed(() => theme.value === 'dark' || theme.value === 'meden-dark')

function setTheme (next: Theme): void {
  theme.value = next
  document.documentElement.dataset.theme = next
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEMES.find(item => item.value === next)?.bg ?? '#151513')

  try {
    localStorage.setItem(KEY, next)
  } catch {
    // private mode – the choice just isn't remembered
  }
}

export function useTheme () {
  return { theme, dark, setTheme }
}
