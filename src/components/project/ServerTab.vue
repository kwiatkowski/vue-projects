<template>
  <div class="stack">
    <label class="field">
      <span>Hosting</span>

      <CopyInput
        v-model="form.server"
        placeholder="hostido.pl"
        tip="Kopiuj hosting"
        type="text"
        what="Hosting"
      />
    </label>

    <label class="field">
      <span>Adres panelu</span>

      <CopyInput
        v-model="form.serverUrl"
        placeholder="https://…"
        tip="Kopiuj adres panelu"
        type="url"
        what="Adres panelu"
      />
    </label>

    <label class="field">
      <span>Nazwa konta</span>

      <CopyInput
        v-model="form.serverAccount"
        class="mono"
        tip="Kopiuj nazwę konta"
        type="text"
        what="Nazwa konta"
      />
    </label>
  </div>

  <!-- the TLS certificate as the list saw it at its last pull – read only -->
  <fieldset v-if="project?.domains.length" class="group ssl">
    <legend class="eyebrow">Certyfikat SSL <span class="group__note">– sprawdza lista przy pobieraniu raportów</span></legend>

    <div v-if="project.ssl" class="grid">
      <label class="field">
        <span>Stan <span class="reported-mark">*</span></span>

        <input
          class="input"
          :class="`ssl__state--${sslInfo?.state}`"
          disabled
          type="text"
          :value="sslInfo?.text"
        >
      </label>

      <label class="field">
        <span>Ważny do <span class="reported-mark">*</span></span>
        <input class="input mono" disabled type="text" :value="sslInfo?.validTo">
      </label>

      <label class="field">
        <span>Wystawca <span class="reported-mark">*</span></span>
        <input class="input" disabled type="text" :value="project.ssl.issuer ?? '–'">
      </label>

      <label class="field">
        <span>Sprawdzono <span class="reported-mark">*</span></span>
        <input class="input mono" disabled type="text" :value="formatDateTime(project.ssl.checkedAt)">
      </label>
    </div>

    <p v-else class="faint">Lista jeszcze nie sprawdzała certyfikatu – sprawdzi go przy najbliższym pobieraniu raportów.</p>

    <!-- the site's other domains – each its own certificate and answer -->
    <dl v-if="others.length > 0" class="ssl__others">
      <template v-for="row in others" :key="row.domain">
        <dt class="mono">{{ row.domain }}</dt>
        <dd><span :class="`ssl__tone--${row.tone}`">{{ row.text }}</span><span v-if="row.ssl" class="faint"> · {{ row.ssl }}</span></dd>
      </template>
    </dl>
  </fieldset>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { useProjectForm } from '@/components/project/form'
  import CopyInput from '@/components/ui/CopyInput.vue'
  import { domainChecks, formatDateTime, formatDay, sslDaysLeft, sslState } from '@/utils/projects'

  /** "Serwer": the hosting, its panel and account; the certificate as the list saw it */
  const { form, project } = useProjectForm()

  /** the site's other domains: what they answer, their certificates */
  const others = computed(() => project.value ? domainChecks(project.value) : [])

  /** the certificate: fine, running out soon, or why not; until when and how long still */
  const sslInfo = computed(() => {
    const ssl = project.value?.ssl

    if (!project.value || !ssl) {
      return null
    }

    const state = sslState(project.value)
    const days = sslDaysLeft(project.value)

    return {
      state,
      text: state === 'bad' ? (ssl.error ?? 'błąd') : (state === 'soon' ? `ważny, wygasa za ${days} dni` : 'ważny'),
      validTo: ssl.validTo ? `${formatDay(ssl.validTo)}${days === null ? '' : ` (${days} dni)`}` : '–',
    }
  })
</script>

<style scoped>
/* the other domains under the home page's certificate – domain, then what it answers and its certificate */
.ssl__others {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 16px;
  margin: 16px 0 0;
  font-size: 13px;
}

.ssl__others dd {
  margin: 0;
}

.ssl__tone--ok {
  color: var(--positive);
}

.ssl__tone--warn {
  color: var(--warn);
}

.ssl__tone--down {
  color: var(--danger);
}

/* the certificate under the server's fields; its state in the colour of the report's mark */
.ssl {
  margin-top: 20px;
}

.ssl .input.ssl__state--ok {
  color: var(--positive);
}

.ssl .input.ssl__state--soon {
  color: var(--warn);
}

.ssl .input.ssl__state--bad {
  color: var(--danger);
}
</style>
