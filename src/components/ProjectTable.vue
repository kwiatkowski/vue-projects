<template>
  <!-- wide screens: the table, as in the spreadsheet -->
  <div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key" :class="column.class" scope="col">
            <button
              v-if="column.sort"
              :aria-sort="sort === column.sort ? (descending ? 'descending' : 'ascending') : undefined"
              class="th-sort"
              type="button"
              @click="emit('sort', column.sort)"
            >
              {{ column.label }}
              <ChevronDown v-if="sort === column.sort" class="th-sort__icon" :class="{ 'th-sort__icon--up': !descending }" />
            </button>

            <template v-else>{{ column.label }}</template>
          </th>
        </tr>
      </thead>

      <tbody
        v-for="group in rowGroups"
        :key="group.sizer ? 'sizer' : groupKey(group)"
        :aria-hidden="group.sizer || undefined"
        :class="{
          sizer: group.sizer,
          'group--over': projectDrop?.group === groupKey(group),
          'group--dragging': group.category && draggingCategory === group.category.id,
          [`group--drop-${categoryDrop?.after ? 'after' : 'before'}`]: group.category && categoryDrop?.id === group.category.id,
        }"
        @dragleave="onLeave"
        @dragover="onOver($event, group)"
        @drop.prevent="onDrop($event, group)"
      >
        <tr v-if="showHeaders && !group.sizer" class="group-row">
          <td :colspan="columns.length">
            <div class="group-head">
              <!-- kept when dragging is off (a filter) – just hidden, so the names don't move sideways -->
              <span
                v-if="full && group.category"
                aria-hidden="true"
                class="grip"
                :class="{ 'grip--off': !canDrag }"
                :draggable="canDrag ? 'true' : undefined"
                :title="canDrag ? 'Przeciągnij kategorię' : undefined"
                @dragend="endDrag"
                @dragstart="startCategory($event, group.category.id)"
              ><GripVertical /></span>

              <span class="group-head__name">{{ group.category?.name ?? 'Bez kategorii' }}</span>
              <span class="mono faint">{{ group.projects.length }}</span>

              <CategoryMenu v-if="full && group.category" :category="group.category" />
            </div>
          </td>
        </tr>

        <tr
          v-for="project in group.projects"
          :key="project.id"
          :class="{
            'row--gone': project.status === 'suspended',
            'row--changed': projects.changed.has(project.id),
            'row--fading': projects.fading.has(project.id),
            'row--open': full,
            'row--dragging': draggingProject === project.id,
            'row--drop-before': projectDrop?.target?.id === project.id && !projectDrop.target.after,
            'row--drop-after': projectDrop?.target?.id === project.id && projectDrop.target.after,
          }"
          :data-project-id="project.id"
          :draggable="canDrag ? 'true' : undefined"
          @click="full && emit('open', project)"
          @dragend="endDrag"
          @dragstart="startProject($event, project.id)"
        >
          <td class="cell-name" :class="cellChanged(project, 'name', 'domains')">
            <GripVertical v-if="full" aria-hidden="true" class="row-grip" :class="{ 'grip--off': !canDrag }" />

            <a
              v-if="project.domains[0]"
              class="site"
              :href="siteUrl(project.domains[0])"
              rel="noopener"
              target="_blank"
              :title="project.domains.join(', ')"
              @click.stop
            >
              {{ project.name }}
              <ArrowUpRight class="site__icon" />
            </a>

            <span v-else class="site site--plain">{{ project.name }}</span>
          </td>

          <td :class="cellChanged(project, 'status')"><StatusChip :status="project.status" /></td>

          <template v-if="full">
            <td :class="cellChanged(project, 'server', 'serverUrl', 'serverAccount')">
              <a
                v-if="project.server && project.serverUrl"
                class="link"
                :href="project.serverUrl"
                rel="noopener"
                target="_blank"
                @click.stop
              >{{ project.server }}</a>

              <span v-else>{{ project.server }}</span>
              <span v-if="project.serverAccount" class="cell-sub mono">{{ project.serverAccount }}</span>
            </td>

            <td class="mono" :class="[{ warn: outdatedPhp(project.php) }, cellChanged(project, 'php')]">{{ project.php }}</td>
          </template>

          <td :class="cellChanged(project, 'engine', 'version')">
            <span v-if="project.engine" class="chip chip--soft">{{ project.engine }}</span>

            <span
              v-if="project.version"
              class="cell-sub mono"
              :class="{ latest: isLatest(project) }"
              :title="isLatest(project) ? latestTitle : undefined"
            >{{ project.version }}</span>
          </td>

          <td class="cell-theme" :class="cellChanged(project, 'theme')">
            <HoverTip v-if="themeRows(project).length > 0">
              <span class="has-tip" tabindex="0">{{ project.theme }}</span>

              <template #tip>
                <div class="info-tip__head">{{ project.theme }}</div>

                <dl class="info-tip">
                  <template v-for="row in themeRows(project)" :key="row.label">
                    <dt>{{ row.label }}</dt>
                    <dd>{{ row.value }}</dd>
                  </template>
                </dl>
              </template>
            </HoverTip>

            <template v-else>{{ project.theme }}</template>
            <span v-if="project.theme && project.themeDetails?.version" class="cell-sub mono">{{ project.themeDetails.version }}</span>
          </td>

          <template v-if="full">
            <td class="center" :class="cellChanged(project, 'repo')">
              <a
                v-if="project.repo"
                class="chip chip--soft repo"
                :href="project.repo"
                rel="noopener"
                target="_blank"
                :title="project.repo"
                @click.stop
              >{{ repoHost(project.repo) }}</a>
            </td>

            <td
              v-for="flag in ['deploy', 'bedrock', 'security'] as const"
              :key="flag"
              class="center"
              :class="cellChanged(project, flag)"
            >
              <Check v-if="project[flag]" :aria-label="FLAG_LABELS[flag]" class="yes" />
            </td>

            <td class="center" :class="cellChanged(project, 'localUrl', 'localAdminUrl')">
              <SiteLinkMenu v-if="project.localUrl" :admin-url="project.localAdminUrl" label="Lokalnie" :url="project.localUrl">
                <Laptop />
              </SiteLinkMenu>
            </td>

            <td class="center" :class="cellChanged(project, 'stagingUrl', 'stagingAdminUrl')">
              <SiteLinkMenu v-if="project.stagingUrl" :admin-url="project.stagingAdminUrl" label="Staging" :url="project.stagingUrl">
                <FlaskConical />
              </SiteLinkMenu>
            </td>

            <td
              v-for="flag in ['acf', 'miModal'] as const"
              :key="flag"
              class="center"
              :class="cellChanged(project, flag)"
            >
              <Check v-if="project[flag]" :aria-label="FLAG_LABELS[flag]" class="yes" />
            </td>

            <td class="nowrap" :class="cellChanged(project, 'todo')">
              <TodoChip v-if="project.todo" :todo="project.todo" />
            </td>

            <td class="center" :class="cellChanged(project, 'reportedAt', 'token')">
              <HoverTip>
                <span
                  :aria-label="reportTitle(project)"
                  class="report"
                  :class="`report--${reportState(project)}`"
                  role="img"
                  tabindex="0"
                />

                <template #tip>
                  {{ reportTitle(project) }}
                  <div v-if="project.reporter" class="info-tip__sub mono">{{ reporterLabel(project.reporter) }}</div>
                </template>
              </HoverTip>
            </td>
          </template>
        </tr>

        <tr v-if="!group.sizer && group.projects.length === 0" class="drop-here">
          <td :colspan="columns.length">{{ canDrag ? 'Przeciągnij tu projekt' : 'Brak projektów' }}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- phones: cards, grouped the same way (order changes through the menus – no dragging on touch) -->
  <div class="cards">
    <section v-for="group in groups" :key="groupKey(group)" class="cards__group">
      <header v-if="showHeaders" class="cards__head">
        <span class="group-head__name">{{ group.category?.name ?? 'Bez kategorii' }}</span>
        <span class="mono faint">{{ group.projects.length }}</span>
        <CategoryMenu v-if="full && group.category" :category="group.category" />
      </header>

      <ul class="cards__list">
        <li
          v-for="project in group.projects"
          :key="project.id"
          class="card"
          :class="{ 'row--gone': project.status === 'suspended', 'row--changed': projects.changed.has(project.id), 'row--fading': projects.fading.has(project.id) }"
          @click="full && emit('open', project)"
        >
          <div class="card__head">
            <a
              v-if="project.domains[0]"
              class="site"
              :href="siteUrl(project.domains[0])"
              rel="noopener"
              target="_blank"
              :title="project.domains.join(', ')"
              @click.stop
            >
              {{ project.name }} <ArrowUpRight class="site__icon" />
            </a>

            <span v-else class="site site--plain">{{ project.name }}</span>

            <span
              v-if="projects.changed.has(project.id)"
              aria-label="Zaktualizowano"
              class="refreshing"
              role="status"
              title="Dane zaktualizowane"
            />

            <StatusChip :status="project.status" />
          </div>

          <div v-if="project.engine || project.theme" class="card__line muted">
            <span v-if="project.engine">{{ project.engine }} <span class="mono" :class="{ latest: isLatest(project) }">{{ project.version }}</span></span>
            <span v-if="project.theme">{{ project.theme }}</span>
          </div>

          <template v-if="full">
            <div v-if="project.server || project.php" class="card__line muted">
              <span v-if="project.server">{{ project.server }} <span class="mono faint">{{ project.serverAccount }}</span></span>
              <span v-if="project.php" class="mono">PHP {{ project.php }}</span>
            </div>

            <div v-if="project.todo || CARD_FLAGS.some(flag => project[flag])" class="card__flags">
              <TodoChip v-if="project.todo" :todo="project.todo" />
              <span v-for="flag in CARD_FLAGS.filter(flag => project[flag])" :key="flag" class="chip chip--accent">{{ FLAG_LABELS[flag] }}</span>
            </div>
          </template>
        </li>
      </ul>
    </section>
  </div>
</template>

<script lang="ts" setup>
  import type { Category, Flag, Project, SortKey } from '@/types'
  import type { Group } from '@/utils/projects'
  import { ArrowUpRight, Check, ChevronDown, FlaskConical, GripVertical, Laptop } from 'lucide-vue-next'
  import { computed, ref } from 'vue'
  import CategoryMenu from '@/components/CategoryMenu.vue'
  import SiteLinkMenu from '@/components/SiteLinkMenu.vue'
  import StatusChip from '@/components/StatusChip.vue'
  import TodoChip from '@/components/TodoChip.vue'
  import HoverTip from '@/components/ui/HoverTip.vue'
  import { config } from '@/config'
  import { useProjectsStore } from '@/stores/projects'
  import { FLAGS } from '@/types'
  import { dragId, dragKind, dropTarget, setDrag } from '@/utils/drag'
  import { formatDateTime, latestWordpress, repoHost, reportState, siteUrl } from '@/utils/projects'

  const props = defineProps<{
    groups: Array<Group<Project>>
    /** category headers – off when the list is sorted by a column (one flat group) */
    grouped: boolean
    /** the owner's view – every column, rows open the edit dialog */
    full: boolean
    /** projects and categories can be dragged into a new order */
    canDrag: boolean
    sort: SortKey | null
    descending: boolean
  }>()

  const emit = defineEmits<{ open: [Project], sort: [SortKey] }>()

  const projects = useProjectsStore()

  /**
   * The groups to draw, plus the projects a filter or the search hides as rows that take no room (visibility:
   * collapse) – the columns are still as wide as their longest value of all projects, so they don't jump between filters.
   */
  const rowGroups = computed<Array<Group<Project> & { sizer: boolean }>>(() => {
    const shown = new Set(props.groups.flatMap(group => group.projects.map(project => project.id)))
    const hidden = projects.items.filter(project => !shown.has(project.id))

    return [
      ...props.groups.map(group => ({ ...group, sizer: false })),
      ...(hidden.length > 0 ? [{ category: null, projects: hidden, sizer: true }] : []),
    ]
  })

  /** the flags a card shows – DEV is left out, the Stage address says the same */
  const CARD_FLAGS = FLAGS.filter(flag => flag !== 'dev')

  const FLAG_LABELS: Record<Flag, string> = {
    deploy: 'Deploy',
    dev: 'DEV',
    bedrock: 'Bedrock',
    security: 'Wordfence',
    acf: 'ACF',
    miModal: 'MI Modal',
  }

  /** headers only when there are categories to tell apart */
  const showHeaders = computed(() => props.grouped && props.groups.some(group => group.category !== null))

  /** a cell whose fields the last refresh changed – blurred under a spinner while the row is highlighted */
  function cellChanged (project: Project, ...fields: string[]): string | undefined {
    const changed = projects.changed.get(project.id)

    return changed && (changed.has('*') || fields.some(field => changed.has(field))) ? 'cell--changed' : undefined
  }

  /** the report dot's tooltip – when the site last reported, or why it doesn't */
  function reportTitle (project: Project): string {
    const last = formatDateTime(project.reportedAt)

    switch (reportState(project)) {
      case 'ok': {
        return `Raport: ${last}`
      }
      case 'failed': {
        return last ? `Brak nowego raportu – ostatni: ${last}` : 'Raport skonfigurowany, ale strona jeszcze nic nie wysłała'
      }
      default: {
        return 'Raport nieskonfigurowany'
      }
    }
  }

  /** the theme's tooltip: what the report knows beyond the name – empty, no tooltip */
  function themeRows (project: Project): Array<{ label: string, value: string }> {
    const details = project.themeDetails
    const parent = project.parentTheme
      ? [project.parentTheme, details?.parentVersion].filter(Boolean).join(' ')
      : null

    return [
      { label: 'Wersja', value: details?.version },
      { label: 'Autor', value: details?.author },
      { label: 'Motyw nadrzędny', value: parent },
      { label: 'Autor nadrzędnego', value: parent ? details?.parentAuthor : null },
    ].filter((row): row is { label: string, value: string } => Boolean(row.value))
  }

  /** "mk-core 2026.10.27" → "MK Core 2026.10.27"; plugin_meden as it is */
  const reporterLabel = (reporter: string) => reporter.replace(/^mk-core\b/, 'MK Core')

  const isLatest = (project: Project) => latestWordpress(project, config.latestWordpress)
  const latestTitle = config.latestWordpress ? `Najnowszy WordPress (${config.latestWordpress})` : undefined

  interface Column {
    key: string
    label: string
    sort?: SortKey
    class?: string
  }

  const columns = computed<Column[]>(() => props.full
    ? [
      { key: 'name', label: 'Projekt', sort: 'name' },
      { key: 'status', label: 'Status', sort: 'status' },
      { key: 'server', label: 'Serwer', sort: 'server' },
      { key: 'php', label: 'PHP', sort: 'php' },
      { key: 'engine', label: 'Silnik', sort: 'version' },
      { key: 'theme', label: 'Motyw', sort: 'theme' },
      { key: 'repo', label: 'Repo', class: 'center' },
      { key: 'deploy', label: 'Deploy', class: 'center' },
      { key: 'bedrock', label: 'Bedrock', class: 'center' },
      { key: 'security', label: 'Security', class: 'center' },
      { key: 'local', label: 'Local', class: 'center' },
      { key: 'stage', label: 'Stage', class: 'center' },
      { key: 'acf', label: 'ACF', class: 'center' },
      { key: 'miModal', label: 'MI Modal', class: 'center' },
      { key: 'todo', label: 'Todo' },
      { key: 'report', label: 'Raport', sort: 'reportedAt', class: 'center' },
    ]
    : [
      { key: 'name', label: 'Projekt', sort: 'name' },
      { key: 'status', label: 'Status', sort: 'status' },
      { key: 'engine', label: 'Silnik', sort: 'version' },
      { key: 'theme', label: 'Motyw', sort: 'theme' },
    ])

  /** PHP before 8.1 has no security support any more. */
  function outdatedPhp (php: string | null): boolean {
    const [major = 0, minor = 0] = (php ?? '').split('.').map(Number)

    return php !== null && (major < 8 || (major === 8 && minor < 1))
  }

  const groupKey = (group: Group<Project>) => group.category?.id ?? 0

  // ---- dragging: a project (reorder / move to another category) or a whole category

  const draggingProject = ref<number | null>(null)
  const draggingCategory = ref<number | null>(null)
  /** the group a project would land in, next to which project */
  const projectDrop = ref<{ group: number, target: { id: number, after: boolean } | null } | null>(null)
  /** the category another one would land before / after */
  const categoryDrop = ref<{ id: number, after: boolean } | null>(null)

  function startProject (event: DragEvent, id: number): void {
    if (!props.canDrag) {
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
    const kind = props.canDrag ? dragKind(event) : null
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
</script>

<style scoped>
.table-wrap {
  /* the rest of the screen under the top bar and the page header (--head, measured there); scrolls both ways and
     keeps the column headers on top */
  max-height: calc(100dvh - var(--topbar) - var(--head, 0px) - 16px);
  overflow: auto;
  /* no scrollbar – it would take width only on a long list and shift the columns between filters; it scrolls with
     the wheel, the trackpad and touch */
  scrollbar-width: none;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

/* the projects a filter hides: no room, but their widths count for the columns */
.sizer tr {
  visibility: collapse;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th,
td {
  padding: 9px 12px;
  border-bottom: 1px solid var(--line);
  text-align: left;
  vertical-align: middle;
}

/* the column headers – taller and set apart from the rows: the accent green, the text in the page's background colour */
th {
  position: sticky;
  z-index: 2;
  top: 0;
  padding-top: 13px;
  padding-bottom: 13px;
  border-bottom: 0;
  background: var(--accent);
  color: var(--bg);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .06em;
  text-transform: uppercase;
  white-space: nowrap;
}

tbody:last-child tr:last-child td {
  border-bottom: 0;
}

/* ---- category groups */

.group-row td {
  padding: 14px 12px 6px;
  background: var(--bg);
  border-bottom-color: var(--line-strong);
}

tbody:first-of-type .group-row td {
  padding-top: 10px;
}

.group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
}

.group-head__name {
  font-size: 13px;
  font-weight: 650;
  letter-spacing: -.005em;
}

.group-head :deep(.menu) {
  margin-left: auto;
}

.grip {
  display: inline-grid;
  place-items: center;
  margin-left: -6px;
  color: var(--text-3);
  cursor: grab;
}

/* the place stays, the handle doesn't – the columns are the same with a filter and without */
.grip--off {
  visibility: hidden;
}

.grip svg {
  width: 16px;
  height: 16px;
}

.group--over .group-row td {
  background: var(--accent-soft);
}

.group--dragging {
  opacity: .45;
}

.group--drop-before .group-row td {
  box-shadow: inset 0 3px 0 var(--accent);
}

.group--drop-after tr:last-child td {
  box-shadow: inset 0 -3px 0 var(--accent);
}

.drop-here td {
  padding: 14px 12px;
  color: var(--text-3);
  font-size: 12px;
  text-align: center;
}

/* ---- rows */

.row--open {
  cursor: pointer;
}

.row--open:hover td {
  background: var(--hover);
}

/* suspended – greyed out, as in the spreadsheet */
.row--gone {
  opacity: .5;
}

/*
 * changed by a refresh – for 3 s while the tab is visible (the store) the row has the hover colour and
 * its text a bit greyed out; the cells that changed are blurred under a spinner. Then the colour fades out.
 */
.row--changed td,
.card.row--changed {
  background: var(--hover);
}

.row--changed td,
.card.row--changed {
  color: var(--text-3);
}

.row--changed td > *,
.card.row--changed > * {
  opacity: .6;
}

/* plain text has no element to blur – it turns into its own blurred shadow; elements get the filter */
.cell--changed {
  position: relative;
  color: transparent;
  text-shadow: 0 0 6px var(--text-3);
}

.cell--changed > * {
  filter: blur(3px);
}

.cell--changed::after,
.refreshing {
  width: 14px;
  height: 14px;
  border: 2px solid var(--line-strong);
  border-top-color: var(--positive);
  border-radius: 50%;
  animation: refreshing .8s linear infinite;
}

.cell--changed::after {
  position: absolute;
  top: 50%;
  /* over the start of the text, where the cell's padding ends; centred in the centred columns */
  left: 12px;
  margin-top: -7px;
  content: '';
}

.cell--changed.center::after {
  left: 50%;
  margin-left: -7px;
}

/* the cards (phones) – the spinner next to the name */
.refreshing {
  display: inline-block;
  margin-left: 8px;
  vertical-align: middle;
}

.row--fading td,
.card.row--fading {
  animation: row-fading 1s ease-out;
}

@keyframes row-fading {
  from {
    background: var(--hover);
  }
}

@keyframes refreshing {
  to {
    rotate: 1turn;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cell--changed::after,
  .refreshing {
    animation: none;
  }
}

.row--dragging {
  opacity: .35;
}

.row--drop-before td {
  box-shadow: inset 0 2px 0 var(--accent);
}

.row--drop-after td {
  box-shadow: inset 0 -2px 0 var(--accent);
}

.row-grip {
  width: 14px;
  height: 14px;
  margin: 0 4px 0 -8px;
  color: var(--text-3);
  vertical-align: -2px;
  opacity: 0;
  cursor: grab;
  transition: opacity .12s;
}

tr:hover .row-grip {
  opacity: 1;
}

.center {
  text-align: center;
}

.nowrap {
  white-space: nowrap;
}

.th-sort {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin: -4px -6px;
  padding: 4px 6px;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;
}

/* on the green header: a darker patch under the pointer, the sorted column in bold */
.th-sort:hover {
  background: rgb(0 0 0 / 12%);
}

.th-sort[aria-sort] {
  font-weight: 750;
}

.th-sort__icon {
  width: 13px;
  height: 13px;
  transition: rotate .12s;
}

.th-sort__icon--up {
  rotate: 180deg;
}

.site {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-weight: 550;
  color: var(--text);
}

.site:hover {
  color: var(--accent-text);
}

.site__icon {
  width: 13px;
  height: 13px;
  color: var(--text-3);
  opacity: 0;
  transition: opacity .12s;
}

.site:hover .site__icon,
.site:focus-visible .site__icon {
  opacity: 1;
}

.site--plain {
  color: var(--text-2);
}

.cell-sub {
  display: block;
  margin-top: 1px;
  color: var(--text-3);
  font-size: 12px;
}

.cell-theme {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* the tooltip's anchor as a plain block – a long name still ends with "…" */
.cell-theme :deep(.tip-anchor) {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* the theme with more in its tooltip (version, author, parent) */
.has-tip {
  cursor: default;
  text-decoration: underline dotted var(--text-3);
  text-underline-offset: 3px;
}

.info-tip__head {
  margin-bottom: 6px;
  font-weight: 600;
  white-space: nowrap;
}

.info-tip {
  display: grid;
  grid-template-columns: auto auto;
  gap: 2px 16px;
  margin: 0;
}

.info-tip dt {
  color: var(--text-2);
}

.info-tip dd {
  margin: 0;
}

/* under the report's date: what sent it */
.info-tip__sub {
  margin-top: 2px;
  color: var(--text-2);
  font-size: 12px;
}

.link {
  color: var(--text);
  text-decoration: underline;
  text-decoration-color: var(--line-strong);
  text-underline-offset: 3px;
}

.link:hover {
  text-decoration-color: var(--accent);
}

.warn {
  color: var(--warn);
  font-weight: 600;
}

/* the newest WordPress */
.latest {
  color: var(--positive);
  font-weight: 600;
}

.yes {
  width: 16px;
  height: 16px;
  color: var(--positive);
  vertical-align: middle;
  stroke-width: 2.5;
}

.repo {
  font-family: var(--mono);
  font-weight: 600;
}

.repo:hover {
  background: var(--accent-soft);
  color: var(--accent-text);
}

/* the site's report as one dot: green and pulsing like the status – it reports; red – set up, but no report;
   dark – not set up. The date and time in the tooltip. */
.report {
  position: relative;
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentcolor;
  vertical-align: middle;
}

.report--ok {
  color: var(--positive);
}

.report--ok::after {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: currentcolor;
  opacity: .75;
  animation: ping 1s cubic-bezier(0, 0, .2, 1) infinite;
  content: '';
}

.report--failed {
  color: var(--danger);
}

/* a hairline keeps the dark dot visible on the dark background */
.report--off {
  color: var(--off);
  box-shadow: 0 0 0 1px var(--line-strong);
}

@keyframes ping {
  75%,
  100% {
    opacity: 0;
    transform: scale(2);
  }
}

@media (prefers-reduced-motion: reduce) {
  .report--ok::after {
    animation: none;
    opacity: 0;
  }
}

/* ---- phones */

.cards {
  display: none;
  gap: 18px;
}

.cards__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.cards__head :deep(.menu) {
  margin-left: auto;
}

.cards__list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card__line {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 13px;
}

.card__flags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* the yes/no fields on a card – the positive green, as the checkmarks in the table */
.card__flags .chip--accent {
  color: var(--positive);
}

@media (max-width: 900px) {
  .table-wrap {
    display: none;
  }

  .cards {
    display: grid;
  }

  .site__icon {
    opacity: 1;
  }
}
</style>
