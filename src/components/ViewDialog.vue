<template>
  <BaseDialog v-model="columns.viewOpen" title="Wyświetl kolumny" :width="560" @submit="columns.viewOpen = false">
    <!-- the sections side by side, two columns; the project's name is always there, so it isn't offered -->
    <div class="view">
      <fieldset v-for="section in sections" :key="section.name" class="view__section">
        <legend class="eyebrow">{{ section.name }}</legend>

        <label v-for="column in section.columns" :key="column.key" class="view__item">
          <input
            :checked="columns.visible.has(column.key)"
            type="checkbox"
            @change="columns.setHidden(column.key, !($event.target as HTMLInputElement).checked)"
          >

          <span>{{ column.label }}</span>
        </label>
      </fieldset>
    </div>

    <template #actions>
      <span class="view__note"><Monitor /> Zapamiętane w tej przeglądarce</span>

      <span style="flex: 1" />

      <button class="btn btn--sm" :disabled="columns.hidden.length === 0" type="button" @click="columns.showAll()">
        <RotateCcw /> Pokaż wszystkie
      </button>

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

  /** the columns one may see, by section, without the always-shown name – a section with none of them isn't there */
  const sections = computed(() => [...new Set(COLUMNS.map(column => column.section))]
    .map(name => ({ name, columns: COLUMNS.filter(column => column.section === name && column.key !== 'name' && columns.available.includes(column.key)) }))
    .filter(section => section.columns.length > 0))
</script>

<style scoped>
/* two columns of sections, each kept whole – balanced by height */
.view {
  columns: 2;
  column-gap: 28px;
}

.view__section {
  display: grid;
  gap: 2px;
  break-inside: avoid;
  margin: 0 0 18px;
  padding: 0;
  border: 0;
}

.view__section legend {
  float: left;
  width: 100%;
  margin: 0 0 6px;
  padding: 0 8px;
}

/* a column: a full-width row – the box and its name, the whole row clickable */
.view__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  cursor: pointer;
  transition: background-color .12s;
}

.view__item:hover {
  background: var(--hover);
}

.view__note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-3);
  font-size: 12px;
}

.view__note svg {
  width: 14px;
  height: 14px;
}

@media (max-width: 520px) {
  .view {
    columns: 1;
  }
}
</style>
