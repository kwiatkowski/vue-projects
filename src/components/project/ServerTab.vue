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
  </fieldset>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { useProjectForm } from '@/components/project/form'
  import CopyInput from '@/components/ui/CopyInput.vue'
  import { formatDateTime, formatDay, sslDaysLeft, sslState } from '@/utils/projects'

  /** "Serwer": the hosting, its panel and account; the certificate as the list saw it */
  const { form, project } = useProjectForm()

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
