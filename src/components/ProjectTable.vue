<template>
  <div class="projects-list">
    <!-- wide screens: the table, as in the spreadsheet -->
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <!-- the owner ticks projects for the actions above the list – the box here ticks all shown -->
            <th v-if="full" class="select" scope="col">
              <input
                aria-label="Zaznacz wszystkie widoczne"
                :checked="allSelected"
                :indeterminate="someSelected && !allSelected"
                type="checkbox"
                @change="projects.setSelected(allSelected ? [] : visibleIds)"
              >
            </th>

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
            <td :colspan="span">
              <div class="group-head">
                <!-- kept when dragging is off (a filter) – just hidden, so the names don't move sideways -->
                <span
                  v-if="full && group.category"
                  v-tip="canDrag ? 'Przeciągnij kategorię' : undefined"
                  aria-hidden="true"
                  class="grip"
                  :class="{ 'grip--off': !canDrag }"
                  :draggable="canDrag ? 'true' : undefined"
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
            <td v-if="full" class="select" @click.stop>
              <input
                :aria-label="`Zaznacz: ${project.name}`"
                :checked="projects.selected.has(project.id)"
                type="checkbox"
                @change="projects.toggleSelected(project.id)"
              >
            </td>

            <td class="cell-name" :class="cellChanged(project, 'name', 'domains')">
              <GripVertical v-if="full" aria-hidden="true" class="row-grip" :class="{ 'grip--off': !canDrag }" />

              <a
                v-if="project.domains[0]"
                v-tip="project.domains.join(', ')"
                class="site"
                :href="siteUrl(project.domains[0])"
                rel="noopener"
                target="_blank"
                @click.stop
              >
                {{ project.name }}
                <ArrowUpRight class="site__icon" />
              </a>

              <span v-else class="site site--plain">{{ project.name }}</span>

              <BellOff
                v-if="full && project.mutedUntil"
                v-tip="`Powiadomienia wyciszone do ${formatDateTime(project.mutedUntil)}`"
                aria-label="Wyciszony"
                class="muted-icon"
              />
            </td>

            <td v-if="show('status')" class="fit" :class="cellChanged(project, 'status')"><StatusChip :status="project.status" /></td>

            <!-- the home page over 30 days; the response time in the tooltip -->
            <td v-if="show('uptime')" class="right mono nowrap">
              <span
                v-if="project.uptime !== null && project.uptime !== undefined"
                v-tip="`30 dni · średni czas odpowiedzi (24 h): ${formatMs(project.responseMs)}`"
                :class="uptimeClass(project.uptime)"
              >{{ formatUptime(project.uptime) }}</span>
            </td>

            <td v-if="show('server')" :class="cellChanged(project, 'server', 'serverUrl', 'serverAccount')">
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

            <td v-if="show('php')" :class="cellChanged(project, 'php')"><PhpCell :project="project" /></td>

            <td v-if="show('engine')" :class="cellChanged(project, 'engine', 'version')"><EngineCell :project="project" /></td>

            <td v-if="show('theme')" class="cell-theme" :class="cellChanged(project, 'theme')"><ThemeCell :project="project" /></td>

            <td v-if="show('repo')" class="center" :class="cellChanged(project, 'repo')">
              <a
                v-if="project.repo"
                v-tip="project.repo"
                class="chip chip--soft repo"
                :href="project.repo"
                rel="noopener"
                target="_blank"
                @click.stop
              >{{ repoHost(project.repo) }}</a>
            </td>

            <td
              v-for="flag in (['deploy', 'bedrock', 'security'] as const).filter(show)"
              :key="flag"
              class="center"
              :class="cellChanged(project, flag)"
            >
              <Check v-if="project[flag]" :aria-label="FLAG_LABELS[flag]" class="yes" />
            </td>

            <td v-if="show('local')" class="center cell-link" :class="cellChanged(project, 'localUrl', 'localAdminUrl')" @click.stop>
              <SiteLinkMenu v-if="project.localUrl" :admin-url="project.localAdminUrl" label="Lokalnie" :url="project.localUrl">
                <Laptop />
              </SiteLinkMenu>
            </td>

            <td v-if="show('stage')" class="center cell-link" :class="cellChanged(project, 'stagingUrl', 'stagingAdminUrl')" @click.stop>
              <SiteLinkMenu
                v-if="project.stagingUrl"
                :admin-url="project.stagingAdminUrl"
                :auth="stagingAuth(project)"
                label="Staging"
                :status="project.staging"
                :url="project.stagingUrl"
              >
                <FlaskConical />
              </SiteLinkMenu>
            </td>

            <td
              v-for="flag in (['acf', 'miModal'] as const).filter(show)"
              :key="flag"
              class="center"
              :class="cellChanged(project, flag)"
            >
              <Check v-if="project[flag]" :aria-label="FLAG_LABELS[flag]" class="yes" />
            </td>

            <td v-if="show('todo')" class="nowrap" :class="cellChanged(project, 'todo')">
              <TodoChip v-if="project.todo" :todo="project.todo" />
            </td>

            <!-- a click here works the report's popup, not the row's dialog -->
            <td v-if="show('report')" class="center cell-link" :class="cellChanged(project, 'reportedAt', 'token')" @click.stop>
              <ReportCell :full="full" :project="project" @open="emit('open', $event)" />
            </td>
          </tr>

          <tr v-if="!group.sizer && group.projects.length === 0" class="drop-here">
            <td :colspan="span">{{ canDrag ? 'Przeciągnij tu projekt' : 'Brak projektów' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <ProjectCards :full="full" :groups="groups" :show-headers="showHeaders" @open="emit('open', $event)" />
  </div>
</template>

<script lang="ts" setup>
  import type { Flag, Project, SortKey } from '@/types'
  import type { Group } from '@/utils/projects'
  import { ArrowUpRight, BellOff, Check, ChevronDown, FlaskConical, GripVertical, Laptop } from 'lucide-vue-next'
  import { computed } from 'vue'
  import { projectsApi } from '@/api/projects'
  import CategoryMenu from '@/components/CategoryMenu.vue'
  import SiteLinkMenu from '@/components/SiteLinkMenu.vue'
  import StatusChip from '@/components/StatusChip.vue'
  import { useTableDrag } from '@/components/table/drag'
  import EngineCell from '@/components/table/EngineCell.vue'
  import PhpCell from '@/components/table/PhpCell.vue'
  import ProjectCards from '@/components/table/ProjectCards.vue'
  import ReportCell from '@/components/table/ReportCell.vue'
  import ThemeCell from '@/components/table/ThemeCell.vue'
  import TodoChip from '@/components/TodoChip.vue'
  import { vTip } from '@/directives/tip'
  import { useColumnsStore } from '@/stores/columns'
  import { useProjectsStore } from '@/stores/projects'
  import { type ColumnKey, COLUMNS } from '@/utils/columns'
  import { formatMs, formatUptime } from '@/utils/history'
  import { formatDateTime, repoHost, siteUrl } from '@/utils/projects'
  import '@/components/table/list.css'

  /** The list: the table on wide screens (cells in components/table/), cards on phones (ProjectCards). */
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
  const columnsStore = useColumnsStore()
  const { groupKey, draggingProject, draggingCategory, projectDrop, categoryDrop, startProject, startCategory, endDrag, onOver, onLeave, onDrop } = useTableDrag(() => props.canDrag)

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

  const FLAG_LABELS: Record<Flag, string> = {
    deploy: 'Deploy',
    bedrock: 'Bedrock',
    security: 'Wordfence',
    acf: 'ACF',
    miModal: 'MI Modal',
  }

  /** the projects shown – what the header's box ticks */
  const visibleIds = computed(() => props.groups.flatMap(group => group.projects.map(project => project.id)))
  const someSelected = computed(() => visibleIds.value.some(id => projects.selected.has(id)))
  const allSelected = computed(() => visibleIds.value.length > 0 && visibleIds.value.every(id => projects.selected.has(id)))

  /** the rows across the whole table – the columns and, for the owner, the tick box */
  const span = computed(() => columns.value.length + (props.full ? 1 : 0))

  /** headers only when there are categories to tell apart */
  const showHeaders = computed(() => props.grouped && props.groups.some(group => group.category !== null))

  /** a cell whose fields the last refresh changed – blurred under a spinner while the row is highlighted */
  function cellChanged (project: Project, ...fields: string[]): string | undefined {
    const changed = projects.changed.get(project.id)

    return changed && (changed.has('*') || fields.some(field => changed.has(field))) ? 'cell--changed' : undefined
  }

  /** below 99 % worth a look, below 95 % bad – as in the dialog's history */
  const uptimeClass = (uptime: number) => uptime < 95 ? 'uptime--bad' : (uptime < 99 ? 'uptime--warn' : undefined)

  /** the staging's Basic Auth for its menu – the owner's only, with a login and a kept password */
  function stagingAuth (project: Project) {
    return props.full && project.stagingAuthUser && project.hasStagingAuthPassword
      ? { user: project.stagingAuthUser, password: () => projectsApi.password(project.id, 'staging').then(result => result.password) }
      : null
  }

  interface Column {
    key: ColumnKey
    label: string
    sort?: SortKey
    class?: string
  }

  /** how a column shows in the table – the sort it offers, its alignment */
  const COLUMN_LOOK: Partial<Record<ColumnKey, Omit<Column, 'key' | 'label'>>> = {
    name: { sort: 'name' },
    status: { sort: 'status', class: 'fit' },
    uptime: { sort: 'uptime', class: 'right' },
    server: { sort: 'server' },
    engine: { sort: 'version' },
    theme: { sort: 'theme' },
    repo: { class: 'center' },
    deploy: { class: 'center' },
    bedrock: { class: 'center' },
    security: { class: 'center' },
    local: { class: 'center' },
    stage: { class: 'center' },
    acf: { class: 'center' },
    miModal: { class: 'center' },
    report: { sort: 'reportedAt', class: 'center' },
  }

  /** the columns chosen under "Wyświetl" – the owner's own, or the public list's – in the list's order */
  const columns = computed<Column[]>(() => COLUMNS
    .filter(column => shown.value.has(column.key))
    .map(column => ({ key: column.key, label: column.label, ...COLUMN_LOOK[column.key] })))

  const shown = computed(() => columnsStore.visible)

  /** whether the column is on – its cells follow */
  const show = (key: ColumnKey): boolean => shown.value.has(key)

</script>

<style scoped>
.table-wrap {
  /* the rest of the screen under the top bar and the page header (--head, measured there); scrolls both ways and
     keeps the column headers on top */
  max-height: calc(100dvh - var(--topbar) - var(--head, 0px) - 16px);
  overflow: auto;
  /* with the top bar sliding away and back (below 1500px) */
  transition: max-height .2s ease;
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

/* plain text has no element to blur – it turns into its own blurred shadow; elements get the filter */
.cell--changed {
  position: relative;
  color: transparent;
  text-shadow: 0 0 6px var(--text-3);
}

.cell--changed > * {
  filter: blur(3px);
}

.cell--changed::after {
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

@keyframes refreshing {
  to {
    rotate: 1turn;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cell--changed::after {
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

/* a project whose alerts are muted – a small bell by its name */
.muted-icon {
  width: 13px;
  height: 13px;
  margin-left: 6px;
  color: var(--warn);
  vertical-align: -1px;
}

/* the tick box – a narrow column before the name */
.select {
  width: 1%;
  padding-right: 0;
}

/* as wide as its content – the rest of the width goes to the other columns */
.fit {
  width: 1%;
  white-space: nowrap;
}

.select input {
  vertical-align: middle;
}

/* on the green header: a dark edge, and ticked (or some ticked – a dash) dark on the green, as the header's text */
th.select input {
  border-color: var(--bg);
  background: transparent;
}

th.select input:checked,
th.select input:indeterminate {
  border-color: var(--bg);
  background: transparent;
}

th.select input:indeterminate::after {
  width: 10px;
  height: 2px;
  border-radius: 1px;
  background: var(--bg);
  content: '';
}

.center {
  text-align: center;
}

.right {
  text-align: right;
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

/* the name and the version as one area for the tooltip, a little past the text on every side */
.cell-theme :deep(.theme-hit) {
  margin: -6px -8px;
  padding: 6px 8px;
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

.uptime--warn {
  color: var(--warn);
}

.uptime--bad {
  color: var(--danger);
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

/* Local, Stage and the report: anywhere in the cell shows the popup */
.cell-link {
  position: relative;
}

.cell-link :deep(.site-link),
.cell-link :deep(.report-hit) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 0;
}

/* the icon is small – the area that shows its popup is much bigger, easy to hit */
.center :deep(.report-hit) {
  justify-content: center;
  min-width: 36px;
  min-height: 36px;
}

/* ---- phones: the cards instead (ProjectCards) */

@media (max-width: 900px) {
  .table-wrap {
    display: none;
  }
}
</style>
