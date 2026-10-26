/**
 * Runtime config. In production WordPress (wp-plugin-projects) injects `window.__PROJECTS__` into index.html,
 * so the bundle itself holds no URLs, nonces or secrets. In `npm run dev` the defaults below apply.
 */

export interface AppConfig {
  restUrl: string
  nonce: string | null
  nonceUrl: string | null
  basePath: string
  /** the owner – every field, editing; everyone else sees the public list */
  canManage: boolean
  user: { name: string, avatar: string } | null
  loginUrl: string | null
  logoutUrl: string | null
  /** where the sites send their reports – shown with the token */
  reportUrl: string
  todoUrl: string | null
  publicFields: string[]
  /** the newest WordPress release – sites running it are marked; null when unknown */
  latestWordpress: string | null
  siteName: string
  homeUrl: string
  version: string | null
}

declare global {
  interface Window {
    __PROJECTS__?: Partial<AppConfig>
  }
}

const injected: Partial<AppConfig> = (typeof window === 'undefined' ? undefined : window.__PROJECTS__) ?? {}

export const config: AppConfig = {
  restUrl: injected.restUrl ?? import.meta.env.VITE_REST_URL ?? '/wp-json/projects/v1/',
  nonce: injected.nonce ?? null,
  nonceUrl: injected.nonceUrl ?? null,
  basePath: injected.basePath ?? import.meta.env.BASE_URL,
  // dev server: the proxy adds the application password, so editing works
  canManage: injected.canManage ?? import.meta.env.DEV,
  user: injected.user ?? null,
  loginUrl: injected.loginUrl ?? null,
  logoutUrl: injected.logoutUrl ?? null,
  reportUrl: injected.reportUrl ?? '/wp-json/projects/v1/report',
  todoUrl: injected.todoUrl ?? null,
  publicFields: injected.publicFields ?? ['domains', 'status', 'engine', 'version', 'theme'],
  latestWordpress: injected.latestWordpress ?? null,
  siteName: injected.siteName ?? 'kwiatkowski.co',
  homeUrl: injected.homeUrl ?? '/',
  version: injected.version ?? null,
}
