<template>
  <label class="field">
    <span>Powiązany projekt w Todo – jego otwarte zadania widać na liście</span>

    <SelectField v-model="form.todoProject" label="Projekt w Todo" :options="todoOptions">
      <template #option="{ option }">
        <span class="todo-option"><span class="todo-option__dot" :style="{ background: todoColor(option.value) }" />{{ option.label }}</span>
      </template>
    </SelectField>
  </label>

  <p v-if="form.todoProject && form.todoProject !== project?.todoProject" class="faint">Zadania pokażą się po zapisaniu.</p>

  <template v-else-if="project?.todo">
    <p v-if="tasksLoading" class="faint">Wczytuję zadania…</p>
    <p v-else-if="tasks.length === 0" class="faint">Brak otwartych zadań.</p>

    <ul v-else class="tasks">
      <li v-for="task in tasks" :key="task.id" class="task" :class="`p-${task.priority}`">
        <span class="task__check" :class="{ 'task__check--doing': task.status === 'doing' }" />
        <span class="task__title">{{ task.title }}</span>

        <span v-if="task.due" class="task__due mono" :class="{ 'task__due--late': task.due < today }">
          {{ formatDay(task.due) }}<template v-if="task.time"> {{ task.time }}</template>
        </span>
      </li>
    </ul>

    <a class="btn btn--sm btn--outline tasks__open" :href="project.todo.url" :target="TODO_TAB">
      <ListChecks /> Otwórz w Todo
    </a>
  </template>
</template>

<script lang="ts" setup>
  import type { TodoTask } from '@/types'
  import { ListChecks } from 'lucide-vue-next'
  import { computed, ref, watch } from 'vue'
  import { projectsApi } from '@/api/projects'
  import { useProjectForm } from '@/components/project/form'
  import SelectField from '@/components/ui/SelectField.vue'
  import { TODO_TAB } from '@/config'
  import { useProjectsStore } from '@/stores/projects'
  import { formatDay } from '@/utils/projects'

  /** "Todo": the linked Todo project and its open tasks */
  const { form, project } = useProjectForm()
  const projects = useProjectsStore()

  const todoOptions = computed(() => projects.todoProjects.map(todo => ({ value: todo.id, label: todo.name })))
  const todoColor = (id: number) => projects.todoProjects.find(todo => todo.id === id)?.color ?? 'transparent'

  const tasks = ref<TodoTask[]>([])
  const tasksLoading = ref(false)
  const today = new Date().toLocaleDateString('sv')

  // open tasks of the linked Todo project – fetched when the dialog opens a project
  watch(() => project.value?.id, async () => {
    const current = project.value
    tasks.value = []

    if (!current?.todo) {
      return
    }

    tasksLoading.value = true
    tasks.value = (await projectsApi.tasks(current.id).catch(() => null))?.tasks ?? []
    tasksLoading.value = false
  }, { immediate: true })
</script>

<style scoped>
.todo-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.todo-option__dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 3px;
}

/* open tasks of the linked Todo project – the circle in the priority colour, as in Todo */
.tasks {
  display: grid;
  margin: 0;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  list-style: none;
}

.task {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}

.task:last-child {
  border-bottom: 0;
}

.task__check {
  flex: none;
  width: 14px;
  height: 14px;
  border: 1.5px solid var(--p);
  border-radius: 50%;
}

/* in progress – half filled */
.task__check--doing {
  background: linear-gradient(90deg, var(--p) 50%, transparent 50%);
}

.task__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task__due {
  flex: none;
  color: var(--text-2);
  font-size: 12px;
}

.task__due--late {
  color: var(--danger);
}

.tasks__open {
  justify-self: start;
}
</style>
