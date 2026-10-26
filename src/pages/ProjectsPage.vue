<template>
  <div class="page" :style="{ '--head': `${headHeight}px` }">
    <header ref="head" class="head">
      <h1 class="visually-hidden">{{ category?.name ?? 'Projekty' }}</h1>

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

        <select
          v-if="projects.categories.length > 0"
          aria-label="Kategoria"
          class="input toolbar__category"
          :disabled="!config.canManage"
          :title="config.canManage ? undefined : 'Wybór kategorii po zalogowaniu'"
          :value="category?.slug ?? ''"
          @change="setCategory(($event.target as HTMLSelectElement).value)"
        >
          <option value="">Wszystkie kategorie</option>
          <option v-for="item in projects.sortedCategories" :key="item.id" :value="item.slug">{{ item.name }}</option>
        </select>

        <div aria-label="Status" class="seg toolbar__filters" role="radiogroup">
          <button
            v-for="option in filters"
            :key="option.value"
            :aria-checked="filter === option.value"
            :class="option.tone && `status status--${option.tone}`"
            role="radio"
            type="button"
            @click="filter = option.value"
          >
            <span v-if="option.tone" class="dot" />
            {{ option.label }} <span class="mono faint">{{ option.count }}</span>
          </button>
        </div>

        <button v-if="sort" class="btn btn--sm toolbar__order" type="button" @click="sort = null">
          <ListOrdered /> Własna kolejność
        </button>

        <span v-else-if="config.canManage && !canDrag" class="faint toolbar__hint">Przeciąganie – bez filtra i wyszukiwania</span>
      </div>
    </header>

    <template v-if="projects.status === 'ready'">
      <ProjectTable
        v-if="groups.some(group => group.projects.length > 0) || (config.canManage && groups.length > 0)"
        :can-drag="canDrag"
        :descending="descending"
        :full="config.canManage"
        :grouped="sort === null"
        :groups="groups"
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
  import type { Category, Project, SortKey } from '@/types'
  import type { Filter, Group } from '@/utils/projects'
  import { ListOrdered, Search, SearchX } from 'lucide-vue-next'
  import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import ProjectTable from '@/components/ProjectTable.vue'
  import { config } from '@/config'
  import { useProjectsStore } from '@/stores/projects'
  import { groupProjects, matches, sortProjects, STATUS_LABELS, STATUS_TONES } from '@/utils/projects'

  const projects = useProjectsStore()
  const route = useRoute()
  const router = useRouter()

  // the header (search, category, statuses) sticks under the top bar; the table below fits the rest of the screen,
  // scrolls inside and keeps its column headers – the header wraps on narrow screens, so its height is measured
  const head = useTemplateRef<HTMLElement>('head')
  const headHeight = ref(0)
  const headObserver = new ResizeObserver(([entry]) => {
    headHeight.value = entry?.borderBoxSize[0]?.blockSize ?? 0
  })

  onMounted(() => head.value && headObserver.observe(head.value))
  onBeforeUnmount(() => headObserver.disconnect())

  // filter and search in the address – a filtered list can be linked and survives a reload
  const filter = ref<Filter>((route.query.status as Filter) || 'all')
  const query = ref(typeof route.query.q === 'string' ? route.query.q : '')

  watch([filter, query], ([status, q]) => {
    void router.replace({ query: { ...(status === 'all' ? {} : { status }), ...(q ? { q } : {}) } })
  })

  // the category is the path – /projects/meden lists only the projects of "Meden"
  const categorySlug = computed(() => typeof route.params.category === 'string' ? route.params.category : '')
  const category = computed<Category | null>(() => projects.categories.find(item => item.slug === categorySlug.value) ?? null)

  function setCategory (slug: string): void {
    void router.push({ name: 'projects', params: slug ? { category: slug } : {}, query: route.query })
  }

  // a renamed category gets a new slug – follow it; one that is gone (or never was) – back to all
  let shownId: number | null = null

  watch([categorySlug, () => projects.categories, () => projects.status], () => {
    if (!categorySlug.value || projects.status !== 'ready') {
      shownId = null

      return
    }

    if (category.value) {
      shownId = category.value.id

      return
    }

    const renamed = projects.categories.find(item => item.id === shownId)

    void router.replace({ name: 'projects', params: renamed ? { category: renamed.slug } : {}, query: route.query })
  }, { immediate: true })

  /** the projects of the chosen category – or all of them */
  const scoped = computed(() => category.value ? projects.items.filter(project => project.categoryId === category.value?.id) : projects.items)

  /** null – the user's own order, grouped by category; a column – a flat list sorted by it */
  const sort = ref<SortKey | null>(null)
  const descending = ref(false)

  function setSort (key: SortKey): void {
    descending.value = sort.value === key ? !descending.value : false
    sort.value = key
  }

  const filtered = computed(() => category.value !== null || filter.value !== 'all' || query.value.trim() !== '')

  /** dragging changes the order of whole categories – only when all of them are shown */
  const canDrag = computed(() => config.canManage && sort.value === null && !filtered.value)

  const filters = computed(() => {
    const count = (status: Filter) => scoped.value.filter(project => matches(project, status, '')).length
    const options: Array<{ value: Filter, label: string, count: number, tone?: string }> = [
      { value: 'all', label: 'Wszystkie', count: scoped.value.length },
      ...(['online', 'dev', 'suspended', 'offline'] as const).map(status => ({ value: status, label: STATUS_LABELS[status], count: count(status), tone: STATUS_TONES[status] })),
      { value: 'other', label: 'Bez strony', count: count('other') },
    ]

    // the statuses always (offline at 0 too); "Bez strony" only when there is such a project – or it is the current one
    return options.filter(option => option.value !== 'other' || option.count > 0 || option.value === filter.value)
  })

  const groups = computed<Array<Group<Project>>>(() => {
    const visible = scoped.value.filter(project => matches(project, filter.value, query.value))

    if (sort.value) {
      return [{ category: null, projects: sortProjects(visible, sort.value, descending.value) }]
    }

    // one category – its group, even empty (for the owner); otherwise empty categories too (to drop projects into
    // them), unless a filter hides things anyway
    if (category.value) {
      return groupProjects(visible, [category.value], config.canManage)
    }

    return groupProjects(visible, projects.categories, config.canManage && !filtered.value)
  })
</script>

<style scoped>
.page {
  /* the table fills the screen and scrolls itself – the page doesn't scroll under the sticky header */
  padding-bottom: 16px;
}

.head {
  position: sticky;
  z-index: 10;
  top: var(--topbar);
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px 16px;
  padding: 20px 0 16px;
  background: var(--bg);
}

/* search and category on the left, the statuses on the right; on a narrow screen they wrap */
.toolbar {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
  min-width: 0;
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

.toolbar__filters {
  margin-left: auto;
}

.toolbar__filters button {
  flex: none;
}

/* a status in its colour – as the chip in the table */
.status {
  color: var(--tone);
}

.status .dot {
  width: 6px;
  height: 6px;
}

.seg .status[aria-checked='true'] {
  background: var(--tone-soft);
  color: var(--tone);
}

.status--accent {
  --tone: var(--positive);
  --tone-soft: var(--accent-soft);
}

.status--info {
  --tone: var(--info);
  --tone-soft: var(--info-soft);
}

.status--danger {
  --tone: var(--danger);
  --tone-soft: var(--danger-soft);
}

.status--off {
  --tone: var(--text-2);
  --tone-soft: var(--hover);
}

.status--off .dot {
  background: var(--off);
  box-shadow: 0 0 0 1px var(--line-strong);
}

.toolbar__category {
  flex: 0 1 220px;
  width: auto;
  min-width: 0;
}

.toolbar__hint {
  font-size: 12px;
}

@media (max-width: 900px) {
  .head {
    padding-top: 14px;
  }

  .toolbar__hint {
    display: none;
  }
}
</style>
