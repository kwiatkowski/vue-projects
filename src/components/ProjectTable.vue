<template>
  <!-- wide screens: the table, as in the spreadsheet -->
  <div class="table-wrap">
    <table class="table" :class="{ 'table--full': full }">
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

      <tbody>
        <tr
          v-for="project in projects"
          :key="project.id"
          :class="{ 'row--gone': project.status === 'suspended', 'row--open': full }"
          @click="full && emit('open', project)"
        >
          <td class="cell-name">
            <a
              v-if="project.domain"
              class="site"
              :href="siteUrl(project.domain)"
              rel="noopener"
              target="_blank"
              @click.stop
            >
              {{ project.domain }}
              <ArrowUpRight class="site__icon" />
            </a>

            <span v-else class="site site--plain">{{ project.name }}</span>
            <span v-if="project.domain && project.name !== project.domain" class="cell-sub">{{ project.name }}</span>
          </td>

          <td><StatusChip :status="project.status" /></td>

          <template v-if="full">
            <td>
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

            <td class="mono" :class="{ warn: outdatedPhp(project.php) }">{{ project.php }}</td>
          </template>

          <td><span v-if="project.engine" class="chip chip--soft">{{ project.engine }}</span></td>
          <td class="mono" :class="{ latest: isLatest(project) }" :title="isLatest(project) ? latestTitle : undefined">{{ project.version }}</td>
          <td class="cell-theme">{{ project.theme }}</td>

          <template v-if="full">
            <td class="center">
              <a
                v-if="project.repo"
                class="chip chip--soft repo"
                :href="project.repo"
                rel="noopener"
                target="_blank"
                :title="project.repo"
                @click.stop
              >
                {{ repoHost(project.repo) }}
              </a>
            </td>

            <td v-for="flag in ['deploy', 'dev', 'bedrock', 'security'] as const" :key="flag" class="center">
              <Check v-if="project[flag]" :aria-label="FLAG_LABELS[flag]" class="yes" />
            </td>

            <td class="center">
              <a
                v-if="project.localUrl"
                class="local"
                :href="project.localUrl"
                rel="noopener"
                target="_blank"
                :title="project.localUrl"
                @click.stop
              >
                <Laptop />
              </a>
            </td>

            <td v-for="flag in ['acf', 'miModal'] as const" :key="flag" class="center">
              <Check v-if="project[flag]" :aria-label="FLAG_LABELS[flag]" class="yes" />
            </td>

            <td class="mono nowrap">{{ formatDay(project.dbSync) }}</td>

            <td class="nowrap">
              <span v-if="project.reportedAt" class="report" :class="{ 'report--stale': reportStale(project.reportedAt) }" :title="project.reportedAt">
                <span class="dot" /> {{ ago(project.reportedAt) }}
              </span>

              <span v-else-if="project.domain && project.status === 'online'" class="faint">—</span>
            </td>

            <td class="center">
              <ListChecks v-if="project.inTodo" aria-label="W Todo" class="todo" />
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- phones: cards -->
  <ul class="cards">
    <li
      v-for="project in projects"
      :key="project.id"
      class="card"
      :class="{ 'row--gone': project.status === 'suspended' }"
      @click="full && emit('open', project)"
    >
      <div class="card__head">
        <a
          v-if="project.domain"
          class="site"
          :href="siteUrl(project.domain)"
          rel="noopener"
          target="_blank"
          @click.stop
        >
          {{ project.domain }} <ArrowUpRight class="site__icon" />
        </a>

        <span v-else class="site site--plain">{{ project.name }}</span>
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

        <div v-if="FLAGS.some(flag => project[flag])" class="card__flags">
          <span v-for="flag in FLAGS.filter(flag => project[flag])" :key="flag" class="chip chip--accent">{{ FLAG_LABELS[flag] }}</span>
        </div>
      </template>
    </li>
  </ul>
</template>

<script lang="ts" setup>
  import type { Flag, Project, SortKey } from '@/types'
  import { ArrowUpRight, Check, ChevronDown, Laptop, ListChecks } from 'lucide-vue-next'
  import { computed } from 'vue'
  import StatusChip from '@/components/StatusChip.vue'
  import { config } from '@/config'
  import { FLAGS } from '@/types'
  import { ago, formatDay, latestWordpress, repoHost, reportStale, siteUrl } from '@/utils/projects'

  const isLatest = (project: Project) => latestWordpress(project, config.latestWordpress)
  const latestTitle = config.latestWordpress ? `Najnowszy WordPress (${config.latestWordpress})` : undefined

  const props = defineProps<{
    projects: Project[]
    /** the owner's view – every column, rows open the edit dialog */
    full: boolean
    sort: SortKey
    descending: boolean
  }>()

  const emit = defineEmits<{ open: [Project], sort: [SortKey] }>()

  const FLAG_LABELS: Record<Flag, string> = {
    deploy: 'Deploy',
    dev: 'DEV',
    bedrock: 'Bedrock',
    security: 'Wordfence',
    acf: 'ACF',
    miModal: 'MI Modal',
  }

  interface Column {
    key: string
    label: string
    sort?: SortKey
    class?: string
  }

  const columns = computed<Column[]>(() => props.full
    ? [
      { key: 'name', label: 'Domena', sort: 'name' },
      { key: 'status', label: 'Status', sort: 'status' },
      { key: 'server', label: 'Serwer', sort: 'server' },
      { key: 'php', label: 'PHP', sort: 'php' },
      { key: 'engine', label: 'Silnik' },
      { key: 'version', label: 'Wersja', sort: 'version' },
      { key: 'theme', label: 'Motyw', sort: 'theme' },
      { key: 'repo', label: 'Repo', class: 'center' },
      { key: 'deploy', label: 'Deploy', class: 'center' },
      { key: 'dev', label: 'Dev', class: 'center' },
      { key: 'bedrock', label: 'Bedrock', class: 'center' },
      { key: 'security', label: 'Security', class: 'center' },
      { key: 'local', label: 'Local', class: 'center' },
      { key: 'acf', label: 'ACF', class: 'center' },
      { key: 'miModal', label: 'MI Modal', class: 'center' },
      { key: 'dbSync', label: 'DB sync', sort: 'dbSync' },
      { key: 'report', label: 'Raport', sort: 'reportedAt' },
      { key: 'todo', label: 'Todo', class: 'center' },
    ]
    : [
      { key: 'name', label: 'Domena', sort: 'name' },
      { key: 'status', label: 'Status', sort: 'status' },
      { key: 'engine', label: 'Silnik' },
      { key: 'version', label: 'Wersja', sort: 'version' },
      { key: 'theme', label: 'Motyw', sort: 'theme' },
    ])

  /** PHP before 8.1 has no security support any more. */
  function outdatedPhp (php: string | null): boolean {
    const [major = 0, minor = 0] = (php ?? '').split('.').map(Number)

    return php !== null && (major < 8 || (major === 8 && minor < 1))
  }
</script>

<style scoped>
.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
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

th {
  position: sticky;
  top: 0;
  background: var(--panel);
  color: var(--text-3);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .06em;
  text-transform: uppercase;
  white-space: nowrap;
}

tbody tr:last-child td {
  border-bottom: 0;
}

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

.th-sort:hover,
.th-sort[aria-sort] {
  color: var(--text);
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
  color: var(--accent);
  font-weight: 600;
}

.yes {
  width: 16px;
  height: 16px;
  color: var(--accent);
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

.local,
.todo {
  display: inline-grid;
  place-items: center;
  color: var(--text-2);
  vertical-align: middle;
}

.local svg,
.todo {
  width: 16px;
  height: 16px;
}

.local:hover {
  color: var(--accent-text);
}

.report {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-text);
}

.report--stale {
  color: var(--warn);
}

.cards {
  display: none;
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
