<template>
  <BaseDialog
    v-model="columns.alertsOpen"
    :can-close="() => !dirty"
    title="Powiadomienia"
    :width="820"
    @submit="save"
  >
    <p v-if="!form" class="faint">Wczytuję…</p>

    <div v-else class="alerts">
      <!-- e-mail: the recipients, and the SMTP server it goes through (without one – WordPress's own mail) -->
      <fieldset class="group">
        <legend class="eyebrow">E-mail</legend>

        <label class="check"><input v-model="form.email.enabled" type="checkbox"> Wysyłaj e-mailem</label>

        <label class="field">
          <span>Odbiorcy <span class="faint">– po przecinku</span></span>
          <input v-model.trim="form.email.to" class="input" placeholder="ty@przyklad.pl" type="text">
        </label>

        <div class="grid grid--3">
          <label class="field">
            <span>Serwer SMTP</span>

            <input
              v-model.trim="form.smtp.host"
              autocomplete="off"
              class="input"
              placeholder="np. smtp.gmail.com"
              type="text"
            >
          </label>

          <label class="field">
            <span>Port</span>

            <input
              v-model.number="form.smtp.port"
              class="input mono"
              max="65535"
              min="1"
              type="number"
            >
          </label>

          <label class="field">
            <span>Szyfrowanie</span>
            <SelectField v-model="form.smtp.secure" :clearable="false" label="Szyfrowanie" :options="SECURE_OPTIONS" />
          </label>

          <label class="field">
            <span>Login SMTP</span>
            <input v-model.trim="form.smtp.user" autocomplete="off" class="input" type="text">
          </label>

          <label class="field">
            <span>Hasło SMTP</span>
            <PasswordInput v-model="smtpPassword" v-model:shown="shown.smtp" what="Hasło SMTP" />
          </label>

          <label class="field">
            <span>Nadawca</span>
            <input v-model.trim="form.smtp.from" class="input" placeholder="lista@przyklad.pl" type="email">
          </label>
        </div>

        <p class="faint hint">
          <template v-if="!form.smtp.host">Bez serwera SMTP wysyła zwykła poczta WordPressa – może trafiać do spamu.</template>
          <template v-else-if="form.hasSmtpPassword && !smtpPassword">Hasło SMTP jest zapisane (zaszyfrowane) – wpisz nowe, żeby je zmienić.</template>
          <template v-else>Hasło zapisuje się zaszyfrowane, jak hasła projektów.</template>
        </p>

        <div class="row">
          <button class="btn btn--sm btn--outline" :disabled="dirty || testing !== null" type="button" @click="test('email')">
            <Send /> {{ testing === 'email-test' ? 'Wysyłam…' : 'Wyślij test' }}
          </button>

          <span v-if="dirty" class="faint">Zapisz zmiany, żeby wysłać test.</span>
        </div>
      </fieldset>

      <!-- Slack: an incoming webhook of a channel – a secret, kept encrypted -->
      <fieldset class="group">
        <legend class="eyebrow">Slack</legend>

        <label class="check"><input v-model="form.slack.enabled" type="checkbox"> Wysyłaj na Slacka</label>

        <label class="field">
          <span>Webhook kanału <span class="faint">– Slack: Apps → Incoming Webhooks</span></span>
          <PasswordInput v-model="slackWebhook" v-model:shown="shown.slack" what="Webhook Slacka" />
        </label>

        <p v-if="form.hasSlackWebhook && !slackWebhook" class="faint hint">Webhook jest zapisany (zaszyfrowany) – wpisz nowy, żeby go zmienić.</p>

        <div class="row">
          <button class="btn btn--sm btn--outline" :disabled="dirty || testing !== null" type="button" @click="test('slack')">
            <Send /> {{ testing === 'slack-test' ? 'Wysyłam…' : 'Wyślij test' }}
          </button>
        </div>
      </fieldset>

      <!-- the rules: which goes where; a parameter where the rule has one -->
      <fieldset class="group">
        <legend class="eyebrow">Reguły</legend>

        <table class="rules">
          <thead>
            <tr>
              <th scope="col"><span class="visually-hidden">Włączona</span></th>
              <th scope="col">Kiedy</th>
              <th scope="col">Próg</th>
              <th class="rules__channel" scope="col">E-mail</th>
              <th class="rules__channel" scope="col">Slack</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="rule in RULES" :key="rule.key" :class="{ 'rules__row--off': !form.rules[rule.key].enabled }">
              <td><input v-model="form.rules[rule.key].enabled" :aria-label="`${rule.label} – włączona`" type="checkbox"></td>
              <td>{{ rule.label }}</td>

              <td>
                <span v-if="rule.param" class="rules__param">
                  <input
                    v-model.number="form.rules[rule.key][rule.param]"
                    :aria-label="`${rule.label} – ${rule.unit}`"
                    class="input mono"
                    :max="rule.max"
                    min="1"
                    type="number"
                  >

                  <span class="faint">{{ rule.unit }}</span>
                </span>
              </td>

              <td v-for="channel in CHANNELS" :key="channel" class="rules__channel">
                <input v-model="form.rules[rule.key].channels" :aria-label="`${rule.label} – ${channel}`" type="checkbox" :value="channel">
              </td>
            </tr>
          </tbody>
        </table>

        <p class="faint hint">Sprawdzenie co 5 minut; strona „nie działa” dopiero po progu nieudanych sprawdzeń z rzędu (każde z ponowieniem po 5 s). Wyciszony projekt nic nie wysyła – aktualizacja z listy wycisza go na 30 minut.</p>
      </fieldset>

      <!-- the weekly summary: when, where -->
      <fieldset class="group">
        <legend class="eyebrow">Podsumowanie tygodniowe</legend>

        <label class="check"><input v-model="form.weekly.enabled" type="checkbox"> Wysyłaj co tydzień: do aktualizacji, niedostępność, podatności, wygasające SSL, brak raportów</label>

        <div class="grid grid--4">
          <label class="field">
            <span>Dzień</span>
            <SelectField v-model="form.weekly.day" :clearable="false" label="Dzień" :options="DAYS" />
          </label>

          <label class="field">
            <span>Godzina</span>
            <SelectField v-model="form.weekly.hour" :clearable="false" label="Godzina" :options="HOURS" />
          </label>

          <div class="field">
            <span>Kanały</span>

            <div class="checks">
              <label v-for="channel in CHANNELS" :key="channel" class="check">
                <input v-model="form.weekly.channels" type="checkbox" :value="channel"> {{ CHANNEL_LABELS[channel] }}
              </label>
            </div>
          </div>

          <div class="field">
            <span>Teraz</span>

            <button class="btn btn--sm btn--outline" :disabled="dirty || testing !== null || form.weekly.channels.length === 0" type="button" @click="sendWeekly">
              <Send /> {{ testing?.endsWith('weekly') ? 'Wysyłam…' : 'Wyślij podsumowanie' }}
            </button>
          </div>
        </div>
      </fieldset>
    </div>

    <template #actions>
      <!-- as the other dialogs: with changes made the only ways out are saving or dropping them -->
      <template v-if="dirty">
        <span class="unsaved"><AlertTriangle /> Niezapisane zmiany</span>
        <span style="flex: 1" />

        <button class="btn btn--danger btn--sm" type="button" @click="columns.alertsOpen = false">
          <X /> Zamknij bez zapisywania
        </button>
      </template>

      <template v-else>
        <span style="flex: 1" />

        <button class="btn btn--sm" type="button" @click="columns.alertsOpen = false">
          <X /> Anuluj
        </button>
      </template>

      <button class="btn btn--accent btn--sm" :disabled="!dirty || busy" type="submit">
        <Check /> Zapisz
      </button>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
  import type { AlertChannel, AlertRuleKey, AlertSettings } from '@/types'
  import { AlertTriangle, Check, Send, X } from 'lucide-vue-next'
  import { computed, reactive, ref, watch } from 'vue'
  import { alertsApi } from '@/api/projects'
  import BaseDialog from '@/components/ui/BaseDialog.vue'
  import PasswordInput from '@/components/ui/PasswordInput.vue'
  import SelectField from '@/components/ui/SelectField.vue'
  import { useColumnsStore } from '@/stores/columns'
  import { useNotifyStore } from '@/stores/notify'

  /** "Powiadomienia" (the owner's, under the photo): e-mail (SMTP) and Slack, the rules, the weekly summary */
  const columns = useColumnsStore()
  const notify = useNotifyStore()

  const CHANNELS: AlertChannel[] = ['email', 'slack']
  const CHANNEL_LABELS: Record<AlertChannel, string> = { email: 'E-mail', slack: 'Slack' }

  const RULES: Array<{ key: AlertRuleKey, label: string, param?: 'after' | 'days' | 'hours', unit?: string, max?: number }> = [
    { key: 'down', label: 'Strona nie działa', param: 'after', unit: 'sprawdzeń z rzędu', max: 48 },
    { key: 'recovery', label: 'Strona znów działa' },
    { key: 'staging', label: 'Staging nie działa / znów działa', param: 'after', unit: 'sprawdzeń z rzędu', max: 48 },
    { key: 'ssl', label: 'Certyfikat SSL wygasa lub jest zły', param: 'days', unit: 'dni przed końcem', max: 90 },
    { key: 'report', label: 'Brak raportu strony', param: 'hours', unit: 'godzin', max: 168 },
    { key: 'vulnerability', label: 'Nowa podatność wtyczki' },
  ]

  const SECURE_OPTIONS: Array<{ value: AlertSettings['smtp']['secure'], label: string }> = [
    { value: 'tls', label: 'STARTTLS (587)' },
    { value: 'ssl', label: 'SSL (465)' },
    { value: '', label: 'brak' },
  ]

  const DAYS = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'].map((label, index) => ({ value: index + 1, label }))
  const HOURS = Array.from({ length: 24 }, (_, hour) => ({ value: hour, label: `${String(hour).padStart(2, '0')}:00` }))

  const form = ref<AlertSettings | null>(null)
  const initial = ref('')
  const smtpPassword = ref('')
  const slackWebhook = ref('')
  const shown = reactive({ smtp: false, slack: false })
  const busy = ref(false)
  /** which test is on its way – "email-test", "slack-weekly" … */
  const testing = ref<string | null>(null)

  const dirty = computed(() => form.value !== null && (JSON.stringify(form.value) !== initial.value || smtpPassword.value !== '' || slackWebhook.value !== ''))

  function take (settings: AlertSettings): void {
    form.value = settings
    initial.value = JSON.stringify(settings)
    smtpPassword.value = slackWebhook.value = ''
    shown.smtp = shown.slack = false
  }

  // every opening starts from what is saved
  watch(() => columns.alertsOpen, async open => {
    if (open) {
      form.value = null

      try {
        take(await alertsApi.get())
      } catch (error) {
        notify.error(error)
        columns.alertsOpen = false
      }
    }
  })

  async function save (): Promise<void> {
    if (!form.value || !dirty.value) {
      return
    }

    busy.value = true

    try {
      take(await alertsApi.save(form.value, smtpPassword.value || undefined, slackWebhook.value || undefined))
      notify.show('Powiadomienia zapisane.')
    } catch (error) {
      notify.error(error)
    }

    busy.value = false
  }

  async function test (channel: AlertChannel, what: 'test' | 'weekly' = 'test'): Promise<void> {
    testing.value = `${channel}-${what}`

    try {
      await alertsApi.test(channel, what)
      notify.show(what === 'weekly' ? `Podsumowanie wysłane (${CHANNEL_LABELS[channel]}).` : `Test wysłany (${CHANNEL_LABELS[channel]}).`)
    } catch (error) {
      notify.error(error)
    }

    testing.value = null
  }

  async function sendWeekly (): Promise<void> {
    for (const channel of form.value?.weekly.channels ?? []) {
      await test(channel, 'weekly')
    }
  }
</script>

<style scoped>
.alerts {
  display: grid;
  gap: 18px;
}

.group {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 14px 0 0;
  border: 0;
  border-top: 1px solid var(--line);
}

.group:first-child {
  padding-top: 0;
  border-top: 0;
}

.group legend {
  float: left;
  width: 100%;
  margin-bottom: 2px;
}

.grid {
  display: grid;
  gap: 12px;
}

.grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.grid--4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: end;
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
}

.checks {
  display: flex;
  gap: 14px;
  min-height: 36px;
  align-items: center;
}

.hint {
  margin: 0;
  font-size: 12px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

/* the rules: one per row – on, what, its threshold, the channels */
.rules {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.rules th {
  padding: 4px 8px;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 500;
  text-align: left;
}

.rules td {
  padding: 6px 8px;
  border-top: 1px solid var(--line);
  vertical-align: middle;
}

.rules td:first-child,
.rules th:first-child {
  width: 1%;
  padding-left: 0;
}

.rules__channel {
  width: 1%;
  text-align: center !important;
}

.rules__row--off td:not(:first-child) {
  opacity: .5;
}

.rules__param {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.rules__param .input {
  width: 72px;
}

.unsaved {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--warn);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.unsaved svg {
  width: 16px;
  height: 16px;
}

@media (max-width: 720px) {
  .grid--3,
  .grid--4 {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
