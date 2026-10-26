/** Native drag & drop in the list: projects (within a category or into another one) and whole categories. */

const PROJECT = 'application/x-projects-project'
const CATEGORY = 'application/x-projects-category'

export type DragKind = 'project' | 'category'

export function setDrag (event: DragEvent, kind: DragKind, id: number): void {
  if (!event.dataTransfer) {
    return
  }

  event.dataTransfer.setData(kind === 'project' ? PROJECT : CATEGORY, String(id))
  event.dataTransfer.setData('text/plain', String(id))
  event.dataTransfer.effectAllowed = 'move'
}

/** During dragover only the types are readable, not the data. */
export function dragKind (event: DragEvent): DragKind | null {
  const types = event.dataTransfer?.types ?? []

  if (types.includes(PROJECT)) {
    return 'project'
  }

  return types.includes(CATEGORY) ? 'category' : null
}

export function dragId (event: DragEvent, kind: DragKind): number | null {
  const id = Number(event.dataTransfer?.getData(kind === 'project' ? PROJECT : CATEGORY))

  return Number.isInteger(id) && id > 0 ? id : null
}

/**
 * Where a drop at `clientY` lands among the items of `container` marked with `attribute` (their id):
 * before the first item whose middle is below the pointer, else after the last one.
 */
export function dropTarget (container: HTMLElement, clientY: number, attribute: string): { id: number, after: boolean } | null {
  const items = [...container.querySelectorAll<HTMLElement>(`[${CSS.escape(attribute)}]`)]

  for (const item of items) {
    const box = item.getBoundingClientRect()

    if (clientY < box.top + box.height / 2) {
      return { id: Number(item.getAttribute(attribute)), after: false }
    }
  }

  const last = items.at(-1)

  return last ? { id: Number(last.getAttribute(attribute)), after: true } : null
}
