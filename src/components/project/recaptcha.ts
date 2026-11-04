import type { RecaptchaPlace } from '@/types'
import type { Ref } from 'vue'
import { ref, watch } from 'vue'

const PLACES: Record<string, string> = { cf7: 'Contact Form 7', wordfence: 'Wordfence – logowanie' }

/** where the site uses reCAPTCHA – with the keys typed (ok), with others (bad), or unknown / off (none) */
export interface RecaptchaUse {
  place: string
  label: string
  tone: 'ok' | 'bad' | 'none'
  text: string
}

/** the places the last report saw, each against the keys typed in the form (the secret by its SHA-256) */
export function recaptchaUses (places: RecaptchaPlace[] | null | undefined, typedSiteKey: string | null | undefined, secretHash: string): RecaptchaUse[] {
  const siteKey = (typedSiteKey ?? '').trim()

  return (places ?? []).map(place => {
    const off = place.enabled ? '' : ' – wyłączone'
    const label = PLACES[place.place] ?? place.place

    if (!place.siteKey) {
      return { place: place.place, label, tone: 'none', text: 'bez kluczy' }
    }

    if (!siteKey) {
      return { place: place.place, label, tone: 'none', text: `klucz witryny ${place.siteKey.slice(0, 10)}…${off}` }
    }

    if (place.siteKey !== siteKey) {
      return { place: place.place, label, tone: 'bad', text: `inny klucz witryny${off}` }
    }

    if (secretHash && place.secretHash && place.secretHash !== secretHash) {
      return { place: place.place, label, tone: 'bad', text: `inny klucz tajny${off}` }
    }

    return { place: place.place, label, tone: place.enabled ? 'ok' : 'none', text: (secretHash && place.secretHash ? 'klucze zgodne' : 'klucz witryny zgodny') + off }
  })
}

/** the typed secret's SHA-256 – the report has the site's only so; '' – none typed */
export function useSecretHash (secret: () => string): Ref<string> {
  const hash = ref('')

  watch(secret, async typed => {
    const value = typed.trim()
    const digest = value ? new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))) : null
    // a newer one typed meanwhile wins
    if (typed === secret()) {
      hash.value = digest ? [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('') : ''
    }
  }, { immediate: true })

  return hash
}
