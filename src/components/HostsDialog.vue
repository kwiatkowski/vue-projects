<template>
  <BaseDialog v-model="hosts.listOpen" title="Konta hostingowe" :width="640">
    <ul v-if="hosts.sorted.length > 0" class="hosts">
      <li v-for="host in hosts.sorted" :key="host.id">
        <button class="hosts__row" type="button" @click="hosts.editing = host">
          <span
            v-tip="missing(host).length === 0 ? 'Wszystkie dane uzupełnione' : `Brakuje: ${missing(host).join(', ')}`"
            class="hosts__state"
            :class="{ 'hosts__state--done': missing(host).length === 0 }"
          >
            <CircleCheck v-if="missing(host).length === 0" aria-label="Komplet danych" />
            <CircleDashed v-else :aria-label="`Brakuje: ${missing(host).join(', ')}`" />
          </span>

          <span class="hosts__name">{{ host.name }}</span>
          <span class="faint hosts__meta">{{ [host.server, host.serverAccount].filter(Boolean).join(' · ') }}</span>
          <span class="hosts__count mono faint">{{ host.projects.length }}</span>
          <span v-if="paid(host)" class="hosts__paid" :class="`hosts__paid--${paid(host)?.tone}`">{{ paid(host)?.text }}</span>
        </button>
      </li>
    </ul>

    <p v-else class="faint">Nie ma jeszcze żadnego konta.</p>

    <template #actions>
      <button class="btn btn--sm" type="button" @click="hosts.editing = 'new'">
        <Plus /> Nowe konto
      </button>

      <span style="flex: 1" />

      <button class="btn btn--sm" type="button" @click="hosts.listOpen = false">
        <X /> Zamknij
      </button>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
  import type { Host } from '@/types'
  import { CircleCheck, CircleDashed, Plus, X } from 'lucide-vue-next'
  import BaseDialog from '@/components/ui/BaseDialog.vue'
  import { vTip } from '@/directives/tip'
  import { useHostsStore } from '@/stores/hosts'
  import { hostMissing, paidState } from '@/utils/projects'

  /** Every hosting account: its name, hosting and login, how many projects, until when paid – a click opens it. */
  const hosts = useHostsStore()

  const paid = (host: Host) => paidState(host.paidUntil)

  /** a check – every field filled; a dashed circle – its tooltip lists what is missing */
  const missing = (host: Host) => hostMissing(host)
</script>

<style scoped>
.hosts {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.hosts li + li {
  border-top: 1px solid var(--line);
}

.hosts__row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  width: 100%;
  padding: 10px 4px;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.hosts__state {
  display: inline-flex;
  align-self: center;
  color: var(--text-3);
}

.hosts__state svg {
  width: 16px;
  height: 16px;
}

.hosts__state--done {
  color: var(--accent-text);
}

.hosts__row:hover .hosts__name {
  text-decoration: underline;
}

.hosts__meta {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hosts__count {
  min-width: 2ch;
  text-align: right;
}

.hosts__paid {
  font-size: 12px;
}

.hosts__paid--ok {
  color: var(--text-3);
}

.hosts__paid--soon {
  color: var(--warn);
}

.hosts__paid--bad {
  color: var(--danger);
}
</style>
