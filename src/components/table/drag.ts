import type { Category, Project } from '@/types'
import type { Group } from '@/utils/projects'
import { ref } from 'vue'
import { useProjectsStore } from '@/stores/projects'
import { dragId, dragKind, dropTarget, setDrag } from '@/utils/drag'

/** The table's dragging: a project (reorder / move to another category) or a whole category. */
export function useTableDrag (canDrag: () => boolean) {
  const projects = useProjectsStore()
  const groupKey = (group: Group<Project>) => group.category?.id ?? 0

  const draggingProject = ref<number | null>(null)
  const draggingCategory = ref<number | null>(null)
  /** the group a project would land in, next to which project */
  const projectDrop = ref<{ group: number, target: { id: number, after: boolean } | null } | null>(null)
  /** the category another one would land before / after */
  const categoryDrop = ref<{ id: number, after: boolean } | null>(null)

  function startProject (event: DragEvent, id: number): void {
    if (!canDrag()) {
      return
    }

    setDrag(event, 'project', id)
    draggingProject.value = id
  }

  function startCategory (event: DragEvent, id: number): void {
    event.stopPropagation()
    setDrag(event, 'category', id)
    draggingCategory.value = id
  }

  function endDrag (): void {
    draggingProject.value = null
    draggingCategory.value = null
    projectDrop.value = null
    categoryDrop.value = null
  }

  function onOver (event: DragEvent, group: Group<Project>): void {
    const kind = canDrag() ? dragKind(event) : null
    const section = event.currentTarget as HTMLElement

    if (kind === 'project') {
      event.preventDefault()
      projectDrop.value = { group: groupKey(group), target: dropTarget(section, event.clientY, 'data-project-id') }
    } else if (kind === 'category' && group.category) {
      event.preventDefault()
      const box = section.getBoundingClientRect()
      categoryDrop.value = { id: group.category.id, after: event.clientY > box.top + box.height / 2 }
    }
  }

  /** leaving the group itself, not just moving between its rows */
  function onLeave (event: DragEvent): void {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) {
      projectDrop.value = null
      categoryDrop.value = null
    }
  }

  function onDrop (event: DragEvent, group: Group<Project>): void {
    const kind = dragKind(event)

    if (kind === 'project') {
      const id = dragId(event, 'project')
      const target = projectDrop.value?.target ?? null

      if (id) {
        void projects.moveProject(id, group.category?.id ?? null, target?.id ?? null, target?.after ?? false)
      }
    } else if (kind === 'category' && group.category) {
      const id = dragId(event, 'category')
      const after = categoryDrop.value?.after ?? false

      if (id) {
        void projects.moveCategory(id, (group.category as Category).id, after)
      }
    }

    endDrag()
  }

  return { groupKey, draggingProject, draggingCategory, projectDrop, categoryDrop, startProject, startCategory, endDrag, onOver, onLeave, onDrop }
}
