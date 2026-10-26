<template>
  <a
    class="todo-chip"
    :href="todo.url"
    :title="`Todo: ${todo.name} – ${todo.open} otwartych${todo.overdue ? `, ${todo.overdue} po terminie` : ''}`"
    @click.stop
  >
    <span class="todo-chip__dot" :style="{ background: todo.color }" />
    <span class="mono">{{ todo.open }}</span>
    <span v-if="todo.overdue" class="todo-chip__late mono">{{ todo.overdue }} po terminie</span>
  </a>
</template>

<script lang="ts" setup>
  import type { TodoSummary } from '@/types'

  /** The linked Todo project: open tasks (and overdue ones), a link to it in the Todo app. */
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
  width: 8px;
  height: 8px;
  border-radius: 3px;
}

.todo-chip__late {
  color: var(--danger);
}
</style>
