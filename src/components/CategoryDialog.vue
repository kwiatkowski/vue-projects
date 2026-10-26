<template>
  <BaseDialog v-model="open" :title="category ? 'Kategoria' : 'Nowa kategoria'" :width="400" @submit="save">
    <label class="field">
      <span>Nazwa</span>

      <input
        ref="input"
        v-model.trim="name"
        :aria-invalid="error ? 'true' : undefined"
        class="input"
        placeholder="Nazwa kategorii"
        type="text"
      >
    </label>

    <span v-if="error" class="error-text">{{ error }}</span>

    <div v-if="confirmDelete" class="alert">
      <div>Usunąć kategorię „{{ category?.name }}”? Jej projekty zostaną – bez kategorii.</div>
    </div>

    <template #actions>
      <template v-if="category">
        <button v-if="!confirmDelete" class="btn btn--danger btn--sm" type="button" @click="confirmDelete = true">Usuń</button>

        <button
          v-else
          class="btn btn--danger-solid btn--sm"
          :disabled="busy"
          type="button"
          @click="remove"
        >Tak, usuń</button>
      </template>

      <span style="flex: 1" />
      <button class="btn btn--sm" type="button" @click="open = false">Anuluj</button>
      <button class="btn btn--primary btn--sm" :disabled="busy" type="submit">{{ category ? 'Zapisz' : 'Utwórz' }}</button>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
  import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
  import BaseDialog from '@/components/ui/BaseDialog.vue'
  import { useProjectsStore } from '@/stores/projects'

  const projects = useProjectsStore()

  const open = computed({
    get: () => projects.editingCategory !== null,
    set: value => {
      if (!value) {
        projects.editingCategory = null
      }
    },
  })

  const category = computed(() => projects.editingCategory === 'new' ? null : projects.editingCategory)

  const name = ref('')
  const error = ref('')
  const confirmDelete = ref(false)
  const busy = ref(false)
  const input = useTemplateRef<HTMLInputElement>('input')

  watch(() => projects.editingCategory, editing => {
    if (editing === null) {
      return
    }

    name.value = editing === 'new' ? '' : editing.name
    error.value = ''
    confirmDelete.value = false
    void nextTick(() => input.value?.focus())
  })

  async function save (): Promise<void> {
    if (!name.value) {
      error.value = 'Podaj nazwę.'

      return
    }

    busy.value = true
    const ok = category.value ? await projects.renameCategory(category.value.id, name.value) : await projects.addCategory(name.value)
    busy.value = false

    if (ok) {
      open.value = false
    }
  }

  async function remove (): Promise<void> {
    if (!category.value) {
      return
    }

    busy.value = true

    if (await projects.removeCategory(category.value.id)) {
      open.value = false
    }

    busy.value = false
  }
</script>
