<template>
  <!-- one section per environment: its addresses (open, copy), then its logins -->
  <div class="access">
    <!-- the panel's login and password – the same on production, staging and the local copy -->
    <fieldset class="group">
      <legend class="eyebrow">Logowanie do panelu <span class="group__note">– wszystkie środowiska</span></legend>

      <div class="grid">
        <label class="field">
          <span>Login</span>

          <CopyInput
            v-model="form.login"
            autocomplete="off"
            class="mono"
            tip="Kopiuj login"
            type="text"
            what="Login"
          />
        </label>

        <label class="field">
          <span>Hasło</span>
          <PasswordInput v-model="secrets.values.panel" v-model:shown="secrets.shown.panel" :loading="secrets.loading.panel" what="Hasło" />
        </label>
      </div>
    </fieldset>

    <fieldset v-for="group in ACCESS_GROUPS" :key="group.key" class="group">
      <legend class="eyebrow">{{ group.label }}</legend>

      <div :class="group.links.length > 1 ? 'grid' : 'stack'">
        <label v-for="link in group.links" :key="link.field" class="field">
          <span>{{ link.label }}</span>

          <span class="input-row input-row--inside input-row--two">
            <input v-model.trim="form[link.field]" class="input" :placeholder="link.placeholder" type="url">

            <template v-if="form[link.field]">
              <HoverTip anchor-class="field-icon field-icon--second" text="Otwórz w nowej karcie">
                <a
                  :aria-label="`Otwórz: ${group.label} – ${link.label}`"
                  class="btn btn--icon btn--sm input-copy"
                  :href="form[link.field] ?? undefined"
                  rel="noopener"
                  target="_blank"
                ><ArrowUpRight /></a>
              </HoverTip>

              <HoverTip anchor-class="field-icon" text="Kopiuj adres">
                <button
                  :aria-label="`Kopiuj: ${group.label} – ${link.label}`"
                  class="btn btn--icon btn--sm input-copy"
                  type="button"
                  @click="copy(form[link.field], `${group.label} – ${link.label}`)"
                ><Copy /></button>
              </HoverTip>
            </template>
          </span>
        </label>
      </div>

      <!-- a site behind HTTP Basic Auth: the list fetches its report with these -->
      <div v-if="group.key === 'production'" class="grid">
        <label class="field">
          <span>Basic Auth – login</span>

          <CopyInput
            v-model="form.authUser"
            autocomplete="off"
            class="mono"
            tip="Kopiuj login Basic Auth"
            type="text"
            what="Login Basic Auth"
          />
        </label>

        <label class="field">
          <span>Basic Auth – hasło</span>
          <PasswordInput v-model="secrets.values.auth" v-model:shown="secrets.shown.auth" :loading="secrets.loading.auth" what="Hasło Basic Auth" />
        </label>
      </div>

      <!-- the staging behind HTTP Basic Auth: the list checks it with these (green Stage icon when it answers 200) -->
      <div v-if="group.key === 'staging'" class="grid">
        <label class="field">
          <span>Basic Auth – login</span>

          <CopyInput
            v-model="form.stagingAuthUser"
            autocomplete="off"
            class="mono"
            tip="Kopiuj login Basic Auth stagingu"
            type="text"
            what="Login Basic Auth stagingu"
          />
        </label>

        <label class="field">
          <span>Basic Auth – hasło</span>
          <PasswordInput v-model="secrets.values.staging" v-model:shown="secrets.shown.staging" :loading="secrets.loading.staging" what="Hasło Basic Auth stagingu" />
        </label>
      </div>
    </fieldset>
  </div>
</template>

<script lang="ts" setup>
  import { ArrowUpRight, Copy } from 'lucide-vue-next'
  import { useProjectForm } from '@/components/project/form'
  import CopyInput from '@/components/ui/CopyInput.vue'
  import HoverTip from '@/components/ui/HoverTip.vue'
  import PasswordInput from '@/components/ui/PasswordInput.vue'

  /** "Dostęp": the panel's login, each environment's addresses and Basic Auth */
  const { form, secrets, copy } = useProjectForm()

  /** the addresses – each with a button that opens it */
  type AccessField = 'adminUrl' | 'stagingUrl' | 'stagingAdminUrl' | 'localUrl' | 'localAdminUrl'

  /** one section per environment, its addresses (the logins follow in the template) */
  const ACCESS_GROUPS: Array<{ key: 'production' | 'staging' | 'local', label: string, links: Array<{ field: AccessField, label: string, placeholder: string }> }> = [
    { key: 'production', label: 'Produkcja', links: [
      { field: 'adminUrl', label: 'Panel', placeholder: 'https://…/wp/wp-login.php' },
    ] },
    { key: 'staging', label: 'Staging', links: [
      { field: 'stagingUrl', label: 'Adres', placeholder: 'https://….medendev.eu/' },
      { field: 'stagingAdminUrl', label: 'Panel', placeholder: 'https://…/wp/wp-login.php' },
    ] },
    { key: 'local', label: 'Lokalnie', links: [
      { field: 'localUrl', label: 'Adres', placeholder: 'https://….local/' },
      { field: 'localAdminUrl', label: 'Panel', placeholder: 'https://….local/wp/wp-login.php' },
    ] },
  ]
</script>

<style scoped>
/* the environments one under another, the first without a line over it */
.access {
  display: grid;
  gap: 18px;
}

.access > .group:first-child {
  padding-top: 0;
  border-top: 0;
}
</style>
