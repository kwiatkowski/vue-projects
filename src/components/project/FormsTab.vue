<template>
  <!-- the site's forms as its report tells (plugin_meden 1.23.0 / MK Core): how mail goes out, then each form -->
  <p v-if="!project?.forms" class="faint">
    <template v-if="project?.reportedAt">Raport strony nie zgłasza formularzy – brak Contact Form 7 albo starsza wersja ({{ project.reporter ?? 'nieznana' }}; potrzebny plugin_meden 1.23.0).</template>
    <template v-else>Formularze pojawią się z pierwszym raportem strony.</template>
  </p>

  <div v-else class="forms">
    <SectionCard :icon="Settings2" title="Integracje">
      <dl class="facts">
        <dt>Contact Form 7</dt>
        <dd>{{ forms!.cf7 ?? 'brak' }}</dd>

        <dt>reCAPTCHA</dt>
        <dd :class="forms!.recaptcha ? 'ok' : 'warn'">{{ forms!.recaptcha ? 'włączona' : 'wyłączona – formularze bez ochrony przed spamem' }}</dd>

        <dt>Wysyłka poczty</dt>
        <dd :class="{ warn: !forms!.mailer }">{{ forms!.mailer ? `WP Mail SMTP (${forms!.mailer})` : 'mail() serwera – bez SMTP, wiadomości łatwiej trafiają do spamu' }}</dd>

        <dt>Zapis wiadomości</dt>
        <dd>{{ forms!.flamingo ? 'Flamingo – wiadomości zapisywane w bazie' : 'brak (Flamingo nieaktywne)' }}</dd>

        <template v-if="forms!.others.length > 0">
          <dt>Inne wtyczki</dt>
          <dd>{{ forms!.others.join(', ') }}</dd>
        </template>
      </dl>
    </SectionCard>

    <p v-if="forms!.items.length === 0" class="faint">Strona nie ma żadnego formularza Contact Form 7.</p>

    <SectionCard
      v-for="form in forms!.items"
      :key="`${form.site}-${form.id}`"
      :icon="Mail"
      :note="form.site ? hostOf(form.site) : undefined"
      :title="form.title"
    >
      <template #status>
        <span :class="`state state--${toneOf(form)}`">{{ stateOf(form) }}</span>
      </template>

      <dl class="facts">
        <dt>Pola</dt>
        <dd class="mono">{{ form.fields }}</dd>

        <dt>Odbiorca</dt>
        <dd class="mono">{{ form.recipient ?? '–' }}</dd>

        <dt>Ostatnie 30 dni</dt>

        <dd>
          <span class="mono">{{ form.sent }}</span> wysłanych ·
          <span class="mono" :class="{ bad: form.failed > 0 }">{{ form.failed }}</span> nieudanych ·
          <span class="mono">{{ form.spam }}</span> spam
        </dd>

        <template v-if="form.lastError">
          <dt>Ostatni błąd</dt>
          <dd class="bad">{{ formatDateTime(form.lastError.at) }} – {{ form.lastError.message }}</dd>
        </template>

        <template v-if="form.configErrors.length > 0">
          <dt>Konfiguracja</dt>

          <dd class="warn">
            <div v-for="message in form.configErrors" :key="message">{{ message }}</div>
          </dd>
        </template>

        <dt>Strony</dt>

        <dd>
          <ul v-if="form.pages.length > 0" class="pages">
            <li v-for="page in form.pages" :key="page.url">
              <a :href="page.url" rel="noopener" target="_blank">{{ page.title || page.url }} <ArrowUpRight /></a>
              <span class="faint mono">{{ pathOf(page.url) }}</span>
            </li>
          </ul>

          <span v-else class="faint">nie znaleziono w treści stron (może być w szablonie motywu)</span>
        </dd>
      </dl>
    </SectionCard>
  </div>
</template>

<script lang="ts" setup>
  import type { FormItem } from '@/types'
  import { ArrowUpRight, Mail, Settings2 } from 'lucide-vue-next'
  import { computed } from 'vue'
  import { useProjectForm } from '@/components/project/form'
  import SectionCard from '@/components/ui/SectionCard.vue'
  import { formatDateTime } from '@/utils/projects'

  /** "Formularze": the integrations, then each form – its fields, recipient, sends, errors and the pages it is on. */
  const { project } = useProjectForm()

  const forms = computed(() => project.value?.forms ?? null)

  const toneOf = (form: FormItem): 'ok' | 'warn' | 'bad' => form.failed > 0 ? 'bad' : (form.configErrors.length > 0 || form.pages.length === 0 ? 'warn' : 'ok')

  function stateOf (form: FormItem): string {
    if (form.failed > 0) {
      return 'nieudane wysyłki'
    }

    if (form.configErrors.length > 0) {
      return 'błędy konfiguracji'
    }

    return form.pages.length === 0 ? 'nieużywany' : 'działa'
  }

  const hostOf = (url: string) => url.replace(/^https?:\/\//, '')
  function pathOf (url: string) {
    try {
      return new URL(url).pathname
    } catch {
      return url
    }
  }
</script>

<style scoped>
.forms {
  display: grid;
  gap: 12px;
}

.facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 16px;
  margin: 0;
  font-size: 13px;
}

.facts dt {
  color: var(--text-2);
}

.facts dd {
  margin: 0;
}

.ok,
.state--ok {
  color: var(--positive);
}

.warn,
.state--warn {
  color: var(--warn);
}

.bad,
.state--bad {
  color: var(--danger);
}

.pages {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pages li {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.pages a {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.pages svg {
  width: 12px;
  height: 12px;
}
</style>
