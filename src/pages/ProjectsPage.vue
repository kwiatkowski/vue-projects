<template>
  <div class="page" :style="{ '--head': `${headHeight}px` }">
    <header ref="head" class="head">
      <h1 class="visually-hidden">{{ category?.name ?? 'Projekty' }}</h1>

      <div class="toolbar" :class="{ 'toolbar--open': filtersOpen }">
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

        <!-- phones: category and status fold under this button; the dot – a filter is on -->
        <button
          :aria-expanded="filtersOpen"
          aria-label="Kategorie i statusy"
          class="btn btn--icon btn--outline toolbar__toggle"
          type="button"
          @click="filtersOpen = !filtersOpen"
        >
          <ListFilter />
          <span v-if="category || filter !== 'all'" class="toolbar__dot" />
        </button>

        <SelectField
          v-if="projects.categories.length > 0"
          class="toolbar__category"
          :clearable="false"
          :disabled="config.view === 'guest'"
          :label="config.view !== 'guest' ? 'Kategoria' : 'Wybór kategorii po zalogowaniu'"
          :model-value="category?.slug ?? ''"
          :options="categoryOptions"
          @update:model-value="setCategory($event ?? '')"
        />

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

        <!-- phones: the same statuses as a full-width select – the buttons don't fit in one row -->
        <SelectField
          class="toolbar__status"
          :clearable="false"
          label="Status"
          :model-value="filter"
          :options="filters"
          @update:model-value="filter = $event ?? 'all'"
        >
          <template #option="{ option }">
            <StatusChip v-if="option.value in STATUS_LABELS" :status="option.value as Status" />
            <template v-else>{{ option.label }}</template>
            <span class="mono faint">{{ filters.find(item => item.value === option.value)?.count }}</span>
          </template>
        </SelectField>

        <!-- which columns this browser shows – of those one may see -->
        <button class="btn btn--outline toolbar__columns" type="button" @click="columns.viewOpen = true">
          <Columns3 /> Wyświetl
        </button>

        <button v-if="sort" class="btn btn--sm toolbar__order" type="button" @click="sort = null">
          <ListOrdered /> Własna kolejność
        </button>
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
  import type { Category, Project, SortKey, Status } from '@/types'
  import type { Filter, Group } from '@/utils/projects'
  import { Columns3, ListFilter, ListOrdered, Search, SearchX } from 'lucide-vue-next'
  import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import ProjectTable from '@/components/ProjectTable.vue'
  import StatusChip from '@/components/StatusChip.vue'
  import SelectField from '@/components/ui/SelectField.vue'
  import { config } from '@/config'
  import { useColumnsStore } from '@/stores/columns'
  import { useProjectsStore } from '@/stores/projects'
  import { groupProjects, matches, sortProjects, STATUS_LABELS, STATUS_TONES } from '@/utils/projects'

  const projects = useProjectsStore()
  const columns = useColumnsStore()
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

  // below 1500px the top bar gives way once the list is scrolled down by its height – the header takes its place at the
  // very top and the table its room; scrolled back above that, it returns (app.css: .topbar-away)
  const compact = window.matchMedia('(max-width: 1499px)')
  const topbarSize = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-size')) || 52

  function onScroll (event: Event): void {
    const target = event.target
    const top = target instanceof HTMLElement && target.classList.contains('table-wrap') ? target.scrollTop : window.scrollY

    document.documentElement.classList.toggle('topbar-away', compact.matches && top > topbarSize)
  }

  onMounted(() => {
    // the table scrolls itself (wide screens), the page with the cards (phones); scroll doesn't bubble – caught on the way down
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
  })

  onBeforeUnmount(() => {
    document.removeEventListener('scroll', onScroll, { capture: true })
    document.documentElement.classList.remove('topbar-away')
  })

  // filter and search in the address – a filtered list can be linked and survives a reload
  const filter = ref<Filter>((route.query.status as Filter) || 'all')
  const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
  const filtersOpen = ref(false)

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

  const categoryOptions = computed(() => [
    { value: '', label: 'Wszystkie kategorie' },
    ...projects.sortedCategories.map(item => ({ value: item.slug, label: item.name })),
  ])

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
      ...(['online', 'offline', 'dev', 'suspended'] as const).map(status => ({ value: status, label: STATUS_LABELS[status], count: count(status), tone: STATUS_TONES[status] })),
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
  /* the phones' cards scroll the page – the header follows the top bar sliding away and back */
  transition: top .2s ease;
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

/* as tall as the search and the category (36px): 2 × 1px border + 2 × 2px padding + 30px */
.toolbar__filters button {
  flex: none;
  height: 30px;
}

/* a status in its colour – as the chip in the table (the dot follows the text) */
.status {
  color: var(--tone);
}

.status .dot {
  width: 6px;
  height: 6px;
}

/* hover looks like the chosen one */
.toolbar__filters button:hover {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow);
}

.seg .status[aria-checked='true'],
.toolbar__filters .status:hover {
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
  min-width: 0;
}

.toolbar__toggle,
.toolbar__status {
  display: none;
}

/* as tall as the search and the filters */
.toolbar__columns {
  flex: none;
  height: 36px;
}

.toolbar__toggle {
  position: relative;
  flex: none;
  width: 36px;
  height: 36px;
}

.toolbar__toggle[aria-expanded='true'] {
  border-color: var(--accent);
  color: var(--text);
}

.toolbar__dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 7px;
  height: 7px;
  border: 1.5px solid var(--surface);
  border-radius: 50%;
  background: var(--accent);
  box-sizing: content-box;
}

@media (max-width: 900px) {
  .head {
    padding-top: 14px;
  }

  .toolbar__filters {
    display: none;
  }

  .search {
    flex: 1 1 0;
    max-width: none;
  }

  .toolbar__toggle {
    display: inline-flex;
  }

  .toolbar__category {
    display: none;
  }

  .toolbar--open .toolbar__category,
  .toolbar--open .toolbar__status {
    display: block;
    flex: 1 1 100%;
  }

  /* phones: under the category and the status, folded with them */
  .toolbar__columns {
    display: none;
  }

  .toolbar--open .toolbar__columns {
    display: inline-flex;
    flex: 1 1 100%;
    justify-content: center;
  }
}
</style>
