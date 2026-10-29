<template>
  <!-- reCAPTCHA v3: the site key, and the secret one kept encrypted like the passwords -->
  <fieldset class="group">
    <legend class="eyebrow">reCAPTCHA v3</legend>

    <div class="stack">
      <label class="field">
        <span>Klucz witryny</span>

        <CopyInput
          v-model="form.recaptchaSiteKey"
          autocomplete="off"
          class="mono"
          tip="Kopiuj klucz witryny"
          type="text"
          what="Klucz witryny reCAPTCHA"
        />
      </label>

      <label class="field">
        <span>Klucz tajny</span>
        <PasswordInput v-model="secrets.values.recaptcha" v-model:shown="secrets.shown.recaptcha" :loading="secrets.loading.recaptcha" what="Klucz tajny reCAPTCHA" />
      </label>
    </div>

    <!-- where the site uses reCAPTCHA (the last report) – and whether with these keys -->
    <ul v-if="recaptchaPlaces.length > 0" class="recaptcha-places">
      <li v-for="item in recaptchaPlaces" :key="item.place" :class="`recaptcha-places__item--${item.tone}`">
        <component :is="item.tone === 'ok' ? Check : (item.tone === 'bad' ? X : Minus)" />
        <span>{{ item.label }}</span>
        <span class="faint">{{ item.text }}</span>
      </li>
    </ul>

    <template v-else-if="project?.reportedAt">
      <p v-if="project.recaptcha" class="faint recaptcha-places__none">Raport nie widzi na stronie Contact Form 7 ani Wordfence.</p>
      <p v-else class="faint recaptcha-places__none">Raport strony jeszcze tego nie sprawdza ({{ project.reporter ?? 'starsza wersja' }}) – potrzebny plugin_meden 1.15.0.</p>
    </template>
  </fieldset>
</template>

<script lang="ts" setup>
  import { Check, Minus, X } from 'lucide-vue-next'
  import { computed, ref, watch } from 'vue'
  import { useProjectForm } from '@/components/project/form'
  import CopyInput from '@/components/ui/CopyInput.vue'
  import PasswordInput from '@/components/ui/PasswordInput.vue'

  /** "Integracje": reCAPTCHA v3's keys, and where the site uses them */
  const { form, project, secrets } = useProjectForm()

  /** the typed secret's SHA-256 – the report has the site's only so; '' – none typed */
  const recaptchaSecretHash = ref('')

  watch(() => secrets.values.recaptcha, async secret => {
    const value = secret.trim()
    const digest = value ? new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))) : null
    // a newer one typed meanwhile wins
    if (secret === secrets.values.recaptcha) {
      recaptchaSecretHash.value = digest ? [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('') : ''
    }
  })

  const RECAPTCHA_PLACES: Record<string, string> = { cf7: 'Contact Form 7', wordfence: 'Wordfence – logowanie' }

  /** where the site uses reCAPTCHA (the last report) – a tick when with the keys above, a cross when with others */
  const recaptchaPlaces = computed(() => (project.value?.recaptcha ?? []).map(place => {
    const siteKey = (form.value.recaptchaSiteKey ?? '').trim()
    const off = place.enabled ? '' : ' – wyłączone'
    const label = RECAPTCHA_PLACES[place.place] ?? place.place

    if (!place.siteKey) {
      return { place: place.place, label, tone: 'none', text: 'bez kluczy' }
    }

    if (!siteKey) {
      return { place: place.place, label, tone: 'none', text: `klucz witryny ${place.siteKey.slice(0, 10)}…${off}` }
    }

    if (place.siteKey !== siteKey) {
      return { place: place.place, label, tone: 'bad', text: `inny klucz witryny${off}` }
    }

    if (recaptchaSecretHash.value && place.secretHash && place.secretHash !== recaptchaSecretHash.value) {
      return { place: place.place, label, tone: 'bad', text: `inny klucz tajny${off}` }
    }

    return { place: place.place, label, tone: place.enabled ? 'ok' : 'none', text: (recaptchaSecretHash.value && place.secretHash ? 'klucze zgodne' : 'klucz witryny zgodny') + off }
  }))
</script>

<style scoped>
/* where the site uses reCAPTCHA – a tick with the project's keys, a cross with others, a dash otherwise */
.recaptcha-places {
  display: grid;
  gap: 4px;
  margin: 12px 0 0;
  padding: 0;
  font-size: 13px;
  list-style: none;
}

.recaptcha-places li {
  display: flex;
  align-items: center;
  gap: 6px;
}

.recaptcha-places svg {
  flex: none;
  width: 15px;
  height: 15px;
  color: var(--text-3);
}

.recaptcha-places__item--ok svg {
  color: var(--positive);
}

.recaptcha-places__item--bad svg {
  color: var(--danger);
}

.recaptcha-places__none {
  margin: 12px 0 0;
  font-size: 13px;
}
</style>
