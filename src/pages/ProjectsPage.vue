<template>
  <div class="page" :style="{ '--head': `${headHeight}px` }">
    <header ref="head" class="head">
      <h1 class="visually-hidden">{{ category?.name ?? 'Projekty' }}</h1>

      <div class="toolbar" :class="{ 'toolbar--open': filtersOpen }">
        <!-- the owner's ticked projects take the place of the search and the category: what to do with them;
             while a batch runs – how far it got. The same height, so the list under it doesn't move -->
        <div v-if="bulk" class="bulk">
          <template v-if="projects.batch">
            <span class="bulk__spinner" />
            <span>{{ projects.batch.label }}: <span class="mono">{{ projects.batch.done }} / {{ projects.batch.total }}</span></span>
          </template>

          <template v-else>
            <span>Zaznaczone: <strong class="mono">{{ projects.selected.size }}</strong></span>

            <button class="btn btn--sm btn--outline" type="button" @click="projects.pullReports(selectedIds)">
              <RefreshCw /> Aktualizuj raport
            </button>

            <button class="btn btn--sm btn--outline" :disabled="selectedWithUpdates.length === 0" type="button" @click="updateSelected">
              <ArrowUp /> Aktualizuj stronę <span class="mono faint count">{{ selectedWithUpdates.length }}</span>
            </button>

            <button class="btn btn--sm" type="button" @click="projects.setSelected([])">
              <X /> Odznacz
            </button>
          </template>
        </div>

        <template v-else>
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

          <!-- phones: category, status and "Do aktualizacji" fold under this button; the dot – a filter is on -->
          <button
            :aria-expanded="filtersOpen"
            aria-label="Kategorie i statusy"
            class="btn btn--icon btn--outline toolbar__toggle"
            type="button"
            @click="filtersOpen = !filtersOpen"
          >
            <ListFilter />
            <span v-if="category || filter !== 'all' || report" class="toolbar__dot" />
          </button>

          <!-- there from the start ("Wszystkie kategorie") – the categories fill it once loaded, nothing jumps; a list
               without categories drops it then -->
          <SelectField
            v-if="projects.status !== 'ready' || projects.categories.length > 0"
            class="toolbar__category"
            :disabled="config.view === 'guest'"
            empty=""
            :label="config.view !== 'guest' ? 'Kategoria' : 'Wybór kategorii po zalogowaniu'"
            :model-value="category?.slug ?? ''"
            :options="categoryOptions"
            @update:model-value="setCategory($event ?? '')"
          >
            <!-- how many projects each holds – as the statuses' counts; none on "all" -->
            <template #option="{ option }">{{ option.label }} <span v-if="option.value" class="mono faint count">{{ categoryCounts[option.value] ?? 0 }}</span></template>
          </SelectField>
        </template>

        <!-- the filters, from the widest to the narrowest: the text, the category, the status, what the report says -->
        <SelectField
          class="toolbar__status"
          empty="all"
          label="Status"
          :model-value="filter"
          :options="filters"
          @update:model-value="filter = $event ?? 'all'"
        >
          <template #option="{ option }">
            <StatusChip v-if="option.value in STATUS_LABELS" :status="option.value as Status" />
            <template v-else>{{ option.label }}</template>
            <span v-if="option.value !== 'all'" class="mono faint count">{{ filters.find(item => item.value === option.value)?.count }}</span>
          </template>
        </SelectField>

        <!-- what the reports say: something to update (all of it, WordPress, plugins, translations) or lying unused -->
        <SelectField
          v-if="canFilterUpdates"
          class="toolbar__report"
          empty=""
          label="Raport"
          :model-value="report"
          :options="reportOptions"
          @update:model-value="report = $event ?? ''"
        >
          <template #option="{ option }">{{ option.label }} <span v-if="option.value" class="mono faint count">{{ reportCounts[option.value] ?? 0 }}</span></template>
        </SelectField>

        <!-- what to do and how the list looks – at the right edge, also when the toolbar wraps onto a second row -->
        <div class="toolbar__actions">
          <!-- the owner: every project with something waiting, after a question -->
          <button
            v-if="config.canManage && updatesCount > 0 && !bulk"
            class="btn btn--outline toolbar__update-all"
            :disabled="projects.batch !== null"
            type="button"
            @click="updateAll"
          >
            <ArrowUp /> Aktualizuj wszystkie
          </button>

          <button v-if="sort" class="btn btn--sm toolbar__order" type="button" @click="sort = null">
            <ListOrdered /> Własna kolejność
          </button>

          <!-- which columns this browser shows – of those one may see -->
          <button class="btn btn--outline toolbar__columns" type="button" @click="columns.viewOpen = true">
            <Columns3 /> Wyświetl
          </button>
        </div>
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
  import { ArrowUp, Columns3, ListFilter, ListOrdered, RefreshCw, Search, SearchX, X } from 'lucide-vue-next'
  import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import ProjectTable from '@/components/ProjectTable.vue'
  import StatusChip from '@/components/StatusChip.vue'
  import SelectField from '@/components/ui/SelectField.vue'
  import { config } from '@/config'
  import { useColumnsStore } from '@/stores/columns'
  import { useProjectsStore } from '@/stores/projects'
  import { groupProjects, matches, pendingUpdates, sortProjects, STATUS_LABELS, STATUS_TONES, updateScope } from '@/utils/projects'

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

  // below 1500px the top bar gives way once the list is scrolled down – the header takes its place at the very top
  // and the table its height; back at the top it returns (app.css: .topbar-away)
  const compact = window.matchMedia('(max-width: 1499px)')

  function onScroll (event: Event): void {
    const target = event.target
    const top = target instanceof HTMLElement && target.classList.contains('table-wrap') ? target.scrollTop : window.scrollY

    document.documentElement.classList.toggle('topbar-away', compact.matches && top > 8)
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
  /**
   * What the reports say – something to update or lying unused (?raport=wtyczki); the old ?aktualizacje – all of it.
   * The value is the address's word.
   */
  const REPORT_FILTERS: Array<{ value: ReportFilter, label: string, test: (project: Project) => boolean }> = [
    { value: 'wszystko', label: 'Do aktualizacji: wszystko', test: project => hasUpdates(project) },
    { value: 'wordpress', label: 'Do aktualizacji: WordPress', test: project => pendingUpdates(project, projects.latestWordpress).some(item => item.name === 'WordPress') },
    { value: 'wtyczki', label: 'Do aktualizacji: wtyczki', test: project => (project.updates?.length ?? 0) > 0 },
    { value: 'tlumaczenia', label: 'Do aktualizacji: tłumaczenia', test: project => (project.translationUpdates?.length ?? 0) > 0 },
    { value: 'nieaktywne-wtyczki', label: 'Nieaktywne wtyczki', test: project => (project.inactivePlugins?.length ?? 0) > 0 },
    { value: 'nieaktywne-motywy', label: 'Nieaktywne motywy', test: project => (project.inactiveThemes?.length ?? 0) > 0 },
  ]
  type ReportFilter = '' | 'wszystko' | 'wordpress' | 'wtyczki' | 'tlumaczenia' | 'nieaktywne-wtyczki' | 'nieaktywne-motywy'

  const fromAddress = typeof route.query.raport === 'string' ? route.query.raport : (route.query.aktualizacje === undefined ? '' : 'wszystko')
  const report = ref<ReportFilter>(REPORT_FILTERS.find(item => item.value === fromAddress)?.value ?? '')

  watch([filter, query, report], ([status, q, chosen]) => {
    void router.replace({ query: { ...(status === 'all' ? {} : { status }), ...(q ? { q } : {}), ...(chosen ? { raport: chosen } : {}) } })
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

  /** the projects in each category by its slug – '' all of them */
  const categoryCounts = computed<Record<string, number>>(() => Object.fromEntries([
    ['', projects.items.length],
    ...projects.sortedCategories.map(item => [item.slug, projects.items.filter(project => project.categoryId === item.id).length]),
  ]))

  const categoryOptions = computed(() => [
    { value: '', label: 'Wszystkie kategorie' },
    ...projects.sortedCategories.map(item => ({ value: item.slug, label: item.name })),
  ])

  /** the projects of the chosen category – or all of them */
  /** WordPress, plugins or translations waiting – what the report's orange arrow counts */
  const hasUpdates = (project: Project) => updateScope(project, projects.latestWordpress) !== null

  // the reports' details – the owner's, a viewer's with the report column; a guest gets none of them
  const canFilterUpdates = computed(() => columns.available.includes('report'))
  const inCategory = computed(() => category.value ? projects.items.filter(project => project.categoryId === category.value?.id) : projects.items)
  const updatesCount = computed(() => inCategory.value.filter(project => hasUpdates(project)).length)
  // ---- several at once: the ticked projects, or all with updates

  const selectedIds = computed(() => [...projects.selected])
  const bulk = computed(() => config.canManage && (projects.selected.size > 0 || projects.batch !== null))
  const selectedWithUpdates = computed(() => projects.items.filter(project => projects.selected.has(project.id) && hasUpdates(project)))

  /** updates change the sites (Composer, commit, push) – asked first, with their names */
  function confirmUpdates (list: Project[]): boolean {
    const names = list.map(project => project.name)
    const shown = names.length > 12 ? [...names.slice(0, 12), `… i ${names.length - 12} więcej`] : names

    return window.confirm(`Zaktualizować ${list.length} ${list.length === 1 ? 'stronę' : 'stron(y)'}?\n\n${shown.join('\n')}`)
  }

  function updateSelected (): void {
    if (confirmUpdates(selectedWithUpdates.value)) {
      void projects.runUpdates(selectedWithUpdates.value.map(project => project.id)).then(() => projects.setSelected([]))
    }
  }

  function updateAll (): void {
    const list = inCategory.value.filter(project => hasUpdates(project))

    if (confirmUpdates(list)) {
      void projects.runUpdates(list.map(project => project.id))
    }
  }

  /** what the reports say – only what some project has (as the categories and the statuses), the chosen one kept */
  const reportOptions = computed(() => [
    { value: '' as ReportFilter, label: 'Wszystkie raporty' },
    ...REPORT_FILTERS.filter(({ value }) => (reportCounts.value[value] ?? 0) > 0 || value === report.value).map(({ value, label }) => ({ value, label })),
  ])
  /** how many of the category's projects each report filter leaves – '' all of them */
  const reportCounts = computed<Record<string, number>>(() => Object.fromEntries([
    ['', inCategory.value.length],
    ...REPORT_FILTERS.map(item => [item.value, inCategory.value.filter(project => item.test(project)).length]),
  ]))

  const scoped = computed(() => {
    const chosen = REPORT_FILTERS.find(item => item.value === report.value)

    return chosen && canFilterUpdates.value ? inCategory.value.filter(project => chosen.test(project)) : inCategory.value
  })

  /** null – the user's own order, grouped by category; a column – a flat list sorted by it */
  const sort = ref<SortKey | null>(null)
  const descending = ref(false)

  function setSort (key: SortKey): void {
    descending.value = sort.value === key ? !descending.value : false
    sort.value = key
  }

  const filtered = computed(() => category.value !== null || filter.value !== 'all' || query.value.trim() !== '' || report.value !== '')

  /** dragging changes the order of whole categories – only when all of them are shown */
  const canDrag = computed(() => config.canManage && sort.value === null && !filtered.value)

  const filters = computed(() => {
    const count = (status: Filter) => scoped.value.filter(project => matches(project, status, '')).length
    const options: Array<{ value: Filter, label: string, count: number, tone?: string }> = [
      { value: 'all', label: 'Wszystkie statusy', count: scoped.value.length },
      ...(['online', 'offline', 'unmonitored', 'suspended'] as const).filter(status => count(status) > 0 || filter.value === status).map(status => ({ value: status, label: STATUS_LABELS[status], count: count(status), tone: STATUS_TONES[status] })),
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
  padding-bottom: var(--edge);
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
  padding: var(--edge) 0;
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
  flex: 1 1 220px;
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

/* the counts beside the filters and actions: room for two digits at least – "0" while loading and "16" after it take
   the same space, nothing next to them moves */
.count {
  display: inline-block;
  min-width: 2ch;
}

/* every control of the toolbar alike – the fields, the statuses, the buttons: 36px tall, the fields' darker edge, their
   6px corners and background */
.search .input,
.toolbar__category :deep(.select-field__trigger),
.toolbar__status :deep(.select-field__trigger),
.toolbar__report :deep(.select-field__trigger) {
  height: 36px;
  min-height: 36px;
}

.toolbar__toggle,
.toolbar__update-all,
.toolbar__columns {
  border-radius: 6px;
  background: var(--panel);
}

/* the status list: its count a little apart from the status (a chip or "Wszystkie statusy") */
.toolbar__status .count {
  margin-left: 6px;
}

/* the actions on the right edge – their own row's too, when the toolbar wraps */
.toolbar__actions {
  display: flex;
  align-items: center;
  gap: 10px 12px;
  margin-left: auto;
}

.toolbar__category {
  flex: 0 1 220px;
  min-width: 0;
}

.toolbar__status {
  flex: 0 1 200px;
  min-width: 0;
}

.toolbar__report {
  flex: 0 1 240px;
  min-width: 0;
}

.toolbar__toggle {
  display: none;
}

/* as tall as the search and the filters */
.toolbar__columns,
.toolbar__update-all {
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

/* the ticked projects' actions, in the search's place – as every control of the toolbar, so the list under them stays
   put */
.bulk {
  display: flex;
  flex: 0 1 auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
  height: 36px;
  padding: 0 4px 0 12px;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  background: var(--panel);
  font-size: 13px;
  white-space: nowrap;
}

.bulk__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--line-strong);
  border-top-color: var(--info);
  border-radius: 50%;
  animation: bulk-spin .8s linear infinite;
}

@keyframes bulk-spin {
  to {
    rotate: 1turn;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bulk__spinner {
    animation: none;
  }
}

@media (max-width: 900px) {
  .head {
    padding-top: 14px;
  }

  /* phones: the actions fold under the filter button with the rest, each a full row */
  .toolbar__actions {
    display: contents;
  }

  .search {
    flex: 1 1 0;
    max-width: none;
  }

  .toolbar__toggle {
    display: inline-flex;
  }

  /* phones: the actions wrap rather than widen the page */
  .bulk {
    flex: 1 1 100%;
    flex-wrap: wrap;
    height: auto;
    padding: 4px 4px 4px 12px;
    white-space: normal;
  }

  .toolbar__category,
  .toolbar__status,
  .toolbar__report {
    display: none;
  }

  .toolbar--open .toolbar__category,
  .toolbar--open .toolbar__status,
  .toolbar--open .toolbar__report {
    display: block;
    flex: 1 1 100%;
  }

  /* phones: under the category and the status, folded with them */
  .toolbar__columns,
  .toolbar__update-all {
    display: none;
  }

  .toolbar--open .toolbar__columns,
  .toolbar--open .toolbar__update-all {
    display: inline-flex;
    flex: 1 1 100%;
    justify-content: center;
  }
}
</style>
