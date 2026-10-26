<template>
  <div class="page">
    <header class="head">
      <div class="head__titles">
        <div class="eyebrow">{{ config.canManage ? 'Wszystkie projekty' : 'Strony i aplikacje' }}</div>
        <h1 class="head__title">Projekty</h1>
        <p v-if="projects.status === 'ready'" class="head__sub">{{ summary }}</p>
      </div>

      <div class="head__actions">
        <button v-if="config.canManage" class="btn btn--accent" type="button" @click="projects.editing = 'new'">
          <Plus /> Nowy projekt
        </button>
      </div>
    </header>

    <div class="toolbar">
      <label class="search">
        <Search />

        <input
          v-model="query"
          aria-label="Szukaj"
          class="input"
          placeholder="Szukaj: domena, motyw, serwer…"
          type="search"
        >
      </label>

      <div aria-label="Status" class="seg toolbar__filters" role="radiogroup">
        <button
          v-for="option in filters"
          :key="option.value"
          :aria-checked="filter === option.value"
          role="radio"
          type="button"
          @click="filter = option.value"
        >
          {{ option.label }} <span class="mono faint">{{ option.count }}</span>
        </button>
      </div>
    </div>

    <template v-if="projects.status === 'ready'">
      <ProjectTable
        v-if="visible.length > 0"
        :descending="descending"
        :full="config.canManage"
        :projects="visible"
        :sort="sort"
        @open="project => projects.editing = project"
        @sort="setSort"
      />

      <div v-else class="empty">
        <SearchX />
        <strong>Nic nie pasuje</strong>
        <span>Zmień wyszukiwanie albo filtr.</span>
      </div>
    </template>

    <div v-else-if="projects.status === 'error'" class="alert">
      <div>{{ projects.loadError }}</div>
      <button class="btn btn--sm" type="button" @click="projects.load()">Spróbuj ponownie</button>
    </div>

    <div v-else aria-busy="true" aria-label="Wczytywanie">
      <div v-for="n in 8" :key="n" class="skeleton" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { Project, SortKey } from '@/types'
  import type { Filter } from '@/utils/projects'
  import { Plus, Search, SearchX } from 'lucide-vue-next'
  import { computed, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import ProjectTable from '@/components/ProjectTable.vue'
  import { config } from '@/config'
  import { useProjectsStore } from '@/stores/projects'
  import { matches, sortProjects, STATUS_LABELS } from '@/utils/projects'

  const projects = useProjectsStore()
  const route = useRoute()
  const router = useRouter()

  // filter and search in the address – a filtered list can be linked and survives a reload
  const filter = ref<Filter>((route.query.status as Filter) || 'all')
  const query = ref(typeof route.query.q === 'string' ? route.query.q : '')

  watch([filter, query], ([status, q]) => {
    void router.replace({ query: { ...(status === 'all' ? {} : { status }), ...(q ? { q } : {}) } })
  })

  const sort = ref<SortKey>('name')
  const descending = ref(false)

  function setSort (key: SortKey): void {
    descending.value = sort.value === key ? !descending.value : false
    sort.value = key
  }

  const sites = computed(() => projects.items.filter(project => project.domain))

  const filters = computed(() => {
    const count = (status: Filter) => projects.items.filter(project => matches(project, status, '')).length
    const options: Array<{ value: Filter, label: string, count: number }> = [
      { value: 'all', label: 'Wszystkie', count: projects.items.length },
      ...(['online', 'dev', 'suspended', 'offline'] as const).map(status => ({ value: status, label: STATUS_LABELS[status], count: count(status) })),
      { value: 'other', label: 'Bez strony', count: count('other') },
    ]

    // only what is there – and the current one, even when it emptied
    return options.filter(option => option.value === 'all' || option.count > 0 || option.value === filter.value)
  })

  const visible = computed<Project[]>(() => sortProjects(
    projects.items.filter(project => matches(project, filter.value, query.value)),
    sort.value,
    descending.value,
  ))

  const summary = computed(() => {
    const online = sites.value.filter(project => project.status === 'online').length
    const parts = [`${sites.value.length} ${plural(sites.value.length, 'strona', 'strony', 'stron')}`, `${online} online`]

    if (config.canManage && projects.items.length > sites.value.length) {
      parts.push(`${projects.items.length - sites.value.length} bez strony`)
    }

    return parts.join(' · ')
  })

  function plural (count: number, one: string, few: string, many: string): string {
    if (count === 1) {
      return one
    }

    return count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? few : many
  }
</script>

<style scoped>
.head {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px 16px;
  padding: 28px 0 20px;
}

.head__titles {
  flex: 1 1 260px;
  min-width: 0;
}

.head__title {
  font-size: 30px;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: -.025em;
}

.head__sub {
  margin-top: 4px;
  color: var(--text-2);
}

.head__actions {
  display: flex;
  gap: 6px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
  margin-bottom: 16px;
}

.search {
  position: relative;
  flex: 1 1 260px;
  max-width: 420px;
}

.search svg {
  position: absolute;
  top: 50%;
  left: 10px;
  width: 16px;
  height: 16px;
  color: var(--text-3);
  translate: 0 -50%;
  pointer-events: none;
}

.search .input {
  padding-left: 34px;
}

/* many filters on a phone – the row scrolls instead of the page */
.toolbar__filters {
  /* a flex item shrinks below its content only with this – otherwise it widens the page */
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}

.toolbar__filters button {
  flex: none;
}

@media (max-width: 900px) {
  .head {
    padding-top: 18px;
  }

  .head__title {
    font-size: 24px;
  }
}
</style>
