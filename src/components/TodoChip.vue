<template>
  <HoverTip>
    <a
      :aria-label="`Todo: ${todo.name} – ${todo.open} otwartych${todo.overdue ? `, ${todo.overdue} po terminie` : ''}`"
      class="todo-chip"
      :href="todo.url"
      @click.stop
    >
      <span class="todo-chip__dot" :style="{ background: todo.color }" />
      <span class="mono">{{ todo.open }}</span>
      <span v-if="todo.overdue" class="todo-chip__late mono">{{ todo.overdue }} po terminie</span>
    </a>

    <template #tip>
      <div class="todo-tip__head">
        <span class="todo-chip__dot" :style="{ background: todo.color }" />
        {{ todo.name }}
      </div>

      <dl class="todo-tip">
        <dt>Otwarte</dt>
        <dd class="mono">{{ todo.open }}</dd>
        <dt>Po terminie</dt>
        <dd class="mono" :class="{ 'todo-chip__late': todo.overdue }">{{ todo.overdue }}</dd>
        <dt>Na dziś</dt>
        <dd class="mono">{{ todo.today ?? 0 }}</dd>
        <dt>Najbliższe 7 dni</dt>
        <dd class="mono">{{ todo.soon ?? 0 }}</dd>
        <dt>Bez terminu</dt>
        <dd class="mono">{{ todo.undated ?? 0 }}</dd>
      </dl>
    </template>
  </HoverTip>
</template>

<script lang="ts" setup>
  import type { TodoSummary } from '@/types'
  import HoverTip from '@/components/ui/HoverTip.vue'

  /** The linked Todo project: open tasks (and overdue ones), a link to it in the Todo app; the breakdown on hover. */
  defineProps<{ todo: TodoSummary }>()
</script>

<style scoped>
.todo-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 0 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-2);
  font-size: 12px;
  white-space: nowrap;
}

.todo-chip:hover {
  border-color: var(--text-3);
  color: var(--text);
}

.todo-chip__dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 3px;
}

.todo-chip__late {
  color: var(--danger);
}

.todo-tip__head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-weight: 600;
  white-space: nowrap;
}

.todo-tip {
  display: grid;
  grid-template-columns: auto auto;
  gap: 2px 16px;
  margin: 0;
}

.todo-tip dt {
  color: var(--text-2);
}

.todo-tip dd {
  margin: 0;
  text-align: right;
}
</style>
