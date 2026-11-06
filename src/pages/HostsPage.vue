<template>
  <div class="page" :style="{ '--head': `${headHeight}px` }">
    <header ref="head" class="head">
      <h1 class="visually-hidden">Konta hostingowe</h1>

      <div class="toolbar">
        <label class="search">
          <Search />

          <input
            v-model="query"
            aria-label="Szukaj"
            class="input"
            placeholder="Szukaj: konto, hosting, login, projekt…"
            type="search"
          >
        </label>

        <span class="faint toolbar__summary">
          Kont: <span class="mono">{{ shown.length }}</span> · z kompletem danych: <span class="mono">{{ complete }}</span>
        </span>

        <div class="toolbar__actions">
          <button class="btn btn--outline toolbar__new" type="button" @click="hosts.editing = 'new'">
            <Plus /> Nowe konto
          </button>
        </div>
      </div>
    </header>

    <template v-if="hosts.ready">
      <div v-if="groups.length > 0" class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th scope="col">Konto</th>
              <th scope="col">Hosting</th>
              <th scope="col">Login</th>
              <th scope="col">SSH</th>
              <th scope="col">Opłacone do</th>
              <th class="right" scope="col">Projekty</th>
            </tr>
          </thead>

          <!-- grouped by the hosting, as the projects by their category -->
          <tbody v-for="group in groups" :key="group.server">
            <tr class="group-row">
              <td colspan="6">
                <div class="group-head">
                  <span class="group-head__name">{{ group.server || 'Bez hostingu' }}</span>
                  <span class="mono faint">{{ group.hosts.length }}</span>
                </div>
              </td>
            </tr>

            <tr v-for="host in group.hosts" :key="host.id" class="row--open" @click="hosts.editing = host">
              <td>
                <div class="cell-name">
                  <!-- a check – every field filled; a dashed circle – its tooltip lists what is missing -->
                  <span
                    v-tip="missing(host).length === 0 ? 'Wszystkie dane uzupełnione' : `Brakuje: ${missing(host).join(', ')}`"
                    class="state"
                    :class="{ 'state--done': missing(host).length === 0 }"
                  >
                    <CircleCheck v-if="missing(host).length === 0" aria-label="Komplet danych" />
                    <CircleDashed v-else :aria-label="`Brakuje: ${missing(host).join(', ')}`" />
                  </span>

                  <span class="name">{{ host.name }}</span>
                </div>
              </td>

              <td>
                <a
                  v-if="host.server && host.serverUrl"
                  class="link"
                  :href="host.serverUrl"
                  rel="noopener"
                  target="_blank"
                  @click.stop
                >{{ host.server }}</a>

                <span v-else>{{ host.server }}</span>
              </td>

              <td class="mono">{{ host.serverAccount }}</td>

              <td class="mono nowrap">
                <template v-if="host.sshHost">
                  {{ host.sshUser ? `${host.sshUser}@` : '' }}{{ host.sshHost }}<span v-if="host.sshPort" class="faint">:{{ host.sshPort }}</span>
                </template>
              </td>

              <td class="nowrap">
                <span v-if="paid(host)" :class="`paid--${paid(host)?.tone}`">{{ paid(host)?.text }}</span>
              </td>

              <td class="right mono">
                <!-- the account's projects – as the report's popup: a header, then a row each -->
                <HoverTip anchor-class="count-hit">
                  <span class="count" tabindex="0">{{ projectsOf(host).length }}</span>

                  <template #tip>
                    <div class="report-tip__title" :class="{ 'report-tip__title--alone': projectsOf(host).length === 0 }">
                      <strong>{{ host.name }}</strong>
                      <span class="faint">{{ projectsOf(host).length === 0 ? 'brak projektów' : `projekty: ${projectsOf(host).length}` }}</span>
                    </div>

                    <dl v-if="projectsOf(host).length > 0" class="info-tip info-tip--right info-tip--after">
                      <template v-for="project in projectsOf(host)" :key="project.id">
                        <dt>{{ project.name }}</dt>
                        <dd><StatusChip :status="project.status" /></dd>
                      </template>
                    </dl>
                  </template>
                </HoverTip>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty">
        <SearchX />
        <strong>{{ hosts.items.length === 0 ? 'Nie ma jeszcze żadnego konta' : 'Nic nie pasuje' }}</strong>
        <span v-if="hosts.items.length > 0">Zmień wyszukiwanie.</span>
      </div>
    </template>

    <div v-else aria-busy="true" aria-label="Wczytywanie">
      <div v-for="n in 6" :key="n" class="skeleton" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { Host } from '@/types'
  import { CircleCheck, CircleDashed, Plus, Search, SearchX } from 'lucide-vue-next'
  import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
  import StatusChip from '@/components/StatusChip.vue'
  import HoverTip from '@/components/ui/HoverTip.vue'
  import { vTip } from '@/directives/tip'
  import { useHostsStore } from '@/stores/hosts'
  import { useProjectsStore } from '@/stores/projects'
  import { hostMatches, hostMissing, paidState } from '@/utils/projects'

  /** The hosting accounts as a list, like the projects': grouped by the hosting, a click opens the account. */
  const hosts = useHostsStore()
  const projects = useProjectsStore()

  const query = ref('')

  const collator = new Intl.Collator('pl', { numeric: true, sensitivity: 'base' })

  /** the account's projects, by name – from the list itself, so a project moved to another account shows at once */
  const projectsOf = (host: Host) => projects.items.filter(project => project.hostId === host.id).toSorted((a, b) => collator.compare(a.name, b.name))
  const missing = (host: Host) => hostMissing(host)
  const paid = (host: Host) => paidState(host.paidUntil)

  const shown = computed(() => hosts.sorted.filter(host => hostMatches(host, query.value, projectsOf(host).map(project => project.name))))
  const complete = computed(() => shown.value.filter(host => missing(host).length === 0).length)

  const groups = computed(() => {
    const byServer = new Map<string, Host[]>()

    for (const host of shown.value) {
      byServer.set(host.server ?? '', [...(byServer.get(host.server ?? '') ?? []), host])
    }

    // the accounts without a hosting last
    return [...byServer.entries()]
      .toSorted(([a], [b]) => (a === '' ? 1 : 0) - (b === '' ? 1 : 0) || collator.compare(a, b))
      .map(([server, list]) => ({ server, hosts: list }))
  })

  /** the header's height – the table takes the rest of the screen under it */
  const head = useTemplateRef<HTMLElement>('head')
  const headHeight = ref(0)
  let observer: ResizeObserver | null = null

  onMounted(() => {
    observer = new ResizeObserver(() => {
      headHeight.value = head.value?.offsetHeight ?? 0
    })

    if (head.value) {
      observer.observe(head.value)
    }
  })

  onBeforeUnmount(() => observer?.disconnect())
</script>

<style scoped>
.page {
  padding-bottom: var(--edge);
}

.head {
  position: sticky;
  z-index: 10;
  top: var(--topbar);
  transition: top .2s ease;
  display: flex;
  align-items: flex-end;
  padding: var(--edge) 0;
  background: var(--bg);
}

.toolbar {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
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
  height: 36px;
  min-height: 36px;
  padding-left: 34px;
}

.toolbar__summary {
  font-size: 13px;
}

.toolbar__actions {
  display: flex;
  margin-left: auto;
}

.toolbar__new {
  border-radius: 6px;
  background: var(--panel);
}

/* ---- the table – as the projects' (ProjectTable) */

.table-wrap {
  max-height: calc(100dvh - var(--topbar) - var(--head, 0px) - var(--edge));
  overflow: auto;
  transition: max-height .2s ease;
  scrollbar-width: none;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
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

th.right,
td.right {
  text-align: right;
}

tbody:last-child tr:last-child td {
  border-bottom: 0;
}

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

.row--open {
  cursor: pointer;
}

.row--open:hover td {
  background: var(--hover);
}

.cell-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.name {
  font-weight: 600;
  white-space: nowrap;
}

.state {
  display: inline-flex;
  color: var(--text-3);
}

.state svg {
  width: 16px;
  height: 16px;
}

.state--done {
  color: var(--accent-text);
}

.count {
  padding: 2px 4px;
  border-radius: var(--radius-sm);
  cursor: default;
}

.count:hover,
.count:focus-visible {
  background: var(--hover);
}

.nowrap {
  white-space: nowrap;
}

.paid--ok {
  color: var(--text-3);
}

.paid--soon {
  color: var(--warn);
}

.paid--bad {
  color: var(--danger);
}

@media (max-width: 900px) {
  .toolbar__summary {
    display: none;
  }
}
</style>
