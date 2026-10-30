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

          <span class="input-row input-row--inside" :class="lockedPanel(link.field) ? 'input-row--three' : 'input-row--two'">
            <input v-model.trim="form[link.field]" class="input" :placeholder="link.placeholder" type="url">

            <template v-if="form[link.field]">
              <!-- the panel behind its own Basic Auth: opened, or copied, with the login and password in the address -->
              <HoverTip v-if="lockedPanel(link.field)" anchor-class="field-icon field-icon--third" text="Kopiuj z loginem i hasłem Basic Auth">
                <button
                  :aria-label="`Kopiuj z Basic Auth: ${group.label} – ${link.label}`"
                  class="btn btn--icon btn--sm input-copy"
                  type="button"
                  @click="copy(panelAuthUrl, `${group.label} – ${link.label} z Basic Auth`)"
                ><span class="locked"><Copy /><LockKeyhole class="locked__badge" /></span></button>
              </HoverTip>

              <HoverTip anchor-class="field-icon field-icon--second" :text="lockedPanel(link.field) ? 'Otwórz z loginem i hasłem Basic Auth' : 'Otwórz w nowej karcie'">
                <a
                  :aria-label="`Otwórz: ${group.label} – ${link.label}`"
                  class="btn btn--icon btn--sm input-copy"
                  :href="(lockedPanel(link.field) ? panelAuthUrl : form[link.field]) ?? undefined"
                  rel="noopener"
                  target="_blank"
                >
                  <span v-if="lockedPanel(link.field)" class="locked"><ArrowUpRight /><LockKeyhole class="locked__badge" /></span>
                  <ArrowUpRight v-else />
                </a>
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

      <!-- HTTP Basic Auth in front of the whole site (the list fetches the report with it) or only the panel – behind a
           button until it is used, shown at once when it is -->
      <template v-if="group.key === 'production'">
        <button v-if="!authShown" class="btn btn--sm btn--outline auth-add" type="button" @click="authOpen = true">
          <Plus /> Basic Auth
        </button>

        <div v-else class="auth-scope">
          <span class="auth-scope__label">Basic Auth chroni</span>

          <div aria-label="Co chroni Basic Auth" class="seg" role="radiogroup">
            <button
              v-for="option in AUTH_SCOPES"
              :key="option.value"
              :aria-checked="authScope === option.value"
              role="radio"
              type="button"
              @click="form.authScope = option.value"
            >{{ option.label }}</button>
          </div>

          <span class="faint auth-scope__note">{{ AUTH_SCOPES.find(option => option.value === authScope)?.note }}</span>
        </div>
      </template>

      <div v-if="group.key === 'production' && authShown" class="grid">
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
  import { ArrowUpRight, Copy, LockKeyhole, Plus } from 'lucide-vue-next'
  import { computed, ref, watch } from 'vue'
  import { useProjectForm } from '@/components/project/form'
  import CopyInput from '@/components/ui/CopyInput.vue'
  import HoverTip from '@/components/ui/HoverTip.vue'
  import PasswordInput from '@/components/ui/PasswordInput.vue'

  /** "Dostęp": the panel's login, each environment's addresses and Basic Auth */
  const { form, project, secrets, copy } = useProjectForm()

  /** what the production's Basic Auth guards – the list sends it only for the whole site */
  const AUTH_SCOPES = [
    { value: 'site', label: 'Całą stronę', note: 'lista używa go przy sprawdzaniu strony i pobieraniu raportu' },
    { value: 'panel', label: 'Tylko panel', note: 'lista go nie wysyła – panel otwiera się z loginem i hasłem' },
  ] as const

  const authScope = computed(() => form.value.authScope === 'panel' ? 'panel' : 'site')

  /** the Basic Auth fields: shown when used (a login, a password kept or typed), else behind „+ Basic Auth” */
  const authOpen = ref(false)
  const authShown = computed(() => authOpen.value || Boolean(form.value.authUser) || Boolean(secrets.values.auth) || Boolean(project.value?.hasAuthPassword))

  watch(() => project.value?.id, () => {
    authOpen.value = false
  })

  /** the panel's address with the Basic Auth login and password in it – the browser passes them on; null without them */
  const panelAuthUrl = computed(() => {
    const user = (form.value.authUser ?? '').trim()
    const password = secrets.values.auth

    if (authScope.value !== 'panel' || !user || !password || !form.value.adminUrl) {
      return null
    }

    try {
      const address = new URL(form.value.adminUrl)
      address.username = encodeURIComponent(user)
      address.password = encodeURIComponent(password)

      return address.toString()
    } catch {
      return null
    }
  })

  /** the production panel's field gets the locked open and copy */
  const lockedPanel = (field: AccessField) => field === 'adminUrl' && panelAuthUrl.value !== null

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
/* three icons in the panel's field – the locked copy left of the open one */
.input-row--three .input {
  padding-right: 66px;
}

.input-row--inside > .field-icon--third {
  right: 57px;
}

/* an icon with a small lock on its corner – as the Stage menu's "with Basic Auth" */
.locked {
  position: relative;
  display: inline-flex;
}

.btn .locked__badge {
  position: absolute;
  right: -4px;
  bottom: -4px;
  width: 10px;
  height: 10px;
  padding: 1px;
  border-radius: 50%;
  background: var(--panel);
  color: var(--accent-text);
  stroke-width: 2.75;
}

/* the Basic Auth behind a button – under the panel's address */
.auth-add {
  justify-self: start;
  margin-top: 12px;
}

/* what the Basic Auth guards – a label, the switch, what it means */
.auth-scope {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin: 14px 0 10px;
  font-size: 13px;
}

.auth-scope__label {
  color: var(--text-2);
}

.auth-scope__note {
  font-size: 12px;
}

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
