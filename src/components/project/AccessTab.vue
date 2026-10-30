<template>
  <!-- one section per environment: its addresses (open, copy), then its logins -->
  <div class="access">
    <!-- the panel's login and password – the same on production, staging and the local copy: a quiet card over the
         environments, its name in plain text with a key -->
    <div aria-labelledby="access-login-title" class="login-card" role="group">
      <div class="login-card__head">
        <span class="login-card__icon"><KeyRound /></span>
        <strong id="access-login-title">Logowanie do panelu</strong>
        <span class="faint">wszystkie środowiska</span>
      </div>

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
    </div>

    <fieldset v-for="group in ACCESS_GROUPS" :key="group.key" class="group">
      <!-- the same icons as the list's Stage and Lokalnie columns -->
      <legend class="eyebrow group__title"><component :is="group.icon" v-if="group.icon" /> {{ group.label }}</legend>

      <div :class="group.links.length > 1 ? 'grid' : 'stack'">
        <label v-for="link in group.links" :key="link.field" class="field">
          <span>{{ link.label }}</span>

          <span class="input-row input-row--inside" :class="lockedPanel(link.field) ? 'input-row--three' : 'input-row--two'">
            <!-- production's address is its main domain – set on the left, shown here as the others' -->
            <input
              v-if="link.field === 'home'"
              class="input"
              :placeholder="link.placeholder"
              readonly
              type="url"
              :value="homeUrl"
            >

            <input
              v-else
              v-model.trim="form[link.field]"
              class="input"
              :placeholder="link.placeholder"
              type="url"
            >

            <template v-if="valueOf(link.field)">
              <!-- the panel behind its own Basic Auth: opened, or copied, with the login and password in the address -->
              <HoverTip v-if="lockedPanel(link.field)" anchor-class="field-icon field-icon--third" text="Kopiuj z loginem i hasłem Basic Auth">
                <button
                  :aria-label="`Kopiuj z Basic Auth: ${group.label} – ${link.label}`"
                  class="btn btn--icon btn--sm input-copy"
                  type="button"
                  @click="copy(panelAuthUrl(link.field), `${group.label} – ${link.label} z Basic Auth`)"
                ><span class="locked"><Copy /><LockKeyhole class="locked__badge" /></span></button>
              </HoverTip>

              <HoverTip anchor-class="field-icon field-icon--second" :text="lockedPanel(link.field) ? 'Otwórz z loginem i hasłem Basic Auth' : 'Otwórz w nowej karcie'">
                <a
                  :aria-label="`Otwórz: ${group.label} – ${link.label}`"
                  class="btn btn--icon btn--sm input-copy"
                  :href="(lockedPanel(link.field) ? panelAuthUrl(link.field) : valueOf(link.field)) || undefined"
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
                  @click="copy(valueOf(link.field), `${group.label} – ${link.label}`)"
                ><Copy /></button>
              </HoverTip>
            </template>
          </span>
        </label>
      </div>

      <!-- HTTP Basic Auth in front of the whole site (the list checks it, fetches the report with it) or only the panel –
           behind a button until it is used, shown at once when it is -->
      <template v-if="group.key !== 'local'">
        <button v-if="!authShown(group.key)" class="btn btn--sm btn--outline auth-add" type="button" @click="authOpen[group.key] = true">
          <Plus /> Basic Auth
        </button>

        <template v-else>
          <div class="auth-scope">
            <span class="auth-scope__label">Basic Auth chroni</span>

            <div :aria-label="`Co chroni Basic Auth – ${group.label}`" class="seg" role="radiogroup">
              <button
                v-for="option in AUTH_SCOPES"
                :key="option.value"
                :aria-checked="scopeOf(group.key) === option.value"
                role="radio"
                type="button"
                @click="form[AUTH[group.key].scope] = option.value"
              >{{ option.label }}</button>
            </div>

            <span class="faint auth-scope__note">{{ scopeOf(group.key) === 'panel' ? PANEL_NOTE : AUTH[group.key].siteNote }}</span>

            <!-- off: the login, the password and the scope cleared – gone once saved -->
            <button class="btn btn--sm auth-off" type="button" @click="authOff(group.key)">
              <X /> Wyłącz Basic Auth
            </button>
          </div>

          <div class="grid">
            <label class="field">
              <span>Basic Auth – login</span>

              <CopyInput
                v-model="form[AUTH[group.key].user]"
                autocomplete="off"
                class="mono"
                :tip="`Kopiuj login Basic Auth – ${group.label}`"
                type="text"
                :what="`Login Basic Auth – ${group.label}`"
              />
            </label>

            <label class="field">
              <span>Basic Auth – hasło</span>

              <PasswordInput
                v-model="secrets.values[AUTH[group.key].kind]"
                v-model:shown="secrets.shown[AUTH[group.key].kind]"
                :loading="secrets.loading[AUTH[group.key].kind]"
                :what="`Hasło Basic Auth – ${group.label}`"
              />
            </label>
          </div>
        </template>
      </template>
    </fieldset>
  </div>
</template>

<script lang="ts" setup>
  import { ArrowUpRight, Copy, FlaskConical, KeyRound, Laptop, LockKeyhole, Plus, X } from 'lucide-vue-next'
  import { type Component, computed, ref, watch } from 'vue'
  import { useProjectForm } from '@/components/project/form'
  import CopyInput from '@/components/ui/CopyInput.vue'
  import HoverTip from '@/components/ui/HoverTip.vue'
  import PasswordInput from '@/components/ui/PasswordInput.vue'
  import { bareDomain, siteUrl } from '@/utils/projects'

  /** "Dostęp": the panel's login, each environment's addresses and Basic Auth */
  const { form, project, secrets, copy } = useProjectForm()

  /** what an environment's Basic Auth guards – the list sends it only for the whole site */
  const AUTH_SCOPES = [
    { value: 'site', label: 'Całą stronę' },
    { value: 'panel', label: 'Tylko panel' },
  ] as const

  const PANEL_NOTE = 'lista go nie wysyła – panel otwiera się z loginem i hasłem'

  /** production's and staging's Basic Auth: their fields, the password's kind, the panel it may guard alone */
  const AUTH = {
    production: { user: 'authUser', scope: 'authScope', kind: 'auth', panel: 'adminUrl', siteNote: 'lista używa go przy sprawdzaniu strony i pobieraniu raportu' },
    staging: { user: 'stagingAuthUser', scope: 'stagingAuthScope', kind: 'staging', panel: 'stagingAdminUrl', siteNote: 'lista sprawdza z nim, czy staging odpowiada' },
  } as const

  type AuthEnv = keyof typeof AUTH

  const scopeOf = (env: AuthEnv) => form.value[AUTH[env].scope] === 'panel' ? 'panel' : 'site'

  /** the Basic Auth fields: shown when used (a login, a password kept or typed), else behind „+ Basic Auth” */
  const authOpen = ref<Record<AuthEnv, boolean>>({ production: false, staging: false })

  function authShown (env: AuthEnv): boolean {
    const auth = AUTH[env]

    // a kept password counts while it loads – once loaded (or cleared) its value says
    return authOpen.value[env] || Boolean(form.value[auth.user]) || Boolean(secrets.values[auth.kind]) || secrets.loading[auth.kind]
  }

  /** Basic Auth off: its fields cleared and folded behind „+ Basic Auth” – saving removes them (the password too) */
  function authOff (env: AuthEnv): void {
    const auth = AUTH[env]
    form.value[auth.user] = ''
    // an empty text, as the form keeps a cleared field (saved as null)
    ;(form.value as Record<string, unknown>)[auth.scope] = ''
    secrets.values[auth.kind] = ''
    secrets.shown[auth.kind] = false
    authOpen.value[env] = false
  }

  watch(() => project.value?.id, () => {
    authOpen.value = { production: false, staging: false }
  })

  /** the environment whose panel this field is – the panels alone can be guarded */
  const envOfPanel = (field: AccessField): AuthEnv | null => (Object.keys(AUTH) as AuthEnv[]).find(env => AUTH[env].panel === field) ?? null

  /** the panel's address with the Basic Auth login and password in it – the browser passes them on; null without them */
  function panelAuthUrl (field: AccessField | 'home'): string | null {
    const env = field === 'home' ? null : envOfPanel(field)

    if (!env || scopeOf(env) !== 'panel') {
      return null
    }

    const user = (form.value[AUTH[env].user] ?? '').trim()
    const password = secrets.values[AUTH[env].kind]
    const url = valueOf(field)

    if (!user || !password || !url) {
      return null
    }

    try {
      const address = new URL(url)
      address.username = encodeURIComponent(user)
      address.password = encodeURIComponent(password)

      return address.toString()
    } catch {
      return null
    }
  }

  /** a panel behind its own Basic Auth gets the locked open and copy */
  const lockedPanel = (field: AccessField | 'home') => panelAuthUrl(field) !== null

  /** production's address – the main domain (the first one on the left) */
  const homeUrl = computed(() => {
    const domain = bareDomain(form.value.domains[0] ?? '')

    return domain ? siteUrl(domain) : ''
  })

  /** what a field holds – production's address from the domains */
  const valueOf = (field: AccessField | 'home') => field === 'home' ? homeUrl.value : (form.value[field] ?? '')

  /** the addresses – each with a button that opens it */
  type AccessField = 'adminUrl' | 'stagingUrl' | 'stagingAdminUrl' | 'localUrl' | 'localAdminUrl'

  /** one section per environment, its addresses (the logins follow in the template) */
  const ACCESS_GROUPS: Array<{ key: 'production' | 'staging' | 'local', label: string, icon?: Component, links: Array<{ field: AccessField | 'home', label: string, placeholder: string }> }> = [
    { key: 'production', label: 'Produkcja', links: [
      { field: 'home', label: 'Adres', placeholder: 'Główna domena – dodaj po lewej' },
      { field: 'adminUrl', label: 'Panel', placeholder: 'https://…/wp/wp-login.php' },
    ] },
    { key: 'staging', label: 'Staging', icon: FlaskConical, links: [
      { field: 'stagingUrl', label: 'Adres', placeholder: 'https://….medendev.eu/' },
      { field: 'stagingAdminUrl', label: 'Panel', placeholder: 'https://…/wp/wp-login.php' },
    ] },
    { key: 'local', label: 'Lokalnie', icon: Laptop, links: [
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

/* the Basic Auth behind a button – under the panel's address, the group's own gap above it */
.auth-add {
  justify-self: start;
}

/* what the Basic Auth guards – a label, the switch, what it means */
.auth-scope {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-top: 4px;
  font-size: 13px;
}

.auth-scope__label {
  color: var(--text-2);
}

.auth-scope__note {
  font-size: 12px;
}

/* turning it off – at the row's end */
.auth-off {
  margin-left: auto;
}

/* a group's name with its icon before it */
.group__title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.group__title svg {
  width: 14px;
  height: 14px;
  stroke-width: 2.25;
}

/* the panel's login – the same on every environment, so set apart from them: a quiet card, its name with a key */
.login-card {
  display: grid;
  gap: 12px;
  padding: 14px 16px 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--panel);
}

.login-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.login-card__head .faint {
  font-size: 12px;
}

.login-card__icon {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent-text);
}

.login-card__icon svg {
  width: 13px;
  height: 13px;
  stroke-width: 2.25;
}

/* the environments one under another, the first without a line over it */
.access {
  display: grid;
  gap: 18px;
}

/* the first environment right under the login card – no line over it */
.access > .login-card + .group {
  padding-top: 0;
  border-top: 0;
}
</style>
