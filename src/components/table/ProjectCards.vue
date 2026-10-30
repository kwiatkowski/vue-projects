<template>
  <!-- phones: cards, grouped the same way (order changes through the menus – no dragging on touch) -->
  <div class="cards">
    <section v-for="group in groups" :key="group.category?.id ?? 0" class="cards__group">
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
              v-tip="project.domains.join(', ')"
              class="site"
              :href="siteUrl(project.domains[0])"
              rel="noopener"
              target="_blank"
              @click.stop
            >
              {{ project.name }} <ArrowUpRight class="site__icon" />
            </a>

            <span v-else class="site site--plain">{{ project.name }}</span>

            <span
              v-if="projects.changed.has(project.id)"
              v-tip="'Dane zaktualizowane'"
              aria-label="Zaktualizowano"
              class="refreshing"
              role="status"
            />

            <StatusChip v-if="show('status')" :status="project.status" />
            <DomainsMark v-if="show('status')" :project="project" />
          </div>

          <div v-if="(show('engine') && project.engine) || (show('theme') && project.theme)" class="card__line muted">
            <span v-if="show('engine') && project.engine">
              {{ project.engine }}
              <span class="mono" :class="{ latest: latestWordpress(project, projects.latestWordpress), outdated: outdatedWordpress(project, projects.latestWordpress) }">{{ project.version }}</span>
            </span>

            <span v-if="show('theme') && project.theme">{{ project.theme }}<Check v-if="ownTheme(project)" aria-label="Motyw zrobiony u nas" class="own-theme" /></span>
          </div>

          <div v-if="(show('server') && project.server) || (show('php') && project.php)" class="card__line muted">
            <span v-if="show('server') && project.server">{{ project.server }} <span class="mono faint">{{ project.serverAccount }}</span></span>
            <span v-if="show('php') && project.php" class="mono" :class="`php--${phpStatus(project, config.phpBranches ?? {}).tone}`">PHP {{ project.php }}</span>
          </div>

          <div v-if="(show('todo') && project.todo) || flagsOf(project).length > 0" class="card__flags">
            <TodoChip v-if="show('todo') && project.todo" :todo="project.todo" />
            <span v-for="flag in flagsOf(project)" :key="flag" class="chip chip--accent">{{ FLAG_LABELS[flag] }}</span>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script lang="ts" setup>
  import type { Flag, Project } from '@/types'
  import type { ColumnKey } from '@/utils/columns'
  import type { Group } from '@/utils/projects'
  import { ArrowUpRight, Check } from 'lucide-vue-next'
  import CategoryMenu from '@/components/CategoryMenu.vue'
  import StatusChip from '@/components/StatusChip.vue'
  import DomainsMark from '@/components/table/DomainsMark.vue'
  import TodoChip from '@/components/TodoChip.vue'
  import { config } from '@/config'
  import { vTip } from '@/directives/tip'
  import { useColumnsStore } from '@/stores/columns'
  import { useProjectsStore } from '@/stores/projects'
  import { FLAGS } from '@/types'
  import { latestWordpress, outdatedWordpress, ownTheme, phpStatus, siteUrl } from '@/utils/projects'

  /** The list on phones: a card per project, the lines of the columns shown. */
  defineProps<{ groups: Array<Group<Project>>, showHeaders: boolean, full: boolean }>()
  const emit = defineEmits<{ open: [Project] }>()

  const projects = useProjectsStore()
  const columns = useColumnsStore()
  const show = (key: ColumnKey) => columns.visible.has(key)

  const FLAG_LABELS: Record<Flag, string> = {
    deploy: 'Deploy',
    bedrock: 'Bedrock',
    security: 'Wordfence',
    acf: 'ACF',
    miModal: 'MI Modal',
  }

  /** a card's flags: those set, of the columns shown */
  const flagsOf = (project: Project) => FLAGS.filter(flag => show(flag) && project[flag])
</script>

<style scoped>
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

.group-head__name {
  font-size: 13px;
  font-weight: 650;
  letter-spacing: -.005em;
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

/* PHP as in the table: green – the branch's newest release, orange – its support ending soon, red – unpatched or unsupported */
.php--ok {
  color: var(--positive);
}

.php--ending {
  color: var(--warn);
}

.php--outdated,
.php--eol {
  color: var(--danger);
  font-weight: 600;
}

/* a theme made in-house – a green tick after it */
.own-theme {
  width: 13px;
  height: 13px;
  margin-left: 4px;
  color: var(--positive);
  stroke-width: 2.5;
  vertical-align: -1px;
}

/* the yes/no fields on a card – the positive green, as the checkmarks in the table */
.card__flags .chip--accent {
  color: var(--positive);
}

/* the spinner next to the name while the card shows a refresh */
.refreshing {
  display: inline-block;
  width: 14px;
  height: 14px;
  margin-left: 8px;
  border: 2px solid var(--line-strong);
  border-top-color: var(--positive);
  border-radius: 50%;
  vertical-align: middle;
  animation: refreshing .8s linear infinite;
}

@keyframes refreshing {
  to {
    rotate: 1turn;
  }
}

@media (prefers-reduced-motion: reduce) {
  .refreshing {
    animation: none;
  }
}

@media (max-width: 900px) {
  .cards {
    display: grid;
  }
}
</style>
