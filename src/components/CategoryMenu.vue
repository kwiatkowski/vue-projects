<template>
  <DropMenu :label="`Kategoria ${category.name}`">
    <button class="menu__item" role="menuitem" type="button" @click="projects.editingCategory = category">
      <Pencil /> Zmień nazwę
    </button>

    <button
      class="menu__item"
      :disabled="index === 0"
      role="menuitem"
      type="button"
      @click="projects.shiftCategory(category.id, -1)"
    >
      <ArrowUp /> Przesuń w górę
    </button>

    <button
      class="menu__item"
      :disabled="index === projects.sortedCategories.length - 1"
      role="menuitem"
      type="button"
      @click="projects.shiftCategory(category.id, 1)"
    >
      <ArrowDown /> Przesuń w dół
    </button>

    <button class="menu__item menu__item--danger" role="menuitem" type="button" @click="projects.editingCategory = category">
      <Trash2 /> Usuń…
    </button>
  </DropMenu>
</template>

<script lang="ts" setup>
  import type { Category } from '@/types'
  import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-vue-next'
  import { computed } from 'vue'
  import DropMenu from '@/components/ui/DropMenu.vue'
  import { useProjectsStore } from '@/stores/projects'

  const props = defineProps<{ category: Category }>()

  const projects = useProjectsStore()

  const index = computed(() => projects.sortedCategories.findIndex(category => category.id === props.category.id))
</script>
