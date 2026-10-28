<template>
  <BaseDialog v-model="columns.viewOpen" title="Wyświetl" :width="380" @submit="columns.viewOpen = false">
    <div class="view">
      <fieldset v-for="section in sections" :key="section.name" class="view__section">
        <legend class="eyebrow">{{ section.name }}</legend>

        <label v-for="column in section.columns" :key="column.key" class="check">
          <input
            :checked="columns.visible.has(column.key)"
            :disabled="column.key === 'name'"
            type="checkbox"
            @change="columns.setHidden(column.key, !($event.target as HTMLInputElement).checked)"
          >
          {{ column.label }}
        </label>
      </fieldset>
    </div>

    <template #note>
      <p class="view__note">
        <Monitor />
        <span>Zapamiętane w tej przeglądarce – inne urządzenia mają swój wybór.</span>
      </p>
    </template>

    <template #actions>
      <button class="btn btn--sm" :disabled="columns.hidden.length === 0" type="button" @click="columns.showAll()">
        <RotateCcw /> Pokaż wszystkie
      </button>

      <span style="flex: 1" />

      <button class="btn btn--accent btn--sm" type="submit">
        <Check /> Gotowe
      </button>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
  import { Check, Monitor, RotateCcw } from 'lucide-vue-next'
  import { computed } from 'vue'
  import BaseDialog from '@/components/ui/BaseDialog.vue'
  import { useColumnsStore } from '@/stores/columns'
  import { COLUMNS } from '@/utils/columns'

  /**
   * "Wyświetl": which of the columns one may see this browser shows – at once, kept in it (localStorage). Who may see
   * which is the owner's "Ustawienia".
   */
  const columns = useColumnsStore()

  /** the columns one may see, by section – a section with none of them isn't there */
  const sections = computed(() => [...new Set(COLUMNS.map(column => column.section))]
    .map(name => ({ name, columns: COLUMNS.filter(column => column.section === name && columns.available.includes(column.key)) }))
    .filter(section => section.columns.length > 0))
</script>

<style scoped>
.view {
  display: grid;
  gap: 16px;
}

.view__section {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  border: 0;
}

.view__section legend {
  float: left;
  width: 100%;
  margin-bottom: 2px;
}

/* a column: its box and name, as "Konfiguracja" in the project's dialog */
.check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  justify-self: start;
  font-size: 14px;
  cursor: pointer;
}

.check:has(input:disabled) {
  cursor: default;
}

.view__note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--text-2);
  font-size: 13px;
}

.view__note svg {
  flex: none;
  width: 16px;
  height: 16px;
}
</style>
