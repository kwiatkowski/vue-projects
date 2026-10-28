<template>
  <BaseDialog v-model="open" title="Logowanie" :width="380" @submit="submit">
    <div class="login">
      <label class="field">
        <span>Login</span>

        <input
          ref="loginInput"
          v-model.trim="login"
          autocomplete="username"
          class="input"
          required
          type="text"
        >
      </label>

      <label class="field">
        <span>Hasło</span>

        <input
          v-model="password"
          autocomplete="current-password"
          class="input"
          required
          type="password"
        >
      </label>

      <p v-if="error" class="login__error" role="alert">{{ error }}</p>

      <a v-if="config.loginUrl" class="login__admin" :href="config.loginUrl">Administrator? Zaloguj się przez WordPress</a>
    </div>

    <template #actions>
      <span style="flex: 1" />

      <button class="btn btn--sm" type="button" @click="open = false">
        <X /> Anuluj
      </button>

      <button class="btn btn--accent btn--sm" :disabled="busy || !login || !password" type="submit">
        <LogIn /> Zaloguj
      </button>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
  import { LogIn, X } from 'lucide-vue-next'
  import { nextTick, ref, useTemplateRef, watch } from 'vue'
  import { viewerApi } from '@/api/projects'
  import BaseDialog from '@/components/ui/BaseDialog.vue'
  import { config } from '@/config'

  /**
   * Logging in with the list's own account (not WordPress) – then the page loads again with the viewer's columns.
   * The owner logs in through WordPress (the link).
   */
  const open = defineModel<boolean>({ default: false })

  const login = ref('')
  const password = ref('')
  const error = ref('')
  const busy = ref(false)
  const loginInput = useTemplateRef<HTMLInputElement>('loginInput')

  watch(open, async value => {
    if (value) {
      password.value = error.value = ''
      await nextTick()
      loginInput.value?.focus()
    }
  })

  async function submit (): Promise<void> {
    busy.value = true
    error.value = ''

    try {
      await viewerApi.login(login.value, password.value)
      // the page itself carries what one sees – it comes again, as the viewer's
      window.location.reload()
    } catch (error_) {
      error.value = error_ instanceof Error ? error_.message : 'Nie udało się zalogować.'
      busy.value = false
    }
  }
</script>

<style scoped>
.login {
  display: grid;
  gap: 12px;
}

.login__error {
  margin: 0;
  color: var(--danger);
  font-size: 13px;
}

.login__admin {
  justify-self: start;
  color: var(--text-3);
  font-size: 12px;
}

.login__admin:hover {
  color: var(--text);
}
</style>
