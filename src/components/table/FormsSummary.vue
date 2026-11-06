<template>
  <!-- the forms in the report's style: a header with the integrations, then each form – its sends, its pages -->
  <div class="report-tip__title">
    <span>Formularze: {{ forms.items.length }}</span>

    <span class="faint forms-tip__flags">
      reCAPTCHA <span :class="forms.recaptcha ? 'ok' : 'warn'">{{ forms.recaptcha ? '✓' : '✕' }}</span>
      · poczta: {{ forms.mailer ?? 'mail() serwera' }}
      <template v-if="forms.flamingo"> · Flamingo</template>
    </span>
  </div>

  <p v-if="forms.others.length > 0" class="faint forms-tip__others">Inne wtyczki formularzy: {{ forms.others.join(', ') }}</p>

  <div v-for="form in forms.items" :key="`${form.site}-${form.id}`" class="forms-tip__form">
    <div class="report-tip__row">
      <strong>{{ form.title }}</strong>

      <span class="mono forms-tip__counts">
        <span>{{ form.sent }} wysł.</span>
        <span :class="{ bad: form.failed > 0 }">{{ form.failed }} błędów</span>
        <span class="faint">{{ form.spam }} spam</span>
      </span>
    </div>

    <p v-if="form.lastError" class="forms-tip__error">Ostatni błąd {{ formatDateTime(form.lastError.at) }}: {{ form.lastError.message }}</p>
    <p v-for="message in form.configErrors" :key="message" class="forms-tip__setup">{{ message }}</p>

    <ul v-if="form.pages.length > 0" class="forms-tip__pages">
      <li v-for="page in form.pages" :key="page.url"><a :href="page.url" rel="noopener" target="_blank">{{ shortUrl(page.url) }}</a></li>
    </ul>

    <p v-else class="faint forms-tip__none">nie znaleziono na żadnej stronie</p>
  </div>
</template>

<script lang="ts" setup>
  import type { FormsReport } from '@/types'
  import { formatDateTime } from '@/utils/projects'

  /** What the report says about the site's forms – the "Formularze" cell's popup. */
  defineProps<{ forms: FormsReport }>()

  /** the address without the scheme – the path is what tells pages apart */
  const shortUrl = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '')
</script>

<style scoped>
.forms-tip__flags {
  font-size: 12px;
}

.ok {
  color: var(--positive);
}

.warn,
.bad {
  color: var(--danger);
}

.forms-tip__others {
  margin: 6px 0 0;
  font-size: 12px;
}

.forms-tip__form {
  display: grid;
  gap: 2px;
  margin-top: 8px;
}

.forms-tip__counts {
  display: inline-flex;
  gap: 10px;
  font-size: 12px;
}

.forms-tip__error,
.forms-tip__setup {
  max-width: 420px;
  margin: 0;
  color: var(--danger);
  font-size: 12px;
}

.forms-tip__setup {
  color: var(--warn);
}

.forms-tip__pages {
  margin: 0;
  padding: 0;
  font-size: 12px;
  list-style: none;
}

.forms-tip__pages a {
  color: var(--text-2);
}

.forms-tip__pages a:hover {
  color: var(--text);
}

.forms-tip__none {
  margin: 0;
  font-size: 12px;
}
</style>
